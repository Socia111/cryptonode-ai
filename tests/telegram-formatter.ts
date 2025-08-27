// Telegram Signal Formatter and Sender
export interface SignalData {
  symbol: string;
  direction: 'LONG' | 'SHORT' | 'BUY' | 'SELL';
  price: number;
  confidence_score: number;
  adx?: number;
  hvp?: number;
  stoch_k?: number;
  rsi?: number;
  vol_spike?: boolean;
  exchange?: string;
  timeframe?: string;
  risk_level?: string;
  signal_strength?: string;
}

export class TelegramFormatter {
  static formatFreeSignal(signal: SignalData): string {
    const emoji = signal.direction === 'BUY' || signal.direction === 'LONG' ? '🚀' : '📉';
    const strengthEmoji = this.getStrengthEmoji(signal.signal_strength || 'MODERATE');
    const riskEmoji = this.getRiskEmoji(signal.risk_level || 'MEDIUM');
    
    return `
${emoji} *Aiatethecoin ${signal.direction} SIGNAL* ${emoji}

🎯 *Token:* \`${signal.symbol.replace('USDT', '').replace('USD', '')}\`
📊 *Exchange:* ${signal.exchange || 'Bybit'}
💰 *Entry:* $${signal.price.toFixed(4)}
⚡ *Confidence:* ${signal.confidence_score.toFixed(1)}% ${strengthEmoji}
⚠️ *Risk Level:* ${signal.risk_level || 'MEDIUM'} ${riskEmoji}

📈 *Technical Analysis:*
• ADX: ${signal.adx?.toFixed(1) || 'N/A'}
• HVP: ${signal.hvp?.toFixed(1) || 'N/A'}
• Stoch: ${signal.stoch_k?.toFixed(1) || 'N/A'}
• RSI: ${signal.rsi?.toFixed(1) || 'N/A'}
• Vol Spike: ${signal.vol_spike ? '✅' : '❌'}

⏰ *Time:* ${new Date().toLocaleString('en-US', { 
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})} UTC

🆓 *Free Signal* | 🤖 *@Aiatethecoin_bot*

💎 *Upgrade to AItradeX Premium for:*
• Advanced quantum analysis
• Higher accuracy signals
• Priority alerts & faster execution
• Exclusive high-confidence trades
    `.trim();
  }

  static formatPremiumSignal(signal: SignalData): string {
    const emoji = signal.direction === 'BUY' || signal.direction === 'LONG' ? '🚀' : '📉';
    const strengthEmoji = this.getStrengthEmoji(signal.signal_strength || 'STRONG');
    const riskEmoji = this.getRiskEmoji(signal.risk_level || 'LOW');

    return `
🌟 *AItradeX PREMIUM ${signal.direction} SIGNAL* 🌟

${emoji} *${signal.symbol.replace('USDT', '').replace('USD', '')}* ${signal.direction}

⭐ *Confidence:* ${signal.confidence_score.toFixed(1)}% ${strengthEmoji}
🧬 *Quantum Analysis:* ${(signal.confidence_score / 100).toFixed(2)}
💎 *Signal Strength:* ${signal.signal_strength || 'VERY_STRONG'}
🎯 *Entry:* $${signal.price.toFixed(4)}
⚠️ *Risk Level:* ${signal.risk_level || 'LOW'} ${riskEmoji}

📊 *Advanced Metrics:*
• ADX Momentum: ${signal.adx?.toFixed(1) || 'N/A'}
• HVP Position: ${signal.hvp?.toFixed(1) || 'N/A'}
• Stochastic: ${signal.stoch_k?.toFixed(1) || 'N/A'}
• RSI Level: ${signal.rsi?.toFixed(1) || 'N/A'}
• Volume Confirmation: ${signal.vol_spike ? '🔥 SPIKE' : '📊 Normal'}

⏰ *Time:* ${new Date().toLocaleString('en-US', { 
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})} UTC

💎 *PREMIUM MEMBERS ONLY*
🔥 *EXECUTE IMMEDIATELY FOR MAXIMUM ALPHA*
🤖 *@AItradeX1_bot*
    `.trim();
  }

  static formatScannerResults(results: any): string {
    const signalCount = results.signals_count || 0;
    const topSignals = results.signals?.slice(0, 3) || [];
    
    return `
🔍 *AItradeX Scanner Update*

📊 *Scan Complete:* ${results.exchange} ${results.timeframe}
🎯 *Signals Generated:* ${signalCount}
⏰ *Updated:* ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC

${topSignals.length > 0 ? '🏆 *Top Signals:*' : ''}
${topSignals.map((signal, index) => 
  `${index + 1}. ${signal.symbol} ${signal.direction} (${signal.confidence_score.toFixed(1)}%)`
).join('\n')}

🤖 *Automated by AItradeX Scanner*
    `.trim();
  }

  private static getStrengthEmoji(strength: string): string {
    switch (strength.toUpperCase()) {
      case 'VERY_STRONG': return '🔥🔥🔥';
      case 'STRONG': return '🔥🔥';
      case 'MODERATE': return '🔥';
      default: return '⚡';
    }
  }

  private static getRiskEmoji(risk: string): string {
    switch (risk.toUpperCase()) {
      case 'LOW': return '🟢';
      case 'MEDIUM': return '🟡';
      case 'HIGH': return '🔴';
      default: return '⚪';
    }
  }
}

export async function sendToTelegram(token: string, chatId: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Telegram send error:', error);
    return false;
  }
}