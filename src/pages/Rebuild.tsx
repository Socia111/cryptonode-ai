import { useEffect } from 'react';
import { RebuildConsole } from '@/components/RebuildConsole';
import MainLayout from '@/layouts/MainLayout';

export default function Rebuild() {
  useEffect(() => {
    // Auto-trigger rebuild on page load if coming from rebuild command
    const urlParams = new URLSearchParams(window.location.search);
    const shouldRebuild = urlParams.get('rebuild') === 'true';
    
    if (shouldRebuild) {
      console.log('🚀 Auto-triggering rebuild process...');
      // The RebuildConsole component will handle the auto-trigger via useEffect
    }
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text">
            AItradeX1 System Rebuild
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive system analysis, validation, and automated error fixing
          </p>
        </div>
        
        <RebuildConsole />
      </div>
    </MainLayout>
  );
}