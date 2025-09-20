#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignalFixes() {
  console.log('🧪 Testing Signal Generation Fixes...\n');

  // Test 1: Secure Signal Test
  console.log('1️⃣ Testing Secure Signal Test Function...');
  try {
    const { data, error } = await supabase.functions.invoke('secure-signal-test', {
      body: { action: 'test_insert' }
    });
    
    if (error) throw error;
    console.log(`✅ Secure Signal Test: ${data.message}`);
    console.log(`   Data: ${JSON.stringify(data.data)}\n`);
  } catch (error) {
    console.log(`❌ Secure Signal Test Failed: ${error.message}\n`);
  }

  // Test 2: Enhanced Signal Generation with lower thresholds
  console.log('2️⃣ Testing Enhanced Signal Generation...');
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-signal-generation');
    
    if (error) throw error;
    console.log(`✅ Enhanced Signal Generation: Generated ${data.signals} signals`);
    console.log(`   Processed: ${data.total_processed} symbols`);
    if (data.average_score) {
      console.log(`   Average Score: ${data.average_score.toFixed(1)}\n`);
    }
  } catch (error) {
    console.log(`❌ Enhanced Signal Generation Failed: ${error.message}\n`);
  }

  // Test 3: Live Signals Generator with lower thresholds
  console.log('3️⃣ Testing Live Signals Generator...');
  try {
    const { data, error } = await supabase.functions.invoke('live-signals-generator');
    
    if (error) throw error;
    console.log(`✅ Live Signals Generator: Generated ${data.signals_generated} signals`);
    if (data.total_processed) {
      console.log(`   Processed: ${data.total_processed} symbols\n`);
    }
  } catch (error) {
    console.log(`❌ Live Signals Generator Failed: ${error.message}\n`);
  }

  // Test 4: Check recent signals in database
  console.log('4️⃣ Checking Recent Signals in Database...');
  try {
    const { data: signals, error } = await supabase
      .from('signals')
      .select('symbol, direction, score, created_at, source')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (signals && signals.length > 0) {
      console.log(`✅ Found ${signals.length} recent signals:`);
      signals.forEach(signal => {
        console.log(`   ${signal.symbol} ${signal.direction} (score: ${signal.score}) - ${signal.source}`);
      });
      console.log('');
    } else {
      console.log('⚠️ No recent signals found in database\n');
    }
  } catch (error) {
    console.log(`❌ Database Query Failed: ${error.message}\n`);
  }

  // Test 5: Scanner Function
  console.log('5️⃣ Testing AItradeX1 Scanner...');
  try {
    const { data, error } = await supabase.functions.invoke('aitradex1-enhanced-scanner', {
      body: { test_mode: true }
    });
    
    if (error) throw error;
    console.log(`✅ AItradeX1 Scanner: ${data.message || 'Success'}`);
    if (data.signals_generated) {
      console.log(`   Generated: ${data.signals_generated} signals\n`);
    }
  } catch (error) {
    console.log(`❌ AItradeX1 Scanner Failed: ${error.message}\n`);
  }

  console.log('🎯 Signal Testing Complete!');
  console.log('\n📊 Summary:');
  console.log('- Fixed RLS policies for live_prices and signals tables');
  console.log('- Lowered signal generation thresholds from 65% to 50%');
  console.log('- Updated secure signal test function for proper permissions');
  console.log('- All functions should now generate signals successfully');
}

testSignalFixes().catch(console.error);