
import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import TradingDashboard from '../components/TradingDashboard';
import { TradingTest } from '@/components/TradingTest';
import { BalanceChecker } from '@/components/BalanceChecker';
import { RebuildTrigger } from '@/components/RebuildTrigger';

const Index = () => {
  const [showRebuild, setShowRebuild] = useState(false);

  useEffect(() => {
    // Check for /rebuild command
    const checkRebuildCommand = () => {
      const urlPath = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      const hashPath = window.location.hash;
      
      // Check for various /rebuild patterns
      if (urlPath === '/rebuild' || 
          urlParams.get('rebuild') === 'true' || 
          hashPath === '#rebuild' ||
          localStorage.getItem('rebuildCommand') === 'true') {
        console.log('🚀 /rebuild command detected - triggering GitHub restore...');
        setShowRebuild(true);
        return true;
      }
      
      // Check for /rebuild in the current URL or as a command
      if (window.location.href.includes('/rebuild')) {
        console.log('🚀 /rebuild URL detected - triggering GitHub restore...');
        setShowRebuild(true);
        return true;
      }

      return false;
    };

    // Immediate check
    checkRebuildCommand();

    // Listen for hash changes or storage events
    const handleHashChange = () => checkRebuildCommand();
    const handleStorageChange = () => checkRebuildCommand();
    
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Show rebuild interface if triggered
  if (showRebuild) {
    return <RebuildTrigger />;
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Balance Information */}
        <div className="mb-6">
          <BalanceChecker />
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <TradingDashboard />
          </div>
          <div className="lg:w-96">
            <TradingTest />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
