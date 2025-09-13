import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TradingGateway } from '@/lib/tradingGateway';
import { toast } from 'sonner';

export const TPSLTestPanel = () => {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testParams, setTestParams] = useState({
    symbol: 'BTCUSDT',
    side: 'Buy' as 'Buy' | 'Sell',
    amountUSD: 25,
    leverage: 10,
    uiEntry: 45000,
    uiTP: 46000,
    uiSL: 44000
  });

  const runTPSLTest = async () => {
    setIsTestRunning(true);
    
    try {
      console.log('🧪 Testing TP/SL attachment:', testParams);
      
      const result = await TradingGateway.execute({
        ...testParams,
        orderType: 'Market', // Test with market order first
        scalpMode: false
      });
      
      console.log('✅ TP/SL Test Result:', result);
      
      if (result.ok) {
        toast.success('✅ TP/SL Test Passed - Order placed with TP/SL attached');
      } else {
        toast.error(`❌ TP/SL Test Failed: ${result.message || 'Unknown error'}`);
      }
      
    } catch (error: any) {
      console.error('❌ TP/SL Test Error:', error);
      toast.error(`Test Error: ${error.message}`);
    } finally {
      setIsTestRunning(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-4">TP/SL Implementation Test</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor="symbol">Symbol</Label>
          <Input
            id="symbol"
            value={testParams.symbol}
            onChange={(e) => setTestParams({...testParams, symbol: e.target.value})}
          />
        </div>
        
        <div>
          <Label htmlFor="side">Side</Label>
          <select
            id="side"
            value={testParams.side}
            onChange={(e) => setTestParams({...testParams, side: e.target.value as 'Buy' | 'Sell'})}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="Buy">Buy (Long)</option>
            <option value="Sell">Sell (Short)</option>
          </select>
        </div>
        
        <div>
          <Label htmlFor="entry">Entry Price</Label>
          <Input
            id="entry"
            type="number"
            value={testParams.uiEntry}
            onChange={(e) => setTestParams({...testParams, uiEntry: Number(e.target.value)})}
          />
        </div>
        
        <div>
          <Label htmlFor="tp">Take Profit</Label>
          <Input
            id="tp"
            type="number"
            value={testParams.uiTP}
            onChange={(e) => setTestParams({...testParams, uiTP: Number(e.target.value)})}
          />
        </div>
        
        <div>
          <Label htmlFor="sl">Stop Loss</Label>
          <Input
            id="sl"
            type="number"
            value={testParams.uiSL}
            onChange={(e) => setTestParams({...testParams, uiSL: Number(e.target.value)})}
          />
        </div>
        
        <div>
          <Label htmlFor="amount">Amount USD</Label>
          <Input
            id="amount"
            type="number"
            value={testParams.amountUSD}
            onChange={(e) => setTestParams({...testParams, amountUSD: Number(e.target.value)})}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <strong>Directional Check:</strong>
          {testParams.side === 'Buy' 
            ? ` TP (${testParams.uiTP}) > Entry (${testParams.uiEntry}): ${testParams.uiTP > testParams.uiEntry ? '✅' : '❌'}, SL (${testParams.uiSL}) < Entry: ${testParams.uiSL < testParams.uiEntry ? '✅' : '❌'}`
            : ` TP (${testParams.uiTP}) < Entry (${testParams.uiEntry}): ${testParams.uiTP < testParams.uiEntry ? '✅' : '❌'}, SL (${testParams.uiSL}) > Entry: ${testParams.uiSL > testParams.uiEntry ? '✅' : '❌'}`
          }
        </div>
        
        <Button 
          onClick={runTPSLTest}
          disabled={isTestRunning}
          className="w-full"
        >
          {isTestRunning ? 'Testing...' : 'Test TP/SL Implementation'}
        </Button>
      </div>
    </div>
  );
};