import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    testComprehensiveSignalSystem: () => Promise<any>;
  }
}

// Comprehensive signal system test that runs automatically
export const testComprehensiveSignalSystem = async () => {
  console.log('🧪 Running comprehensive signal system test...');
  
  const testResults = {
    symbolFetching: false,
    enhancedSignals: false,
    liveSignals: false,
    realtimeScanner: false,
    testSignalBlocking: false,
    signalAnalysis: false
  };

  try {
    console.log('🧪 Testing all signal generation systems...');

    // Test 1: Enhanced signal generation
    console.log('📊 Testing enhanced-signal-generation...');
    const enhancedResponse = await fetch('https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/enhanced-signal-generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const enhancedData = await enhancedResponse.json();
    console.log('✅ Enhanced signal generation:', enhancedData);
    testResults.enhancedSignals = enhancedData.success;

    // Test 2: Real-time scanner
    console.log('📊 Testing real-time-scanner...');
    const scannerResponse = await fetch('https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/real-time-scanner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const scannerData = await scannerResponse.json();
    console.log('✅ Real-time scanner:', scannerData);
    testResults.realtimeScanner = scannerData.success;

    // Test 3: Live signals generator
    console.log('📊 Testing live-signals-generator...');
    const liveResponse = await fetch('https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/live-signals-generator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const liveData = await liveResponse.json();
    console.log('✅ Live signals generator:', liveData);
    testResults.liveSignals = liveData.success;

    // Test 4: Test signal generation (should be blocked)
    console.log('📊 Testing test-signal-generation (should be blocked)...');
    const testResponse = await fetch('https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/test-signal-generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const testData = await testResponse.json();
    console.log('✅ Test signal generation (blocked as expected):', testData);
    testResults.testSignalBlocking = testData.success && testData.message?.includes('blocked');

    // Test 5: Analyze current signals in database
    console.log('📊 Analyzing current signals...');
    const { data: signals, error } = await supabase
      .from('signals')
      .select('*')
      .gte('score', 60)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && signals) {
      const totalSignals = signals.length;
      const realSignals = signals.filter(s => !['mock', 'demo', 'test'].some(keyword => 
        s.source?.toLowerCase().includes(keyword)
      )).length;
      const mockSignals = totalSignals - realSignals;
      const sources = [...new Set(signals.map(s => s.source))];
      const avgScore = signals.reduce((sum, s) => sum + s.score, 0) / totalSignals;
      const latestSignal = signals[0]?.created_at;

      const analysisResult = {
        total_signals: totalSignals,
        real_signals: realSignals,
        mock_signals: mockSignals,
        sources,
        avg_score: Math.round(avgScore),
        latest_signal: latestSignal
      };

      console.log('✅ Signals analysis:', analysisResult);
      testResults.signalAnalysis = true;
    }

    return testResults;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return testResults;
  }
};

// Expose function globally for console access
if (typeof window !== 'undefined') {
  window.testComprehensiveSignalSystem = testComprehensiveSignalSystem;
}