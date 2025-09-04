import React from 'react';
import MainLayout from '../layouts/MainLayout';
import TelegramIntegration from '../components/TelegramIntegration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Alerts = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Alerts & Notifications
          </h1>
          <p className="text-muted-foreground">
            Manage your trading alerts and notification preferences
          </p>
        </div>
        
        <TelegramIntegration />
        
        <Card>
          <CardHeader>
            <CardTitle>Alert Settings</CardTitle>
            <CardDescription>Configure your notification preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Alert configuration options coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Alerts;