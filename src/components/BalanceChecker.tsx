import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export function BalanceChecker() {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = React.useState(false);
  const [balance, setBalance] = React.useState<any>(null);

  const checkBalance = async () => {
    setIsChecking(true);
    try {
      // Check account balance via trading gateway
      const response = await fetch('/api/v1/trading/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBalance(data);
        toast({
          title: 'Balance Check',
          description: `Available: $${data.availableBalance || 'N/A'}`
        });
      } else {
        throw new Error('Balance check failed');
      }
    } catch (error: any) {
      toast({
        title: 'Balance Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button 
        onClick={checkBalance} 
        disabled={isChecking}
        variant="outline"
        size="sm"
      >
        {isChecking ? 'Checking...' : '💰 Check Balance'}
      </Button>
      
      {balance && (
        <div className="text-xs bg-muted p-2 rounded">
          <div>Available: ${balance.availableBalance}</div>
          <div>Total: ${balance.totalBalance}</div>
          {balance.availableBalance < 10 && (
            <div className="text-destructive mt-1">
              ⚠️ Low balance - minimum $10 recommended for trading
            </div>
          )}
        </div>
      )}
    </div>
  );
}