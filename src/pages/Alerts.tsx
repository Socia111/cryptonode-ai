import React from 'react';
import MainLayout from '../layouts/MainLayout';
import TelegramIntegration from '../components/TelegramIntegration';
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


        {/* Telegram Integration */}
        <TelegramIntegration />

      </div>
    </MainLayout>
  );
};

export default Alerts;