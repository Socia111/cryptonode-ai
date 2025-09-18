import React from 'react';
import MainLayout from '../layouts/MainLayout';
import TradingPanel from '../components/TradingPanel';
import TradingChart from '../components/TradingChart';
import { SignalFeed } from '@/components/SignalFeed';
import { TradingFixTest } from '@/components/TradingFixTest';
import { TradingTest } from '@/components/TradingTest';
import { TradeExecutionTest } from '@/components/TradeExecutionTest';
import { useSignals } from '@/hooks/useSignals';
import { useRealTimeSignals } from '@/hooks/useRealTimeSignals';
import LiveSignalsPanel from '@/components/LiveSignalsPanel';
import LivePrice from '../components/LivePrice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Zap, Target } from 'lucide-react';

const Trade = () => {
  const { signals, loading } = useSignals();
  const { signals: realTimeSignals, loading: rtLoading, stats } = useRealTimeSignals({ minScore: 70 });

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Live Trading
          </h1>
          <p className="text-muted-foreground">
            Execute trades with AI-powered signals and real-time market analysis
          </p>
        </div>

        {/* Live Price Ticker */}
        <LivePrice />

        {/* Main Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading Chart - Takes up 2 columns */}
          <div className="lg:col-span-2">
            <TradingChart />
          </div>

          {/* Trading Panel */}
          <div>
            <TradingPanel />
          </div>
        </div>

        {/* Trading Tabs */}
        <Tabs defaultValue="signals" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="signals">🎯 Live Signals ({stats.totalSignals})</TabsTrigger>
            <TabsTrigger value="test">🔧 System Test</TabsTrigger>
            <TabsTrigger value="trading-test">🧪 Trading Test</TabsTrigger>
            <TabsTrigger value="execution-test">⚡ Live Test</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signals" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Real-Time Signals Feed */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Real-Time Trading Signals
                </h3>
                {rtLoading ? (
                  <div className="py-10 text-center opacity-70">Loading real-time signals…</div>
                ) : (
                  <SignalFeed signals={realTimeSignals as any} />
                )}
              </div>
              
              {/* Live Trading Panel */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Live Trading Signals
                </h3>
                <LiveSignalsPanel onExecuteTrade={async (signal) => {
                  console.log('Executing trade for signal:', signal);
                  // TODO: Implement trade execution
                }} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="test" className="mt-6">
            <TradingFixTest />
          </TabsContent>
          
          <TabsContent value="trading-test" className="mt-6">
            <TradingTest />
          </TabsContent>
          
          <TabsContent value="execution-test" className="mt-6">
            <TradeExecutionTest />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Trade;