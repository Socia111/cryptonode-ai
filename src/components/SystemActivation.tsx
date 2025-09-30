import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Zap,
  Database,
  Bot,
  TrendingUp
} from 'lucide-react';
import { systemTester, SystemTestResult } from '@/lib/systemTest';
import { useToast } from '@/hooks/use-toast';

const SystemActivation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SystemTestResult[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleActivation = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const testResults = await systemTester.runAllTests();
      
      clearInterval(progressInterval);
      setProgress(100);
      setResults(testResults);

      const passCount = testResults.filter(r => r.status === 'pass').length;
      const totalCount = testResults.length;

      if (passCount === totalCount) {
        toast({
          title: "System Activated Successfully",
          description: `All ${totalCount} components are operational`,
        });
      } else {
        toast({
          title: "System Activation Complete",
          description: `${passCount}/${totalCount} components operational`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Activation Failed",
        description: "Failed to activate system components",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'fail':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'Database':
        return <Database className="h-4 w-4" />;
      case 'Signal Generation':
        return <Bot className="h-4 w-4" />;
      case 'Trading Status':
        return <TrendingUp className="h-4 w-4" />;
      case 'Scheduler':
        return <Zap className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          AItradeX1 System Activation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <Button 
            onClick={handleActivation}
            disabled={isRunning}
            size="lg"
            className="w-full max-w-xs"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating System...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Activate Trading System
              </>
            )}
          </Button>
        </div>

        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>System Activation Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">System Status Report</h3>
            {results.map((result, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {getComponentIcon(result.component)}
                  <div>
                    <div className="font-medium">{result.component}</div>
                    <div className="text-sm text-muted-foreground">{result.message}</div>
                  </div>
                </div>
                <Badge className={getStatusColor(result.status)}>
                  {getStatusIcon(result.status)}
                  <span className="ml-1 capitalize">{result.status}</span>
                </Badge>
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && !isRunning && (
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              System activation completed at {new Date().toLocaleTimeString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemActivation;