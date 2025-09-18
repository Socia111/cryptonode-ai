#!/usr/bin/env node

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

console.log('\n🔄 FORCING REAL SIGNALS REFRESH...\n');

async function refreshRealSignals() {
  try {
    // 1. Trigger comprehensive trading pipeline
    console.log('📡 Triggering comprehensive trading pipeline...');
    const pipelineResponse = await fetch(`${SUPABASE_URL}/functions/v1/comprehensive-trading-pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode: 'full' })
    });

    const pipelineData = await pipelineResponse.json();
    console.log('✅ Pipeline Result:', {
      success: pipelineData.success,
      steps: pipelineData.steps_completed?.length || 0,
      signals: pipelineData.signals_generated || 0,
      errors: pipelineData.errors?.length || 0
    });

    // 2. Check current real signals
    console.log('\n📊 Checking current real signals...');
    const signalsResponse = await fetch(`${SUPABASE_URL}/functions/v1/signals-api?action=list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const signalsData = await signalsResponse.json();
    console.log('✅ Real Signals Found:', {
      total_signals: signalsData.count || 0,
      data_source: signalsData.data_source,
      filtered_out: signalsData.filtered_out || 0
    });

    if (signalsData.signals && signalsData.signals.length > 0) {
      const sample = signalsData.signals.slice(0, 5);
      console.log('\n📋 Sample Signals:');
      sample.forEach((signal, i) => {
        console.log(`  ${i+1}. ${signal.symbol} ${signal.direction} - Score: ${signal.score}% (${signal.source})`);
      });
    }

    // 3. Check live signals for trading
    console.log('\n🎯 Checking live trading signals...');
    const liveResponse = await fetch(`${SUPABASE_URL}/functions/v1/signals-api?action=live`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const liveData = await liveResponse.json();
    console.log('✅ Live Trading Signals:', {
      high_confidence_signals: liveData.count || 0,
      ready_for_trading: liveData.items?.length || 0
    });

    console.log('\n🎉 REFRESH COMPLETE! Real signals should now be visible in the UI.');
    
    return {
      success: true,
      total_signals: signalsData.count || 0,
      live_signals: liveData.count || 0,
      pipeline_success: pipelineData.success
    };

  } catch (error) {
    console.error('❌ Error refreshing signals:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the refresh
refreshRealSignals()
  .then(result => {
    if (result.success) {
      console.log('\n✅ SUCCESS: Real signals refresh completed');
      process.exit(0);
    } else {
      console.log('\n❌ FAILED: Real signals refresh failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ CRITICAL ERROR:', error);
    process.exit(1);
  });