import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { liveCCXTFeed, type CCXTFeedStatus } from '@/lib/liveCCXTFeed';

export function useLiveCCXTFeed() {
  const [status, setStatus] = useState<CCXTFeedStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial status
    getStatus();

    // Check status every 30 seconds
    const interval = setInterval(getStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const startFeed = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await liveCCXTFeed.start();
      
      toast({
        title: "🟢 CCXT Feed Started",
        description: "Live market data streaming with AITRADEX1 algorithm"
      });

      await getStatus();
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "❌ Failed to Start",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const stopFeed = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await liveCCXTFeed.stop();
      
      toast({
        title: "🔴 CCXT Feed Stopped",
        description: "Live market data stream halted"
      });

      await getStatus();
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "❌ Failed to Stop",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatus = async () => {
    try {
      const currentStatus = await liveCCXTFeed.getStatus();
      setStatus(currentStatus);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const triggerManualScan = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await liveCCXTFeed.triggerManualScan();
      
      toast({
        title: "🔍 Manual Scan Complete",
        description: "AITRADEX1 analysis triggered successfully"
      });

      await getStatus();
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "❌ Scan Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    status,
    loading,
    error,
    startFeed,
    stopFeed,
    getStatus,
    triggerManualScan,
    isRunning: status?.isRunning || false
  };
}