import React from 'react';
import MainLayout from '../layouts/MainLayout';
import { LiveObservabilityDashboard } from '../components/LiveObservabilityDashboard';
import SystemStatusSummary from '../components/SystemStatusSummary';
import PerformancePanel from '../components/PerformancePanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, Target } from 'lucide-react';

const Dashboard = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Real-time system monitoring and performance overview
          </p>
        </div>

        {/* System Status */}
        <SystemStatusSummary />

        {/* Live Monitoring */}
        <LiveObservabilityDashboard />

        {/* Performance Overview */}
        <PerformancePanel />
      </div>
    </MainLayout>
  );
};

export default Dashboard;