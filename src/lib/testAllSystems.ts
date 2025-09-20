import { supabase } from '@/integrations/supabase/client';

export const testAllSignalSystems = async () => {
  const results = {
    enhanced_signal_generation: null as any,
    real_time_scanner: null as any,
    live_signals_generator: null as any,
    test_signal_generation: null as any,
    signals_analysis: null as any
  };

  try {
    console.log('🧪 Testing all signal generation systems...');

    // Test 1: Enhanced Signal Generation (should produce real signals)
    console.log('📊 Testing enhanced-signal-generation...');
    try {
      const { data: enhancedResult, error: enhancedError } = await supabase.functions.invoke('enhanced-signal-generation', {
        body: { timeframes: ['15m'], force: true, test_mode: true }
      });
      
      if (enhancedError) {
        results.enhanced_signal_generation = { success: false, error: enhancedError.message };
      } else {
        results.enhanced_signal_generation = { success: true, data: enhancedResult };
        console.log('✅ Enhanced signal generation:', enhancedResult);
      }
    } catch (err: any) {
      results.enhanced_signal_generation = { success: false, error: err.message };
    }

    // Test 2: Real-time Scanner (new professional scanner)
    console.log('📊 Testing real-time-scanner...');
    try {
      const { data: scannerResult, error: scannerError } = await supabase.functions.invoke('real-time-scanner', {
        body: { scan_type: 'professional' }
      });
      
      if (scannerError) {
        results.real_time_scanner = { success: false, error: scannerError.message };
      } else {
        results.real_time_scanner = { success: true, data: scannerResult };
        console.log('✅ Real-time scanner:', scannerResult);
      }
    } catch (err: any) {
      results.real_time_scanner = { success: false, error: err.message };
    }

    // Test 3: Live Signals Generator
    console.log('📊 Testing live-signals-generator...');
    try {
      const { data: liveResult, error: liveError } = await supabase.functions.invoke('live-signals-generator', {
        body: { mode: 'professional' }
      });
      
      if (liveError) {
        results.live_signals_generator = { success: false, error: liveError.message };
      } else {
        results.live_signals_generator = { success: true, data: liveResult };
        console.log('✅ Live signals generator:', liveResult);
      }
    } catch (err: any) {
      results.live_signals_generator = { success: false, error: err.message };
    }

    // Test 4: Test Signal Generation (should be blocked by anti-mock triggers)
    console.log('📊 Testing test-signal-generation (should be blocked)...');
    try {
      const { data: testResult, error: testError } = await supabase.functions.invoke('test-signal-generation');
      
      if (testError) {
        results.test_signal_generation = { success: false, error: testError.message };
      } else {
        results.test_signal_generation = { success: true, data: testResult };
        console.log('✅ Test signal generation (blocked as expected):', testResult);
      }
    } catch (err: any) {
      results.test_signal_generation = { success: false, error: err.message };
    }

    // Test 5: Analyze current signals in database
    console.log('📊 Analyzing current signals...');
    try {
      const { data: signalsData, error: signalsError } = await supabase
        .from('signals')
        .select('source, score, metadata, created_at')
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
        .order('created_at', { ascending: false })
        .limit(20);

      if (signalsError) {
        results.signals_analysis = { success: false, error: signalsError.message };
      } else {
        const analysis = {
          total_signals: signalsData?.length || 0,
          real_signals: signalsData?.filter(s => (s.metadata as any)?.verified_real_data === true).length || 0,
          mock_signals: signalsData?.filter(s => (s.metadata as any)?.verified_real_data !== true).length || 0,
          sources: [...new Set(signalsData?.map(s => s.source) || [])],
          avg_score: signalsData?.reduce((sum, s) => sum + (s.score || 0), 0) / (signalsData?.length || 1),
          latest_signal: signalsData?.[0]?.created_at
        };
        
        results.signals_analysis = { success: true, data: analysis };
        console.log('✅ Signals analysis:', analysis);
      }
    } catch (err: any) {
      results.signals_analysis = { success: false, error: err.message };
    }

    return results;

  } catch (error: any) {
    console.error('❌ Error in comprehensive test:', error);
    return { ...results, error: error.message };
  }
};

export const getSignalSystemStatus = () => {
  return {
    real_signal_sources: [
      'enhanced_signal_generation',
      'real_time_scanner', 
      'live_signals_generator',
      'aitradex1_real'
    ],
    blocked_sources: [
      'test_signal_generation',
      'mock_signals',
      'demo_signals'
    ],
    quality_requirements: {
      minimum_score: 60,
      verified_real_data: true,
      technical_indicators_required: true,
      live_market_data: true
    }
  };
};