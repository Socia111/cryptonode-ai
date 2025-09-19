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
    if (msg.includes('position mode') || msg.includes('position idx')) {
      return {
        type: 'Position Mode Error',
        suggestion: 'Check your Bybit account position mode settings. Try switching between One-Way and Hedge mode.',
        canRetry: true
      };
    }
    if (msg.includes('balance') || msg.includes('insufficient')) {
      return {
        type: 'Insufficient Balance',
        suggestion: 'Please check your Bybit account balance and ensure you have sufficient funds.',
        canRetry: false
      };
    }
    if (msg.includes('auth') || msg.includes('unauthorized')) {
      return {
        type: 'Authentication Error',
        suggestion: 'Please sign in to execute trades or check your API credentials.',
        canRetry: false
      };
    }
    return {
      type: 'Trading Error',
      suggestion: 'Please try again or contact support if the issue persists.',
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