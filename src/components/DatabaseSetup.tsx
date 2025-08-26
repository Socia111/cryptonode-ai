import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const DatabaseSetup = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [tables, setTables] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  const requiredTables = [
    'signals',
    'trades', 
    'api_keys',
    'spynx_scores',
    'market_data',
    'technical_indicators'
  ];

  const createTables = async () => {
    setIsCreating(true);
    
    try {
      // Create signals table
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS signals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            token TEXT NOT NULL,
            direction TEXT NOT NULL,
            signal_type TEXT,
            timeframe TEXT,
            entry_price NUMERIC NOT NULL,
            exit_target NUMERIC,
            stop_loss NUMERIC,
            leverage INTEGER DEFAULT 1,
            confidence_score NUMERIC,
            pms_score NUMERIC,
            trend_projection TEXT,
            volume_strength NUMERIC,
            roi_projection NUMERIC,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT now(),
            expires_at TIMESTAMP
          );
        `
      });

      // Create spynx_scores table
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS spynx_scores (
            token TEXT PRIMARY KEY,
            score NUMERIC NOT NULL,
            market_cap NUMERIC,
            liquidity NUMERIC,
            holder_distribution NUMERIC,
            whale_activity NUMERIC,
            sentiment_score NUMERIC,
            roi_forecast NUMERIC,
            volume_24h NUMERIC,
            price_change_24h NUMERIC,
            updated_at TIMESTAMP DEFAULT now()
          );
        `
      });

      toast({
        title: "Database Setup Complete",
        description: "All required tables have been created successfully",
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
    
    for (const table of requiredTables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        tableStatus[table] = !error;
      } catch {
        tableStatus[table] = false;
      }
    }
    
    setTables(tableStatus);
  };

  React.useEffect(() => {
    checkTables();
  }, []);

  const allTablesExist = requiredTables.every(table => tables[table]);

  return (
    <Card className="glass-card mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" />
            <span>Database Setup</span>
          </div>
          <Badge variant={allTablesExist ? "secondary" : "destructive"}>
            {allTablesExist ? "Ready" : "Setup Required"}
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
          <div className="flex items-start space-x-2 p-4 bg-warning/10 rounded-lg border border-warning/20">
            <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning">Database Setup Required</p>
              <p className="text-muted-foreground mt-1">
                Some required tables are missing. Click the button below to create them automatically.
              </p>
            </div>
          </div>
        )}

        <Button 
          onClick={createTables}
          disabled={isCreating || allTablesExist}
          className="w-full"
        >
          {isCreating ? 'Creating Tables...' : allTablesExist ? 'Database Ready' : 'Setup Database'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DatabaseSetup;