import React from 'react';
import MainLayout from '../layouts/MainLayout';
import TradingPanel from '../components/TradingPanel';
import TradingChart from '../components/TradingChart';
import { SignalFeed } from '@/components/SignalFeed';
import { TradingFixTest } from '@/components/TradingFixTest';
import { TradingTest } from '@/components/TradingTest';
import { TradeExecutionTest } from '@/components/TradeExecutionTest';
import { TradeTestPanel } from '@/components/TradeTestPanel';
import { SystemStatusPanel } from '@/components/SystemStatusPanel';
import { useSignals } from '@/hooks/useSignals';
import LivePrice from '../components/LivePrice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Zap, Target } from 'lucide-react';

const Trade = () => {
  const { signals, loading } = useSignals();

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
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="status">📊 Status</TabsTrigger>
            <TabsTrigger value="signals">🎯 Signals</TabsTrigger>
            <TabsTrigger value="test">🔧 Test</TabsTrigger>
            <TabsTrigger value="trading-test">🧪 Trading</TabsTrigger>
            <TabsTrigger value="execution-test">⚡ Live</TabsTrigger>
            <TabsTrigger value="pipeline-test">🔄 Pipeline</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="mt-6">
            <SystemStatusPanel />
          </TabsContent>
          
          <TabsContent value="signals" className="mt-6">
            {loading ? (
              <div className="py-10 text-center opacity-70">Loading…</div>
            ) : (
              <SignalFeed signals={signals as any} />
            )}
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
          
          <TabsContent value="pipeline-test" className="mt-6">
            <TradeTestPanel />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Trade;