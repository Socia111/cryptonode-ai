import React from 'react';
import MainLayout from '../layouts/MainLayout';
import MarketOverview from '../components/MarketOverview';
import SignalsList from '../components/SignalsList';
import TradingChart from '../components/TradingChart';
import PortfolioStats from '../components/PortfolioStats';
import SpynxScoreCard from '../components/SpynxScoreCard';
import UnireliScannerChart from '../components/UnireliScannerChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Target, Settings } from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';
import { useRankedSignals } from '@/hooks/useRankedSignals';

const AItradeX1Original = () => {
  // Initialize API connection for live data
  const { signals, loading } = useSignals();
  
  // Apply Innovation Zone filtering and other signal filters
  const rankedSignals = useRankedSignals(signals, {
    hideWideSpreads: true,
    excludeInnovationZone: true,
    hide1MinSignals: true
  });
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header Section */}
        <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-2xl">
              <Zap className="h-8 w-8 text-primary" />
              <span>Unireli ORIGINAL - Canonical Implementation</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                v1.0 SPEC
              </Badge>
            </CardTitle>
            <div className="text-muted-foreground space-y-2">
              <p className="text-lg">Pure canonical Unireli algorithm with exact original formulas and criteria</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-green-500" />
                  <span><strong>8-Factor Scoring:</strong> 12.5pts each bucket</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-blue-500" />
                  <span><strong>Exact Indicators:</strong> EMA21, SMA200, ADX, HVP</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-purple-500" />
                  <span><strong>Risk Model:</strong> ATR-based SL/TP with HVP scaling</span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
        
        {/* AItradeX1 Scanner Chart */}
        <UnireliScannerChart />
        
        {/* Market Overview */}
        <MarketOverview />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Trading Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Components removed for simplification */}
            <div className="text-center py-8 text-muted-foreground">
              <p>Some components have been removed to simplify the interface.</p>
            </div>
          </div>
          
          {/* Signals Panel */}
          <div className="space-y-6">
            {/* Components removed for simplification */}
            <div className="text-center py-8 text-muted-foreground">
              <p>Some components have been removed to simplify the interface.</p>
            </div>
            <SignalsList />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AItradeX1Original;