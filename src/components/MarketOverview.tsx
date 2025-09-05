
import React from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const MarketOverview = () => {
  return (
    <div className="text-center py-8">
      <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Market data will be displayed here</p>
    </div>
  );

};

export default MarketOverview;
