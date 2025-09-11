// Shared alert utility for webhook notifications
// deno-lint-ignore-file no-explicit-any
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

type Severity = 'info' | 'warning' | 'critical';
type ChannelResult = { channel: string; ok: boolean; status?: number; error?: string };

type AlertPayload = {
  event: string;
  title: string;
  message: string;
  severity?: Severity;
  meta?: Record<string, any>;
};

/** Simple stable JSON for hashing */
function stableStringify(o: any) { 
  return JSON.stringify(o, Object.keys(o).sort());
}

async function sha256(s: string) {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function severityRank(s: Severity) { 
  return { info: 1, warning: 2, critical: 3 }[s];
}

async function postTelegram(text: string): Promise<ChannelResult> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return { channel: 'telegram', ok: false, error: 'no-token-or-chat' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text, 
        parse_mode: 'HTML', 
        disable_web_page_preview: true 
      })
    });
    return { channel: 'telegram', ok: res.ok, status: res.status, error: res.ok ? undefined : await res.text() };
  } catch (error) {
    return { channel: 'telegram', ok: false, error: String(error) };
  }
}

async function postSlack(text: string, meta?: any): Promise<ChannelResult> {
  const url = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!url) return { channel: 'slack', ok: false, error: 'no-webhook' };
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        text, 
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text } },
          ...(meta ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: '```' + JSON.stringify(meta, null, 2) + '```' }] }] : [])
        ]
      })
    });
    return { channel: 'slack', ok: res.ok, status: res.status, error: res.ok ? undefined : await res.text() };
  } catch (error) {
    return { channel: 'slack', ok: false, error: String(error) };
  }
}

async function postDiscord(text: string): Promise<ChannelResult> {
  const url = Deno.env.get('DISCORD_WEBHOOK_URL');
  if (!url) return { channel: 'discord', ok: false, error: 'no-webhook' };
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: text.slice(0, 1900) })
    });
    return { channel: 'discord', ok: res.ok, status: res.status, error: res.ok ? undefined : await res.text() };
  } catch (error) {
    return { channel: 'discord', ok: false, error: String(error) };
  }
}

function formatText(p: AlertPayload) {
  const sev = (p.severity ?? 'info').toUpperCase();
  const head = (sev === 'critical') ? '🚨' : (sev === 'warning' ? '⚠️' : 'ℹ️');
  const title = `${head} ${p.title} (${p.event})`;
  const body = p.message;
  const meta = p.meta ? '\n\n<code>' + JSON.stringify(p.meta, null, 2) + '</code>' : '';
  return { 
    telegram: `${title}\n${body}${meta}`, 
    slack: `${title}\n${body}` 
  };
}

async function fanoutWithRetry(texts: { telegram: string, slack: string }, meta?: any): Promise<ChannelResult[]> {
  const tasks = [
    postTelegram(texts.telegram), 
    postSlack(texts.slack, meta), 
    postDiscord(texts.slack)
  ];
  
  const results: ChannelResult[] = [];
  
  for (const task of tasks) {
    let attempt = 0;
    let last: ChannelResult | undefined;
    
    while (attempt < 3) {
      try {
        if (attempt === 0) {
          last = await task;
        } else {
          await sleep(300 * attempt);
          // Retry by recreating the task
          if (task === tasks[0]) last = await postTelegram(texts.telegram);
          else if (task === tasks[1]) last = await postSlack(texts.slack, meta);
          else last = await postDiscord(texts.slack);
        }
        
        results.push(last);
        break;
      } catch (e) {
        last = { channel: 'unknown', ok: false, error: String(e) };
        attempt++;
      }
    }
    
    if (last && !last.ok && attempt >= 3) {
      results.push(last);
    }
  }
  
  return results;
}

/** Main entry: send alert with dedupe, severity gate, and optional rate limits */
export async function sendAlert(supabase: any, payload: AlertPayload) {
  if (Deno.env.get('ALERTS_ENABLED') !== 'true') {
    return { ok: false, reason: 'alerts-disabled' };
  }

  const sev = payload.severity ?? 'info';
  const min = (Deno.env.get('ALERT_MIN_SEVERITY') as Severity) ?? 'info';
  if (severityRank(sev) < severityRank(min)) {
    return { ok: false, reason: 'below-min-severity' };
  }

  // Dedupe window (60s) on same (event+meta signature)
  const key = await sha256(payload.event + ':' + stableStringify(payload.meta ?? {}));
  const { data: dup } = await supabase
    .from('alert_log')
    .select('id, ts')
    .eq('hash_key', key)
    .gte('ts', new Date(Date.now() - 60_000).toISOString())
    .limit(1);
    
  if (dup && dup.length) { 
    return { ok: false, reason: 'deduped' };
  }

  const texts = formatText(payload);
  const results = await fanoutWithRetry(texts, payload.meta);
  const delivered_to: Record<string, boolean> = {};
  let anyOk = false;
  
  for (const r of results) { 
    if (!r) continue; 
    delivered_to[r.channel] = !!r.ok; 
    anyOk = anyOk || r.ok;
  }

  try {
    await supabase.from('alert_log').insert({
      event: payload.event, 
      severity: sev, 
      hash_key: key,
      context: payload.meta ?? null,
      delivered_to, 
      status: anyOk ? 'delivered' : 'error',
      error_msg: anyOk ? null : (results.find(x => !x.ok)?.error ?? 'unknown')
    });
  } catch (error) {
    console.warn('Failed to insert alert log:', error);
  }

  return { ok: anyOk, results };
}