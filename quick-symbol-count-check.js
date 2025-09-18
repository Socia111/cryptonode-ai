#!/usr/bin/env node

// Quick check of current signal counts vs comprehensive scan
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function checkSymbolCounts() {
  try {
    console.log("🔍 Checking current signal symbol counts...");
    
    // Get recent signals
    const response = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=symbol,source,algo,created_at&created_at=gte.${new Date(Date.now() - 24*60*60*1000).toISOString()}&order=created_at.desc`, {
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
    
    console.log(`\n📊 Total signals in last 24h: ${signals.length}`);
    
    // Count unique symbols
    const uniqueSymbols = new Set(signals.map(s => s.symbol));
    console.log(`🎯 Unique symbols: ${uniqueSymbols.size}`);
    
    // Group by source
    const sourceGroups = {};
    signals.forEach(signal => {
      if (!sourceGroups[signal.source]) {
        sourceGroups[signal.source] = new Set();
      }
      sourceGroups[signal.source].add(signal.symbol);
    });
    
    console.log("\n📈 Symbols per source:");
    Object.entries(sourceGroups).forEach(([source, symbolSet]) => {
      console.log(`  ${source}: ${symbolSet.size} unique symbols`);
    });
    
    // Check if comprehensive scanner has been used
    const comprehensiveSignals = signals.filter(s => s.source === 'all_symbols_comprehensive');
    if (comprehensiveSignals.length > 0) {
      const compSymbols = new Set(comprehensiveSignals.map(s => s.symbol));
      console.log(`\n✅ Comprehensive scanner active: ${compSymbols.size} symbols`);
    } else {
      console.log(`\n❌ No comprehensive signals found. Only ${uniqueSymbols.size} symbols total.`);
      console.log("👉 Need to trigger comprehensive scanner to expand beyond 8-symbol limit.");
    }
    
    // Show symbol list
    console.log(`\n📋 Current symbols (showing first 20):`);
    Array.from(uniqueSymbols).slice(0, 20).forEach(symbol => {
      console.log(`  • ${symbol}`);
    });
    
    if (uniqueSymbols.size > 20) {
      console.log(`  ... and ${uniqueSymbols.size - 20} more`);
    }

  } catch (error) {
    console.error("❌ Check failed:", error);
  }
}

checkSymbolCounts();