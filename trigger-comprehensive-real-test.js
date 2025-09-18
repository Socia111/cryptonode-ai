#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

console.log('🚀 TRIGGERING COMPREHENSIVE SCANNER - Expecting 2000+ symbols\n');

async function triggerComprehensiveScanner() {
  try {
    console.log('⚡ Triggering all-symbols-scanner for comprehensive scan...');
    
    const result = await supabase.functions.invoke('all-symbols-scanner', {
      body: { 
        comprehensive: true,
        test: false,
        mode: 'production'
      }
    });
    
    if (result.error) {
      console.error('❌ Comprehensive Scanner Error:', result.error);
      return;
    }
    
    console.log('✅ Comprehensive Scanner Result:', result.data);
    
    if (result.data) {
      console.log(`📊 SCAN SUMMARY:`);
      console.log(`   Total Symbols Scanned: ${result.data.totalSymbolsScanned || 'Unknown'}`);
      console.log(`   Market Data Points: ${result.data.marketDataPoints || 'Unknown'}`);
      console.log(`   Signals Generated: ${result.data.signalsGenerated || 'Unknown'}`);
      console.log(`   Exchanges: ${result.data.exchanges?.join(', ') || 'Unknown'}`);
    }
    
    // Wait for processing
    console.log('\n⏳ Waiting 10 seconds for comprehensive signal processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check for new comprehensive signals
    console.log('\n🔍 Checking for new comprehensive signals...');
    
    const { data: comprehensiveSignals, error: comprehensiveError } = await supabase
      .from('signals')
      .select('symbol, source, algo, score, signal_grade, created_at')
      .or('source.eq.all_symbols_comprehensive,algo.eq.aitradex1_comprehensive_v4')
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (comprehensiveError) {
      console.error('❌ Error fetching comprehensive signals:', comprehensiveError);
    } else {
      console.log(`✅ Found ${comprehensiveSignals?.length || 0} comprehensive signals`);
      
      if (comprehensiveSignals && comprehensiveSignals.length > 0) {
        console.log('\n📈 COMPREHENSIVE SIGNALS SAMPLE:');
        comprehensiveSignals.slice(0, 10).forEach((signal, index) => {
          console.log(`   ${index + 1}. ${signal.symbol} (${signal.source}/${signal.algo}) - Grade: ${signal.signal_grade || 'N/A'}, Score: ${signal.score}`);
        });
        
        // Check unique symbols
        const uniqueSymbols = [...new Set(comprehensiveSignals.map(s => s.symbol))];
        console.log(`\n🎯 DIVERSITY CHECK:`);
        console.log(`   Unique symbols: ${uniqueSymbols.length}`);
        console.log(`   Sample symbols: ${uniqueSymbols.slice(0, 20).join(', ')}`);
        
        if (uniqueSymbols.length > 20) {
          console.log('   ✅ SUCCESS: Comprehensive scanner is working! More than 20 unique symbols detected.');
        } else {
          console.log('   ⚠️  WARNING: Limited symbol diversity. May still be using old 8-symbol scanner.');
        }
      }
    }
    
    // Check recent signal statistics
    console.log('\n📊 RECENT SIGNAL STATISTICS (Last 15 minutes):');
    const { data: recentStats, error: statsError } = await supabase
      .from('signals')
      .select('source, algo, symbol')
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());
    
    if (!statsError && recentStats) {
      const bySource = {};
      const uniqueSymbolsAll = new Set();
      
      recentStats.forEach(signal => {
        const key = `${signal.source}/${signal.algo}`;
        if (!bySource[key]) bySource[key] = 0;
        bySource[key]++;
        uniqueSymbolsAll.add(signal.symbol);
      });
      
      console.log(`   Total signals: ${recentStats.length}`);
      console.log(`   Unique symbols: ${uniqueSymbolsAll.size}`);
      console.log(`   Sources/Algorithms:`);
      
      Object.entries(bySource)
        .sort(([,a], [,b]) => b - a)
        .forEach(([key, count]) => {
          console.log(`     ${key}: ${count} signals`);
        });
    }
    
  } catch (error) {
    console.error('❌ Comprehensive scanner test failed:', error);
  }
}

triggerComprehensiveScanner().then(() => {
  console.log('\n🎯 Comprehensive scanner test completed!');
  process.exit(0);
});