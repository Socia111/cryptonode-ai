import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CCXTFeedStatus {
  isRunning: boolean;
  exchanges: string[];
  symbols: string[];
  updateInterval: number;
}

export function useLiveCCXTFeed() {
  const [status, setStatus] = useState<CCXTFeedStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize web worker for CCXT feed
    try {
      workerRef.current = new Worker(
        new URL('@/workers/liveCCXTWorker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event) => {
        const { type, data, error } = event.data;

        switch (type) {
          case 'STATUS':
            setStatus(data);
            break;
          case 'SUCCESS':
            setLoading(false);
            setError(null);
            break;
          case 'ERROR':
            setLoading(false);
            setError(error);
            console.error('CCXT Worker error:', error);
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        setError('Worker failed to initialize');
        console.error('Worker error:', error);
      };

      // Get initial status
      getStatus();

    } catch (err) {
      console.error('Failed to initialize CCXT worker:', err);
      setError('Failed to initialize CCXT worker');
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const sendWorkerMessage = (type: string, payload?: any) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type, payload });
    } else {
      setError('Worker not initialized');
    }
  };

  const startFeed = async () => {
    setLoading(true);
    sendWorkerMessage('START');
    
    toast({
      title: "🟢 Starting CCXT Feed",
      description: "Initializing live market data stream..."
    });
  };

  const stopFeed = async () => {
    setLoading(true);
    sendWorkerMessage('STOP');
    
    toast({
      title: "🔴 Stopping CCXT Feed",
      description: "Halting live market data stream..."
    });
  };

  const getStatus = () => {
    sendWorkerMessage('STATUS');
  };

  const triggerManualScan = () => {
    setLoading(true);
    sendWorkerMessage('MANUAL_SCAN');
    
    toast({
      title: "🔍 Manual Scan Triggered",
      description: "Forcing immediate market data collection..."
    });
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