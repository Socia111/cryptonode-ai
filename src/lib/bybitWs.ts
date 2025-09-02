// src/lib/bybitWs.ts
// Resilient Bybit V5 WebSocket client (browser). Public + Private + Trade streams.

type WSKind = "public-spot" | "public-linear" | "public-inverse" | "public-spread" | "public-option" | "private" | "trade";
type Network = "mainnet" | "testnet";

const WS_ENDPOINTS: Record<Network, Record<WSKind, string>> = {
  mainnet: {
    "public-spot":   "wss://stream.bybit.com/v5/public/spot",
    "public-linear": "wss://stream.bybit.com/v5/public/linear",
    "public-inverse":"wss://stream.bybit.com/v5/public/inverse",
    "public-spread": "wss://stream.bybit.com/v5/public/spread",
    "public-option": "wss://stream.bybit.com/v5/public/option",
    "private":       "wss://stream.bybit.com/v5/private",
    "trade":         "wss://stream.bybit.com/v5/trade",
  },
  testnet: {
    "public-spot":   "wss://stream-testnet.bybit.com/v5/public/spot",
    "public-linear": "wss://stream-testnet.bybit.com/v5/public/linear",
    "public-inverse":"wss://stream-testnet.bybit.com/v5/public/inverse",
    "public-spread": "wss://stream-testnet.bybit.com/v5/public/spread",
    "public-option": "wss://stream-testnet.bybit.com/v5/public/option",
    "private":       "wss://stream-testnet.bybit.com/v5/private",
    "trade":         "wss://stream-testnet.bybit.com/v5/trade",
  }
};

export type BybitWsOpts = {
  network?: Network;                 // default: "mainnet"
  kind: WSKind;
  // Private streams only:
  apiKey?: string;
  apiSecret?: string;
  // Advanced: cut connection if idle (Bybit default ~10 min); keep alive with ping every 20s
  maxActiveTime?: string;            // e.g. "60s", "1m" etc. (private or trade only)
  onOpen?: () => void;
  onClose?: (ev: CloseEvent) => void;
  onError?: (ev: Event) => void;
  onMessage?: (msg: any) => void;    // raw parsed JSON from socket
};

type SubMsg = { op: "subscribe" | "unsubscribe"; args: string[]; req_id?: string };
type PingMsg = { op: "ping"; req_id?: string };

function delay(ms: number) { return new Promise(res => setTimeout(res, ms)); }

// WS auth for private/trade:
// Bybit docs show two styles; most accounts accept: signature = HMAC_SHA256(apiSecret, "GET/realtime" + expires_ms)
async function hmacSha256Hex(message: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), {name:"HMAC", hash:"SHA-256"}, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

export class BybitWS {
  private ws?: WebSocket;
  private url: string;
  private opts: BybitWsOpts;
  private isPrivate: boolean;
  private backoff = 1000; // start 1s
  private topics = new Set<string>();
  private pingTimer?: number;
  private openedOnce = false;
  private closing = false;

  constructor(opts: BybitWsOpts) {
    this.opts = { network: "mainnet", ...opts };
    const base = WS_ENDPOINTS[this.opts.network!][this.opts.kind];
    const suffix = (this.opts.kind === "private" || this.opts.kind === "trade") && this.opts.maxActiveTime
      ? `?max_active_time=${encodeURIComponent(this.opts.maxActiveTime)}`
      : "";
    this.url = `${base}${suffix}`;
    this.isPrivate = this.opts.kind === "private" || this.opts.kind === "trade";
  }

  addTopics(...topics: string[]) {
    topics.forEach(t => this.topics.add(t));
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ op: "subscribe", args: topics });
    }
  }

  removeTopics(...topics: string[]) {
    topics.forEach(t => this.topics.delete(t));
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ op: "unsubscribe", args: topics });
    }
  }

  async connect() {
    this.closing = false;
    await this.openSocket();
  }

  async disconnect() {
    this.closing = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close();
  }

  private send(data: object) {
    try {
      this.ws?.send(JSON.stringify(data));
    } catch { /* noop */ }
  }

  private startPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    // Bybit recommends ~20s heartbeat
    this.pingTimer = setInterval(() => {
      this.send({ op: "ping", req_id: String(Date.now()) } as PingMsg);
    }, 20000) as unknown as number;
  }

  private async openSocket() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = async () => {
      this.backoff = 1000; // reset on success
      this.openedOnce = true;
      this.opts.onOpen?.();

      if (this.isPrivate) {
        if (!this.opts.apiKey || !this.opts.apiSecret) {
          console.error("[BybitWS] Private/trade requires apiKey/apiSecret");
          return;
        }
        // expires must be > current time
        const expires = Date.now() + 60_000; // 60s
        const payload = `GET/realtime${expires}`;
        const signature = await hmacSha256Hex(payload, this.opts.apiSecret);
        this.send({
          op: "auth",
          args: [this.opts.apiKey, expires, signature],
        });
      } else {
        // for public we can subscribe immediately
        if (this.topics.size) this.send({ op: "subscribe", args: [...this.topics] } as SubMsg);
        this.startPing();
      }
    };

    this.ws.onmessage = (e) => {
      let parsed: any = null;
      try { parsed = JSON.parse(e.data); } catch { /* ignore */ }

      // After private auth succeeds, subscribe saved topics and start ping
      if (parsed?.op === "auth" && parsed?.success === true) {
        if (this.topics.size) this.send({ op: "subscribe", args: [...this.topics] } as SubMsg);
        this.startPing();
      }

      // Re-ack subscribe response is success:true
      if (parsed?.op === "subscribe" && parsed?.success === true) {
        // ok
      }

      this.opts.onMessage?.(parsed ?? e.data);
    };

    this.ws.onerror = (ev) => {
      this.opts.onError?.(ev);
    };

    this.ws.onclose = async (ev) => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.opts.onClose?.(ev);
      if (this.closing) return;
      // backoff & reconnect
      await delay(this.backoff);
      this.backoff = Math.min(this.backoff * 2, 30000); // max 30s
      await this.openSocket();
      // after reconnect, auth/subscribe handled in onopen/onmessage
    };
  }
}
