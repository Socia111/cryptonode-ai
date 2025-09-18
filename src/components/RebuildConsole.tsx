import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGitHubRebuild } from '@/hooks/useGitHubRebuild';
import { useSystemRestart } from '@/hooks/useSystemRestart';
import { 
  Play, 
  Square, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Database,
  Server,
  Code,
  Settings,
  FileText,
  Monitor,
  GitBranch,
  Github,
  ExternalLink,
  Loader2
} from 'lucide-react';

export function RebuildConsole() {
  const { 
    status, 
    executeGitHubRebuild, 
    getRepositoryInfo,
    repositoryUrl
  } = useGitHubRebuild();

  const {
    isRestarting,
    executeSystemRestart,
    checkSystemHealth
  } = useSystemRestart();
  
  const [repositoryInfo, setRepositoryInfo] = useState(getRepositoryInfo());

  useEffect(() => {
    // Check for /rebuild command in URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const rebuildCommand = urlParams.get('rebuild') || localStorage.getItem('rebuildCommand');
    
    if (rebuildCommand === 'true') {
      executeGitHubRebuild();
      localStorage.removeItem('rebuildCommand');
    }
  }, [executeGitHubRebuild]);

  const handleRebuild = () => {
    executeGitHubRebuild();
  };

  const handleOpenRepository = () => {
    window.open(repositoryUrl, '_blank');
  };

  const progressPercentage = status.totalSteps > 0 ? (status.currentStep / status.totalSteps) * 100 : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            GitHub-Powered System Rebuild
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            Complete system restoration from 
            <a 
              href={repositoryUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              <Github className="h-4 w-4" />
              cryptonode-ai repository
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={executeGitHubRebuild}
              disabled={status.isRebuilding}
              className="flex items-center gap-2"
            >
              {status.isRebuilding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rebuilding... ({status.currentStep}/{status.totalSteps})
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4" />
                  Start GitHub Rebuild
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={executeSystemRestart}
              disabled={isRestarting}
              className="flex items-center gap-2"
            >
              {isRestarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restarting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Quick System Restart
                </>
              )}
            </Button>

            <Button variant="outline" onClick={handleOpenRepository}>
              <Github className="h-4 w-4 mr-2" />
              View Repository
            </Button>

            <div className="flex items-center gap-2">
              {status.completed && (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
              {status.error && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Error
                </Badge>
              )}
              {status.isRebuilding && (
                <Badge variant="secondary">
                  <Info className="h-3 w-3 mr-1" />
                  In Progress
                </Badge>
              )}
            </div>
          </div>

          {status.isRebuilding && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Step {status.currentStep} of {status.totalSteps}: {status.currentStepTitle}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="repository">Repository</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Rebuild Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full border rounded-md p-4">
                {status.logs.length === 0 ? (
                  <p className="text-muted-foreground">No logs yet. Click "Start GitHub Rebuild" to begin.</p>
                ) : (
                  <div className="font-mono text-sm space-y-1">
                    {status.logs.map((log, index) => (
                      <div key={index} className="whitespace-pre-wrap">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repository">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                Repository Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Repository Details</h4>
                  <ul className="text-sm space-y-1">
                    <li>• URL: {repositoryInfo.repositoryUrl}</li>
                    <li>• Branch: {repositoryInfo.branch}</li>
                    <li>• Total Commits: {repositoryInfo.totalCommits}</li>
                    <li>• Last Update: {new Date(repositoryInfo.lastUpdate).toLocaleDateString()}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Technology Stack</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Frontend: {repositoryInfo.components.frontend}</li>
                    <li>• Backend: {repositoryInfo.components.backend}</li>
                    <li>• Database: {repositoryInfo.components.database}</li>
                    <li>• Integrations: {repositoryInfo.components.integrations}</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleOpenRepository}>
                  <Github className="h-4 w-4 mr-2" />
                  View on GitHub
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                System Components
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Frontend Components</h4>
                  <div className="space-y-1 text-sm">
                    <Badge variant="outline">AItradeX1SystemDashboard</Badge>
                    <Badge variant="outline">LiveSignalsPanel</Badge>
                    <Badge variant="outline">AutoTradingToggle</Badge>
                    <Badge variant="outline">TradingChart</Badge>
                    <Badge variant="outline">PortfolioStats</Badge>
                    <Badge variant="outline">RiskManagement</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Core Libraries</h4>
                  <div className="space-y-1 text-sm">
                    <Badge variant="outline">tradingGateway</Badge>
                    <Badge variant="outline">supabaseClient</Badge>
                    <Badge variant="outline">realtime</Badge>
                    <Badge variant="outline">automatedTrading</Badge>
                    <Badge variant="outline">signalScoring</Badge>
                    <Badge variant="outline">riskGuards</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="architecture">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Architecture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-md p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Frontend
                  </h4>
                  <ul className="text-sm space-y-1">
                    <li>• React 18.3.1</li>
                    <li>• TypeScript</li>
                    <li>• Vite</li>
                    <li>• Tailwind CSS</li>
                    <li>• Shadcn/UI</li>
                  </ul>
                </div>
                <div className="border rounded-md p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Backend
                  </h4>
                  <ul className="text-sm space-y-1">
                    <li>• Supabase</li>
                    <li>• PostgreSQL</li>
                    <li>• 144+ Edge Functions</li>
                    <li>• Row Level Security</li>
                    <li>• Real-time subscriptions</li>
                  </ul>
                </div>
                <div className="border rounded-md p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Integrations
                  </h4>
                  <ul className="text-sm space-y-1">
                    <li>• Bybit API</li>
                    <li>• Telegram Bot</li>
                    <li>• 3Commas API</li>
                    <li>• AIRA Rankings</li>
                    <li>• WebSocket Feeds</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">✓</div>
                    <div className="text-sm text-muted-foreground">GitHub Sync</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">144+</div>
                    <div className="text-sm text-muted-foreground">Edge Functions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">✓</div>
                    <div className="text-sm text-muted-foreground">Database</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">✓</div>
                    <div className="text-sm text-muted-foreground">Real-time</div>
                  </div>
                </div>

                {status.error && (
                  <div className="border border-red-200 rounded-md p-4 bg-red-50">
                    <h4 className="font-semibold text-red-800 mb-2">Error Details</h4>
                    <p className="text-sm text-red-600">{status.error}</p>
                  </div>
                )}

                {status.completed && (
                  <div className="border border-green-200 rounded-md p-4 bg-green-50">
                    <h4 className="font-semibold text-green-800 mb-2">Rebuild Completed Successfully!</h4>
                    <p className="text-sm text-green-600">
                      System has been fully restored from GitHub repository. All components are operational.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}