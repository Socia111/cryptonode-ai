import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

const requiredTables = [
  'strategy_signals', 'portfolios', 'positions', 'orders', 'trades', 'markets', 'exchanges'
];

const DatabaseSetup = () => {
  const [connected, setConnected] = useState<boolean>(false);
  const [tables, setTables] = useState<Record<string, boolean>>({});
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const ok = await isSupabaseConfigured();
      console.info('[DatabaseSetup] Supabase configured:', ok);
      setConnected(ok);
      if (ok) await checkTables();
    })();
  }, []);

  const checkTables = async () => {
    setIsChecking(true);
    const status: Record<string, boolean> = {};
    
    for (const tableName of requiredTables) {
      try {
        const { error } = await supabase.from(tableName).select('*').limit(1);
        status[tableName] = !error;
        if (error) {
          console.warn(`[DatabaseSetup] Table ${tableName} check failed:`, error.message);
        }
      } catch (e) {
        console.warn(`[DatabaseSetup] Table ${tableName} threw:`, e);
        status[tableName] = false;
      }
    }
    
    setTables(status);
    setIsChecking(false);
  };

  const tablesReady = Object.values(tables).filter(exists => exists).length;
  const allTablesExist = tablesReady === requiredTables.length;

  const handleVerifySetup = async () => {
    if (!connected) {
      toast({
        title: "Supabase Not Connected",
        description: "Please check your environment variables and connection.",
        variant: "destructive"
      });
      return;
    }
    
    await checkTables();
    
    if (allTablesExist) {
      toast({
        title: "Database Ready",
        description: "All required tables are accessible."
      });
    } else {
      toast({
        title: "Setup Required", 
        description: "Some tables are missing or inaccessible.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" />
            <span>Database Setup</span>
          </div>
          <Badge variant={connected ? (allTablesExist ? "default" : "secondary") : "destructive"}>
            {connected ? (allTablesExist ? 'Ready' : 'Setup Required') : 'Not Connected'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{connected ? 'Online' : 'Offline'}</div>
            <div className="text-sm text-muted-foreground">Connection</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{tablesReady}/{requiredTables.length}</div>
            <div className="text-sm text-muted-foreground">Tables Ready</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {requiredTables.map((table) => (
            <div key={table} className="flex items-center space-x-2 p-2 rounded bg-muted/20">
              {tables[table] ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
              <span className={`text-sm ${tables[table] ? 'text-success' : 'text-muted-foreground'}`}>
                {table}
              </span>
            </div>
          ))}
        </div>

        <Button 
          onClick={handleVerifySetup} 
          className="w-full mb-4"
          disabled={isChecking}
        >
          <Database className="mr-2 h-4 w-4" />
          {isChecking ? 'Checking...' : allTablesExist ? 'Database Ready ✓' : 'Verify Database Setup'}
        </Button>

        {!allTablesExist && connected && (
          <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">Setup Required</p>
                <p className="text-muted-foreground mt-1">
                  Some database tables are missing. Run the database migration to create required tables.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DatabaseSetup;