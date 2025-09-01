
import React from 'react';
import { Activity, TrendingUp, Zap } from 'lucide-react';
import LivePrice from '@/components/LivePrice';

const TradingHeader = () => {
  return (
    <header className="glass-card border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src="/src/assets/unireli-icon.png" 
                alt="Unireli Logo" 
                className="w-10 h-10 rounded-lg glow-primary"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-chart-neutral bg-clip-text text-transparent">
                Unireli
              </h1>
              <p className="text-xs text-muted-foreground">AI-Powered Trading</p>
            </div>
          </div>

          {/* Live Price Display */}
          <div className="flex items-center space-x-6">
            <LivePrice />
            
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full pulse-glow"></div>
              <span className="text-sm text-muted-foreground">Live WebSocket</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm trading-mono">Multi-Exchange</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TradingHeader;
