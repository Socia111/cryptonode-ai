import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useSignals } from '@/hooks/useSignals';
import { TrendingUp, TrendingDown, RefreshCw, Activity, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GlobalSignalsPanelProps {
  compact?: boolean;
  showTrigger?: boolean;
}

const GlobalSignalsPanel: React.FC<GlobalSignalsPanelProps> = ({ 
  compact = false, 
  showTrigger = true 
}) => {
  const { signals, loading, generateSignals } = useSignals();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const topSignals = signals.slice(0, compact ? 3 : 8);

  const formatPrice = (price: number) => {
    if (price < 1) return price.toFixed(6);
    if (price < 100) return price.toFixed(4);
    return price.toFixed(2);
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    return `${Math.floor(diffMins / 60)}h`;
  };

  const SignalsList = () => (
    <div className="space-y-3">
      {topSignals.map((signal) => (
        <Card key={signal.id} className="border border-border/50 hover:border-primary/20 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{signal.token}</span>
                    <Badge variant={signal.direction === 'BUY' ? 'default' : 'destructive'} className="text-xs">
                      {signal.direction === 'BUY' ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {signal.direction}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {signal.timeframe}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Entry: ${formatPrice(signal.entry_price)}
                    {signal.exit_target && (
                      <span className="ml-2">Target: ${formatPrice(signal.exit_target)}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge 
                  variant={signal.confidence_score >= 90 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {signal.confidence_score.toFixed(1)}%
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatTime(signal.created_at)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const handleGenerateSignals = async () => {
    try {
      await generateSignals();
      toast({
        title: "✅ Signals Generated",
        description: "New trading signals have been generated"
      });
    } catch (error) {
      toast({
        title: "❌ Generation Failed", 
        description: "Failed to generate signals",
        variant: "destructive"
      });
    }
  };

  if (compact) {
    return (
      <Card className="border border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Live Signals
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {signals.length} active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground">Loading...</div>
          ) : topSignals.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground">No signals</div>
          ) : (
            <SignalsList />
          )}
        </CardContent>
      </Card>
    );
  }

  if (!showTrigger) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Live Trading Signals
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {signals.length} active
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateSignals}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Generate
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading signals...</p>
            </div>
          ) : signals.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active signals</p>
              <Button variant="outline" size="sm" onClick={handleGenerateSignals} className="mt-2">
                Generate Signals
              </Button>
            </div>
          ) : (
            <SignalsList />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="fixed bottom-4 right-4 z-50 lg:bottom-6 lg:right-6">
          <Activity className="w-4 h-4 mr-2" />
          Signals ({signals.length})
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-96 sm:w-[500px]">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Live Trading Signals</h2>
              <p className="text-sm text-muted-foreground">High-confidence trading opportunities</p>
            </div>
            <Badge variant="outline">{signals.length} active</Badge>
          </div>
          
          <div className="flex gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateSignals}
              disabled={loading}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading signals...</p>
              </div>
            ) : signals.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active signals</p>
                <Button variant="outline" size="sm" onClick={handleGenerateSignals} className="mt-2">
                  Generate Signals
                </Button>
              </div>
            ) : (
              <SignalsList />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GlobalSignalsPanel;