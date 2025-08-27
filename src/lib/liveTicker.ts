type Tick = { exchange: string; symbol: string; price: number; ts: number };
type Provider = {
  name: string;
  open: (onTick: (t: Tick) => void, onDead: () => void) => () => void; // returns close()
};

// --- Utilities ---
const now = () => Date.now();
const watchdog = (ms: number, onDead: () => void) => {
  let timer: any = null;
  const kick = () => {
    clearTimeout(timer);
    timer = setTimeout(onDead, ms);
  };
  kick();
  return { kick, stop: () => clearTimeout(timer) };
};

// --- Providers (endpoints as envs so you can swap without code changes) ---
const symbol = "BTCUSDT"; // normalize UI symbol
const BINANCE_WS = import.meta.env.VITE_BINANCE_WS ?? "wss://stream.binance.com:9443/ws";
const BYBIT_WS   = import.meta.env.VITE_BYBIT_WS   ?? "wss://stream.bybit.com/v5/public/spot";
const COINBASE_WS= import.meta.env.VITE_COINBASE_WS?? "wss://ws-feed.exchange.coinbase.com";

const binanceProvider: Provider = {
  name: "binance",
  open(onTick, onDead) {
    const ws = new WebSocket(`${BINANCE_WS}/btcusdt@trade`);
    const dog = watchdog(3000, () => { ws.close(); onDead(); });
    ws.onmessage = (ev) => {
      // Binance trade payload: { p: "price", E: eventTime }
      const m = JSON.parse(ev.data);
      if (!m.p) return;
      dog.kick();
      onTick({ exchange: "binance", symbol, price: parseFloat(m.p), ts: m.E || now() });
    };
    ws.onerror = () => { try { ws.close(); } catch{} onDead(); };
    ws.onclose = () => {};
    return () => { dog.stop(); try { ws.close(); } catch{} };
  }
};

const bybitProvider: Provider = {
  name: "bybit",
  open(onTick, onDead) {
    const ws = new WebSocket(BYBIT_WS);
    const dog = watchdog(3000, () => { try { ws.close(); } catch{} onDead(); });
    ws.onopen = () => {
      // Public spot trade topic; some clusters require lowercased or `tickers`—keep configurable if needed
      ws.send(JSON.stringify({ op: "subscribe", args: [`publicTrade.${symbol}`] }));
    };
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      // Bybit v5 trade: { topic:"publicTrade.BTCUSDT", data:[{ p:"price", T: ms }] }
      if (m?.data?.[0]?.p) {
        dog.kick();
        onTick({ exchange: "bybit", symbol, price: parseFloat(m.data[0].p), ts: m.data[0].T || now() });
      }
    };
    ws.onerror = () => { try { ws.close(); } catch{} onDead(); };
    return () => { dog.stop(); try { ws.close(); } catch{} };
  }
};

const coinbaseProvider: Provider = {
  name: "coinbase",
  open(onTick, onDead) {
    const ws = new WebSocket(COINBASE_WS);
    const dog = watchdog(3000, () => { try { ws.close(); } catch{} onDead(); });
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", channels: [{ name: "matches", product_ids: ["BTC-USD"] }] }));
    };
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.type === "match" && m.price) {
        dog.kick();
        // Normalize to USDT notionally (close enough for display; use true FX if you need exact parity)
        onTick({ exchange: "coinbase", symbol: "BTCUSD", price: parseFloat(m.price), ts: Date.parse(m.time) || now() });
      }
    };
    ws.onerror = () => { try { ws.close(); } catch{} onDead(); };
    return () => { dog.stop(); try { ws.close(); } catch{} };
  }
};

const PROVIDERS: Provider[] = [binanceProvider, bybitProvider, coinbaseProvider];

export function openLiveTicker(
  onTick: (t: Tick) => void,
  onProviderChange?: (name: string) => void
) {
  let idx = 0;
  let closeCurrent = () => {};
  const start = () => {
    const p = PROVIDERS[idx % PROVIDERS.length];
    onProviderChange?.(p.name);
    closeCurrent = p.open(onTick, () => {
      idx += 1; // failover
      start();
    });
  };
  start();
  return () => closeCurrent();
}
