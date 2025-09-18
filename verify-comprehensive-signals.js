// Verify comprehensive scanner signals are being generated
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function checkSignalSources() {
  try {
    console.log("🔍 Checking signal sources in database...");
    
    // Check current signals by source
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=source,algo,symbol,created_at&order=created_at.desc&limit=50`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const signals = await response.json();
    
    console.log(`\n📊 Found ${signals.length} recent signals:`);
    
    // Group by source and algo
    const sourceCount = {};
    const algoCount = {};
    const symbolSet = new Set();
    
    signals.forEach(signal => {
      sourceCount[signal.source] = (sourceCount[signal.source] || 0) + 1;
      algoCount[signal.algo] = (algoCount[signal.algo] || 0) + 1;
      symbolSet.add(signal.symbol);
    });
    
    console.log("\n📈 Signals by Source:");
    Object.entries(sourceCount).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} signals`);
    });
    
    console.log("\n🤖 Signals by Algorithm:");
    Object.entries(algoCount).forEach(([algo, count]) => {
      console.log(`  ${algo}: ${count} signals`);
    });
    
    console.log(`\n🎯 Unique symbols found: ${symbolSet.size}`);
    
    // Check for new comprehensive signals
    const comprehensiveSignals = signals.filter(s => 
      s.source === 'all_symbols_comprehensive' && 
      s.algo === 'aitradex1_comprehensive_v4'
    );
    
    if (comprehensiveSignals.length > 0) {
      console.log(`\n✅ SUCCESS: Found ${comprehensiveSignals.length} new comprehensive signals!`);
      console.log("📋 Sample comprehensive signals:");
      comprehensiveSignals.slice(0, 5).forEach(signal => {
        console.log(`  • ${signal.symbol} (${signal.created_at})`);
      });
    } else {
      console.log("\n❌ No comprehensive signals found yet. Need to trigger scanner.");
    }
    
    // Show recent signal timeline
    console.log("\n⏰ Recent signal timeline:");
    signals.slice(0, 10).forEach(signal => {
      const time = new Date(signal.created_at).toLocaleTimeString();
      console.log(`  ${time}: ${signal.symbol} [${signal.source}/${signal.algo}]`);
    });

  } catch (error) {
    console.error("❌ Error checking signals:", error);
  }
}

checkSignalSources();