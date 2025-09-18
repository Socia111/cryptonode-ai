#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

console.log('🚀 Testing improved signal generation with relaxed thresholds...\n');

async function testImprovedScanner() {
  try {
    // Test the enhanced signal generation first
    console.log('1. Testing enhanced-signal-generation function...');
    const enhancedResult = await supabase.functions.invoke('enhanced-signal-generation', {
      body: { test: true }
    });
    
    if (enhancedResult.error) {
      console.error('❌ Enhanced Signal Generation Error:', enhancedResult.error);
    } else {
      console.log('✅ Enhanced Signal Generation Result:', enhancedResult.data);
    }
    
    console.log('\n2. Testing all-symbols-scanner function...');
    const comprehensiveResult = await supabase.functions.invoke('all-symbols-scanner', {
      body: { test: true }
    });
    
    if (comprehensiveResult.error) {
      console.error('❌ All Symbols Scanner Error:', comprehensiveResult.error);
    } else {
      console.log('✅ All Symbols Scanner Result:', comprehensiveResult.data);
    }
    
    // Wait a bit for signals to be generated
    console.log('\n3. Waiting 5 seconds for signal generation...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check for new signals with the improved algorithm
    console.log('\n4. Checking for new signals with aitradex1_comprehensive_v4...');
    const { data: newSignals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .eq('algo', 'aitradex1_comprehensive_v4')
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (signalsError) {
      console.error('❌ Error fetching signals:', signalsError);
    } else {
      console.log(`✅ Found ${newSignals?.length || 0} new signals with improved algorithm`);
      
      if (newSignals && newSignals.length > 0) {
        newSignals.slice(0, 5).forEach((signal, index) => {
          console.log(`\n📊 Signal ${index + 1}:`);
          console.log(`   Symbol: ${signal.symbol}`);
          console.log(`   Direction: ${signal.direction}`);
          console.log(`   Score: ${signal.score}`);
          console.log(`   Grade: ${signal.signal_grade || 'N/A'}`);
          console.log(`   Source: ${signal.source}`);
          console.log(`   Algorithm: ${signal.algo}`);
          console.log(`   Entry: $${signal.entry_price}`);
          console.log(`   SL: $${signal.stop_loss}`);
          console.log(`   TP: $${signal.take_profit}`);
          if (signal.diagnostics) {
            console.log(`   Diagnostics: ${JSON.stringify(signal.diagnostics, null, 2)}`);
          }
        });
      }
    }
    
    // Also check for signals with the advanced source
    console.log('\n5. Checking for signals with aitradex1_advanced source...');
    const { data: advancedSignals, error: advancedError } = await supabase
      .from('signals')
      .select('*')
      .eq('source', 'aitradex1_advanced')
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (advancedError) {
      console.error('❌ Error fetching advanced signals:', advancedError);
    } else {
      console.log(`✅ Found ${advancedSignals?.length || 0} advanced signals`);
    }
    
    // Check total signals generated in last 10 minutes
    console.log('\n6. Checking total signals in last 10 minutes...');
    const { data: allRecentSignals, error: allError } = await supabase
      .from('signals')
      .select('symbol, source, algo, score, signal_grade, created_at')
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('❌ Error fetching all signals:', allError);
    } else {
      console.log(`\n📈 TOTAL SIGNALS GENERATED: ${allRecentSignals?.length || 0}`);
      
      // Group by source/algorithm
      const bySource = {};
      allRecentSignals?.forEach(signal => {
        const key = `${signal.source}/${signal.algo}`;
        if (!bySource[key]) bySource[key] = 0;
        bySource[key]++;
      });
      
      console.log('\n📊 SIGNALS BY SOURCE/ALGORITHM:');
      Object.entries(bySource).forEach(([key, count]) => {
        console.log(`   ${key}: ${count} signals`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testImprovedScanner().then(() => {
  console.log('\n🎯 Test completed!');
  process.exit(0);
});