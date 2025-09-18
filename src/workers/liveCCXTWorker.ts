/**
 * Web Worker for CCXT Live Feed
 * Runs CCXT data collection in background without blocking UI
 */

import { liveCCXTFeed } from '@/lib/liveCCXTFeed';

// Web Worker message types
interface WorkerMessage {
  type: 'START' | 'STOP' | 'STATUS' | 'MANUAL_SCAN';
  payload?: any;
}

interface WorkerResponse {
  type: 'STATUS' | 'ERROR' | 'SUCCESS';
  data?: any;
  error?: string;
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'START':
        await liveCCXTFeed.start();
        postResponse({
          type: 'SUCCESS',
          data: { message: 'CCXT feed started successfully' }
        });
        break;

      case 'STOP':
        await liveCCXTFeed.stop();
        postResponse({
          type: 'SUCCESS',
          data: { message: 'CCXT feed stopped successfully' }
        });
        break;

      case 'STATUS':
        const status = liveCCXTFeed.getStatus();
        postResponse({
          type: 'STATUS',
          data: status
        });
        break;

      case 'MANUAL_SCAN':
        // Trigger manual scan
        await liveCCXTFeed.start();
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        postResponse({
          type: 'SUCCESS',
          data: { message: 'Manual scan completed' }
        });
        break;

      default:
        postResponse({
          type: 'ERROR',
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    postResponse({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};

function postResponse(response: WorkerResponse) {
  self.postMessage(response);
}

// Handle worker errors
self.onerror = (error) => {
  postResponse({
    type: 'ERROR',
    error: `Worker error: ${error instanceof ErrorEvent ? error.message : 'Unknown error'}`
  });
};

// Initialize worker
console.log('🚀 CCXT Worker initialized and ready');
postResponse({
  type: 'SUCCESS',
  data: { message: 'CCXT Worker ready' }
});