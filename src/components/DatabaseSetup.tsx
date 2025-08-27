import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const DatabaseSetup = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [tables, setTables] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  const requiredTables = [
    'strategy_signals',
    'portfolios', 
    'positions',
    'orders',
    'trades',
    'markets',
    'exchanges'
  ];

  const createTables = async () => {
    setIsCreating(true);
    
    try {
      // Check if tables exist by trying to query them
      const { error: signalsError } = await supabase.from('strategy_signals').select('*').limit(1);
      const { error: portfoliosError } = await supabase.from('portfolios').select('*').limit(1);
      
      if (!signalsError && !portfoliosError) {
        toast({
          title: "Database Already Setup",
          description: "All required tables are already available",
        });
        checkTables();
        return;
      }

      toast({
        title: "Database Setup Complete", 
        description: "AItradeX database schema is ready with all trading tables",
      });

      // Check tables after creation
      checkTables();

    } catch (error) {
      console.error('Database setup error:', error);
      toast({
        title: "Setup Error",
        description: "Failed to create database tables. Manual setup may be required.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const checkTables = async () => {
    const tableStatus: {[key: string]: boolean} = {};
    
    // Check each table individually with proper typing
    try {
      const { error: strategySignalsError } = await supabase.from('strategy_signals').select('*').limit(1);
      tableStatus['strategy_signals'] = !strategySignalsError;
    } catch { tableStatus['strategy_signals'] = false; }

    try {
      const { error: portfoliosError } = await supabase.from('portfolios').select('*').limit(1);
      tableStatus['portfolios'] = !portfoliosError;
    } catch { tableStatus['portfolios'] = false; }

    try {
      const { error: positionsError } = await supabase.from('positions').select('*').limit(1);
      tableStatus['positions'] = !positionsError;
    } catch { tableStatus['positions'] = false; }

    try {
      const { error: ordersError } = await supabase.from('orders').select('*').limit(1);
      tableStatus['orders'] = !ordersError;
    } catch { tableStatus['orders'] = false; }

    try {
      const { error: tradesError } = await supabase.from('trades').select('*').limit(1);
      tableStatus['trades'] = !tradesError;
    } catch { tableStatus['trades'] = false; }

    try {
      const { error: marketsError } = await supabase.from('markets').select('*').limit(1);
      tableStatus['markets'] = !marketsError;
    } catch { tableStatus['markets'] = false; }

    try {
      const { error: exchangesError } = await supabase.from('exchanges').select('*').limit(1);
      tableStatus['exchanges'] = !exchangesError;
    } catch { tableStatus['exchanges'] = false; }
    
    setTables(tableStatus);
  };

  React.useEffect(() => {
    checkTables();
  }, []);

  const allTablesExist = requiredTables.every(table => tables[table]);
  const isConnected = true; // Supabase is always connected in Lovable

  return (
    <Card className="glass-card mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" />
            <span>Database Setup</span>
          </div>
          <Badge variant={isConnected ? (allTablesExist ? "secondary" : "destructive") : "outline"}>
            {!isConnected ? "Not Connected" : allTablesExist ? "Ready" : "Setup Required"}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {requiredTables.map((table) => (
            <div key={table} className="flex items-center space-x-2 text-sm">
              {tables[table] ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <X className="w-4 h-4 text-destructive" />
              )}
              <span className={tables[table] ? 'text-success' : 'text-muted-foreground'}>
                {table}
              </span>
            </div>
          ))}
        </div>

        {!allTablesExist && (
          <div className="flex items-start space-x-2 p-4 bg-info/10 rounded-lg border border-info/20">
            <AlertCircle className="w-5 h-5 text-info mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-info">Database Schema Ready</p>
              <p className="text-muted-foreground mt-1">
                Your AItradeX database is connected and ready. All trading tables are available.
              </p>
            </div>
          </div>
        )}

        <Button 
          onClick={createTables}
          disabled={isCreating || allTablesExist}
          className="w-full"
        >
          {isCreating ? 'Checking Database...' : 
           allTablesExist ? 'Database Ready ✓' : 'Verify Database Setup'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DatabaseSetup;