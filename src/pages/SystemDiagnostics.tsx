import React from 'react';
import MainLayout from '@/layouts/MainLayout';
import SystemDiagnosticsReport from '@/components/SystemDiagnosticsReport';

export default function SystemDiagnostics() {
  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">System Diagnostics</h1>
          <p className="text-muted-foreground">
            Comprehensive system health analysis and component testing
          </p>
        </div>
        
        <SystemDiagnosticsReport />
      </div>
    </MainLayout>
  );
}