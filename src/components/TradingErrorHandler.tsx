import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface TradingErrorHandlerProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const TradingErrorHandler: React.FC<TradingErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss
}) => {
  if (!error) return null;

  const getErrorType = (errorMessage: string) => {
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes('position mode') || msg.includes('position idx') || msg.includes('switch between one-way and hedge')) {
      return {
        type: 'Position Mode Error',
        suggestion: 'Your Bybit account position mode needs adjustment. Go to Bybit → Trading → Position Mode and try switching between "One-Way Mode" and "Hedge Mode". The system will automatically retry with different configurations.',
        canRetry: true
      };
    }
    
    if (msg.includes('balance') || msg.includes('insufficient') || msg.includes('margin')) {
      return {
        type: 'Insufficient Balance',
        suggestion: 'Please check your Bybit account balance and ensure you have sufficient funds for this trade size.',
        canRetry: false
      };
    }
    
    if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('sign in')) {
      return {
        type: 'Authentication Error',
        suggestion: 'Please sign in to execute trades or check your Bybit API credentials in settings.',
        canRetry: false
      };
    }
    
    if (msg.includes('qty') || msg.includes('quantity') || msg.includes('lot')) {
      return {
        type: 'Order Size Error',
        suggestion: 'The order size is outside Bybit limits. Try adjusting the trade amount.',
        canRetry: true
      };
    }
    
    if (msg.includes('symbol') || msg.includes('not found')) {
      return {
        type: 'Symbol Error',
        suggestion: 'The trading symbol is not available or not supported on Bybit.',
        canRetry: false
      };
    }
    
    return {
      type: 'Trading Error',
      suggestion: 'An unexpected error occurred. The system has multiple retry mechanisms - please try again.',
      canRetry: true
    };
  };

  const errorInfo = getErrorType(error);

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{errorInfo.type}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{error}</p>
        <p className="text-sm text-muted-foreground mb-3">{errorInfo.suggestion}</p>
        <div className="flex gap-2">
          {errorInfo.canRetry && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};