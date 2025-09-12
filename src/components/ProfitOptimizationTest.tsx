import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TradingGateway } from '@/lib/tradingGateway';
import { filterProfitableSignals, calculateRiskPrices, DEFAULT_RISK_PARAMS } from '@/lib/profitOptimizedTrading';

export function ProfitOptimizationTest() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock test signals to verify filtering
  const mockSignals = [
    {
      id: '1',
      token: 'BTCUSDT',
      direction: 'Buy' as const,
      _score: 0.95,
      _grade: 'A+' as const,
      spread_bps: 15,
      rr: 2.5,
      entry_price: 43500,
      timeframe: '1h'
    },
    {
      id: '2', 
      token: 'ETHUSDT',
      direction: 'Sell' as const,
      _score: 0.75,
      _grade: 'B' as const,
      spread_bps: 25,
      rr: 1.8,
      entry_price: 2650,
      timeframe: '4h'
    },
    {
      id: '3',
      token: 'SOLUSDT', 
      direction: 'Buy' as const,
      _score: 0.88,
      _grade: 'A' as const,
      spread_bps: 18,
      rr: 3.2,
      entry_price: 145,
      timeframe: '1m'
    },
    {
      id: '4',
      token: 'ADAUSDT',
      direction: 'Buy' as const,
      _score: 0.82,
      _grade: 'A' as const,
      spread_bps: 12,
      rr: 2.1,
      entry_price: 0.45,
      timeframe: '2h'
    }
  ];

  const runProfitOptimizationTest = async () => {
    setIsLoading(true);
    
    try {
      // Test 1: Signal Filtering
      console.log('🔬 Testing profit optimization filters...');
      const filteredSignals = filterProfitableSignals(mockSignals);
      
      // Test 2: Risk Management Calculation
      const riskTests = mockSignals.map(signal => ({
        signal: signal.token,
        ...calculateRiskPrices(signal.entry_price!, signal.direction)
      }));
      
      // Test 3: Trading Gateway Connection
      const connectionTest = await TradingGateway.testConnection();
      
      // Test 4: Small test order (if connection works)
      let tradeTest = null;
      if (connectionTest.ok && filteredSignals.length > 0) {
        const testSignal = filteredSignals[0];
        console.log('🚀 Testing small order execution...');
        tradeTest = await TradingGateway.execute({
          symbol: testSignal.token,
          side: testSignal.direction === 'Buy' ? 'BUY' : 'SELL',
          amountUSD: 10, // Minimum test size
          leverage: 1
        });
      }
      
      setTestResults({
        original: mockSignals.length,
        filtered: filteredSignals.length,
        filteredSignals,
        riskTests,
        connectionTest,
        tradeTest,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ Test failed:', error);
      setTestResults({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Profit Optimization Test Suite</h2>
          <p className="text-sm text-muted-foreground">
            Tests signal filtering, risk management, and trading execution
          </p>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={runProfitOptimizationTest}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? 'Running Tests...' : 'Run Profit Optimization Test'}
          </Button>
        </div>

        {testResults && (
          <div className="space-y-4">
            {testResults.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">Test Failed</p>
                <p className="text-red-600 text-sm">{testResults.error}</p>
              </div>
            ) : (
              <>
                {/* Signal Filtering Results */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Signal Filtering Results</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Original Signals: <b>{testResults.original}</b></div>
                    <div>Filtered Signals: <b>{testResults.filtered}</b></div>
                    <div>Filter Rate: <b>{Math.round((1 - testResults.filtered/testResults.original) * 100)}%</b></div>
                    <div>Quality Score: <b>{testResults.filtered > 0 ? 'PASS' : 'STRICT'}</b></div>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-xs font-medium text-blue-700 mb-2">Approved Signals:</p>
                    {testResults.filteredSignals.map((signal: any) => (
                      <div key={signal.id} className="flex items-center gap-2 text-xs">
                        <Badge variant="success">{signal._grade}</Badge>
                        <span>{signal.token}</span>
                        <span>{signal.direction}</span>
                        <span className="text-green-600">{(signal._score * 100).toFixed(0)}%</span>
                        <span className="text-blue-600">R:R {signal.rr}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Management Results */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Risk Management (2% SL / 4% TP)</h3>
                  <div className="space-y-2 text-xs">
                    {testResults.riskTests.map((test: any, i: number) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="font-medium">{test.signal}</span>
                        <div className="flex gap-4">
                          <span>Entry: ${test.entryPrice}</span>
                          <span className="text-red-600">SL: ${test.stopLoss.toFixed(4)}</span>
                          <span className="text-green-600">TP: ${test.takeProfit.toFixed(4)}</span>
                          <span className="text-blue-600">R:R {test.riskRewardRatio.toFixed(1)}:1</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connection Test */}
                <div className={`p-4 border rounded-lg ${testResults.connectionTest.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <h3 className={`font-medium mb-2 ${testResults.connectionTest.ok ? 'text-green-800' : 'text-red-800'}`}>
                    Trading Gateway Connection
                  </h3>
                  <p className="text-sm">
                    Status: <b>{testResults.connectionTest.ok ? 'CONNECTED' : 'FAILED'}</b>
                  </p>
                  {testResults.connectionTest.data && (
                    <pre className="text-xs mt-2 bg-gray-100 p-2 rounded">
                      {JSON.stringify(testResults.connectionTest.data, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Trade Test */}
                {testResults.tradeTest && (
                  <div className={`p-4 border rounded-lg ${testResults.tradeTest.ok ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                    <h3 className={`font-medium mb-2 ${testResults.tradeTest.ok ? 'text-green-800' : 'text-orange-800'}`}>
                      Live Trade Test ($10 minimum)
                    </h3>
                    <p className="text-sm">
                      Result: <b>{testResults.tradeTest.ok ? 'SUCCESS' : 'FAILED'}</b>
                    </p>
                    {testResults.tradeTest.message && (
                      <p className="text-xs mt-1 text-gray-600">{testResults.tradeTest.message}</p>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 text-center">
                  Test completed at {new Date(testResults.timestamp).toLocaleString()}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}