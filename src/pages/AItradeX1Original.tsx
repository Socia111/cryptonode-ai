import React from 'react';
import MainLayout from '../layouts/MainLayout';
import MarketOverview from '../components/MarketOverview';
import SignalsList from '../components/SignalsList';
import TradingChart from '../components/TradingChart';
import PortfolioStats from '../components/PortfolioStats';
import DatabaseSetup from '../components/DatabaseSetup';
import SpynxScoreCard from '../components/SpynxScoreCard';
import TelegramIntegration from '../components/TelegramIntegration';
import TradingPanel from '../components/TradingPanel';
import BacktestEngine from '../components/BacktestEngine';
import QuantumAnalysis from '../components/QuantumAnalysis';
import ScannerDashboard from '../components/ScannerDashboard';
import AItradeX1ScannerChart from '../components/AItradeX1ScannerChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Target, Settings, TrendingUp, Activity, Brain, BarChart3, Clock } from 'lucide-react';

const AItradeX1Original = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header Section */}
        <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-2xl">
              <Brain className="h-8 w-8 text-primary" />
              <span>AItradeX1 - AI-Powered Cryptocurrency Trading Assistant</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                v1.0 ORIGINAL
              </Badge>
            </CardTitle>
            <div className="text-muted-foreground space-y-4">
              <p className="text-lg">
                Your AI-powered cryptocurrency trading assistant - a framework + algorithm designed to analyze crypto markets in real time and generate short- to medium-term trading signals with high accuracy.
              </p>
              <p className="text-base">
                Think of it as a crypto trading AI bot + signal generator, built on top of advanced technical analysis, machine learning, and automation.
              </p>
            </div>
          </CardHeader>
        </Card>

        {/* Core Functions Section */}
        <Card className="border-secondary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-xl">
              <Activity className="h-6 w-6 text-secondary" />
              <span>Core Functions of AItradeX1</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Technical Indicator Engine */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-3">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">1. Technical Indicator Engine</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• EMA/SMA crossovers for trend direction</li>
                  <li>• ADX/DMI for trend strength</li>
                  <li>• Stochastic Oscillator for overbought/oversold zones</li>
                  <li>• Volume (21-period) for breakout validation</li>
                  <li>• Historical Volatility Percentile (HVP) for volatility confirmation</li>
                </ul>
              </div>

              {/* Signal Generation */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold text-lg">2. Signal Generation (Spynx Scores™)</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Combines all indicators into Price Momentum Score (PMS)</li>
                  <li>• PMS thresholds trigger 📈 Buy / 📉 Sell / ❕ Hold signals</li>
                  <li>• Outputs Entry, Stop Loss, Take Profit, Confidence Score</li>
                </ul>
              </div>

              {/* Automation */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold text-lg">3. Automation</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Monitors AIXlist coins and market every 5–60 mins</li>
                  <li>• Runs 24/7 in background</li>
                  <li>• Instantly pushes alerts + signals with trade details</li>
                </ul>
              </div>

              {/* AI Learning */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-3">
                  <Brain className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold text-lg">4. AI Learning & Optimization</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Continuously adjusts indicator weights based on past trade success</li>
                  <li>• Prioritizes most reliable indicators over time</li>
                  <li>• Learns from market conditions to improve accuracy</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Workflow Section */}
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-xl">
              <Target className="h-6 w-6 text-accent" />
              <span>Example AItradeX1 Workflow</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-base">Signal Detection Process:</h4>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li>1. AItradeX1 scans BTC/ETH/altcoin markets</li>
                    <li>2. Detects 21 EMA crossing above 200 EMA (Golden Cross)</li>
                    <li>3. Confirms volume spike + ADX &gt; 25 = strong trend</li>
                    <li>4. Stochastic shows oversold bounce</li>
                    <li>5. HVP shows high volatility</li>
                    <li>6. Spynx Score (PMS) = +0.85 → 📈 Buy Signal</li>
                  </ol>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-base">Signal Output:</h4>
                  <div className="bg-accent/10 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Entry:</span>
                      <span className="text-sm font-medium">$25,300</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Stop Loss:</span>
                      <span className="text-sm font-medium text-red-500">$24,800</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Take Profit:</span>
                      <span className="text-sm font-medium text-green-500">$26,500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Confidence:</span>
                      <span className="text-sm font-bold text-primary">88%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Database Setup */}
        <DatabaseSetup />
        
        {/* AItradeX1 Scanner Chart */}
        <AItradeX1ScannerChart />
        
        {/* AItradeX1 Scanner Dashboard */}
        <ScannerDashboard />
        
        {/* Market Overview */}
        <MarketOverview />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Trading Chart */}
          <div className="lg:col-span-2 space-y-6">
            <TradingChart />
            <BacktestEngine />
          </div>
          
          {/* Signals Panel */}
          <div className="space-y-6">
            <PortfolioStats />
            <TradingPanel />
            <TelegramIntegration />
            <QuantumAnalysis />
            <SpynxScoreCard />
            <SignalsList />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AItradeX1Original;