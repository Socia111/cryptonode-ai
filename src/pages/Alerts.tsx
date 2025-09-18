import React from 'react';
import MainLayout from '../layouts/MainLayout';
// TelegramIntegration removed - unused component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, MessageCircle, Zap, Target } from 'lucide-react';

const Alerts = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Alert Management
          </h1>
          <p className="text-muted-foreground">
            Configure notifications and alerts for trading signals and market events
          </p>
        </div>

        {/* Alert Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Bell className="w-4 h-4 text-primary" />
                <span>Alerts Today</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">127</div>
              <p className="text-xs text-muted-foreground">Sent successfully</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <MessageCircle className="w-4 h-4 text-success" />
                <span>Telegram</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">Active</div>
              <p className="text-xs text-muted-foreground">Connected</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Zap className="w-4 h-4 text-warning" />
                <span>Signal Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-muted-foreground">High confidence</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                <Target className="w-4 h-4 text-accent" />
                <span>Trade Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">38</div>
              <p className="text-xs text-muted-foreground">Execution updates</p>
            </CardContent>
          </Card>
        </div>

        {/* Telegram Integration - Component removed */}
        <div className="text-center py-8 text-muted-foreground">
          <p>Telegram integration has been removed to simplify the interface.</p>
        </div>

        {/* Additional Alert Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-primary" />
              <span>Alert Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium">Signal Alerts</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">High confidence signals (90%+) 🔮</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Good signals (80-90%) ♥️</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">All signals (80%+)</span>
                  </label>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Trade Alerts</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Order executions</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Stop loss triggers</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Take profit hits</span>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Alerts;