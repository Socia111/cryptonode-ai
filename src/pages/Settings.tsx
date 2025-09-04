import React from 'react';
import MainLayout from '../layouts/MainLayout';
import DatabaseSetup from '../components/DatabaseSetup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Database, Key, Shield } from 'lucide-react';

const SettingsPage = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your trading system, API keys, and database connections
          </p>
        </div>


        {/* Database Setup */}
        <DatabaseSetup />

      </div>
    </MainLayout>
  );
};

export default SettingsPage;