// Trigger live exchange feed for fresh data
import fetch from "node-fetch";

const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";

async function triggerLiveFeeds() {
  console.log("🚀 Starting live exchange feeds...");
  
  try {
    // Trigger live exchange feed
    console.log("📡 Triggering live exchange feed...");
    const feedResponse = await fetch(`${SUPABASE_URL}/functions/v1/live-exchange-feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'BNBUSDT', 'XRPUSDT'],
        exchanges: ['bybit', 'binance']
      })
    });
    
    const feedResult = await feedResponse.json();
    console.log("📊 Exchange feed result:", feedResult);
    
    // Trigger signal generation
    console.log("🔍 Triggering signal generation...");
    const signalResponse = await fetch(`${SUPABASE_URL}/functions/v1/live-scanner-production`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exchange: 'bybit',
        timeframe: '1h',
        relaxed_filters: true,
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT'],
        scan_all_coins: true
      })
    });
    
    const signalResult = await signalResponse.json();
    console.log("🎯 Signal generation result:", signalResult);
    
    console.log("✅ Live feeds triggered successfully!");
    
  } catch (error) {
    console.error("❌ Error triggering live feeds:", error);
  }
}

triggerLiveFeeds();