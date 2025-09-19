// test-live-signals.js - Quick verification script
import fetch from "node-fetch";

const EDGE = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SCAN = `${EDGE}/functions/v1/live-scanner-production`;

async function scan(tf) {
  const body = {
    exchange: "bybit", 
    timeframe: tf, 
    relaxed_filters: true,
    symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "ADAUSDT", "DOTUSDT", "BNBUSDT", "XRPUSDT"]
  };
  
  console.log(`🔍 Scanning ${tf}...`);
  const res = await fetch(SCAN, {
    method: "POST",
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const result = await res.json();
  return { timeframe: tf, signals_found: result.signals_found || 0, success: result.success };
}

(async () => {
  console.log("▶ Starting live scanner tests...");
  
  try {
    const results = await Promise.allSettled(["5m", "15m", "1h"].map(scan));
    
    console.log("\n📊 Results:");
    results.forEach(res => {
      if (res.status === 'fulfilled') {
        const { timeframe, signals_found, success } = res.value;
        console.log(`${timeframe}: ${signals_found} signals ${success ? '✅' : '❌'}`);
      } else {
        console.log(`ERROR: ${res.reason}`);
      }
    });
    
  } catch (error) {
    console.error("Test failed:", error);
  }
})();