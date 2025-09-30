import React from 'react';
import MainLayout from '../layouts/MainLayout';
import BybitTradingAuth from '../components/BybitTradingAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, Shield } from 'lucide-react';

const ConnectAPI = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Connect API
          </h1>
          <p className="text-muted-foreground">
            Connect your Bybit account to enable automated trading
          </p>
        </div>

        {/* Security Notice */}
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Security Notice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your API keys are encrypted and stored securely. We recommend using API keys with trading permissions only.
            </p>
          </CardContent>
        </Card>

        {/* API Connection Component */}
        <BybitTradingAuth />
      </div>
    </MainLayout>
  );
};

export default ConnectAPI;