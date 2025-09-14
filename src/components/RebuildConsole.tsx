import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRebuild } from '@/hooks/useRebuild';
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
  Monitor
} from 'lucide-react';

export function RebuildConsole() {
  const { status, executeRebuild, getSystemInfo, validateSystem, rebuildConfig } = useRebuild();
  const [systemInfo, setSystemInfo] = useState(getSystemInfo());
  const [validation, setValidation] = useState(validateSystem());

  useEffect(() => {
    // Check for /rebuild command in URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const rebuildCommand = urlParams.get('rebuild') || localStorage.getItem('rebuildCommand');
    
    if (rebuildCommand === 'true') {
      executeRebuild();
      localStorage.removeItem('rebuildCommand');
    }
  }, [executeRebuild]);

  const handleRebuild = () => {
    executeRebuild();
  };

  const handleValidate = () => {
    setValidation(validateSystem());
  };

  const progressPercentage = status.totalSteps > 0 ? (status.currentStep / status.totalSteps) * 100 : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            AItradeX1 Rebuild Console
          </CardTitle>
          <CardDescription>
            Complete system documentation and rebuild functionality based on GitHub memo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleRebuild} 
              disabled={status.isRebuilding}
              className="flex items-center gap-2"
            >
              {status.isRebuilding ? (
                <>
                  <Square className="h-4 w-4" />
                  Rebuilding...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Execute Rebuild
                </>
              )}
            </Button>
            
            <Button variant="outline" onClick={handleValidate}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Validate System
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="files">Core Files</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="functions">Functions</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
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
                  <p className="text-muted-foreground">No logs yet. Click "Execute Rebuild" to start.</p>
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

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Frontend Stack</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Framework: {rebuildConfig.frontend.framework}</li>
                    <li>• Build Tool: {rebuildConfig.frontend.buildTool}</li>
                    <li>• Styling: {rebuildConfig.frontend.styling}</li>
                    <li>• Routing: {rebuildConfig.frontend.routing}</li>
                    <li>• State: {rebuildConfig.frontend.stateManagement}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Backend Stack</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Service: {rebuildConfig.backend.service}</li>
                    <li>• Database: {rebuildConfig.backend.database}</li>
                    <li>• Functions: {rebuildConfig.backend.functions.length} Edge Functions</li>
                    <li>• Auth: {rebuildConfig.backend.authentication}</li>
                  </ul>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Integrations</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(rebuildConfig.integrations).map(([key, value]) => (
                    <Badge key={key} variant="outline">{value}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Core Files ({Object.keys(systemInfo.coreFiles).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-2">
                  {Object.entries(systemInfo.coreFiles).map(([file, description]) => (
                    <div key={file} className="border rounded-md p-3">
                      <div className="font-mono text-sm font-medium">{file}</div>
                      <div className="text-sm text-muted-foreground mt-1">{description}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Schema ({Object.keys(systemInfo.databaseSchema).length} tables)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="space-y-4">
                  {Object.entries(systemInfo.databaseSchema).map(([table, info]) => (
                    <div key={table} className="border rounded-md p-4">
                      <h4 className="font-semibold">{table}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{info.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {info.columns.map((column) => (
                          <Badge key={column} variant="secondary" className="text-xs">
                            {column}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Edge Functions ({rebuildConfig.backend.functions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {rebuildConfig.backend.functions.map((func) => (
                    <Badge key={func} variant="outline" className="justify-start">
                      {func}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                System Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{validation.summary.envVars}</div>
                    <div className="text-sm text-muted-foreground">Environment Variables</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{validation.summary.coreFiles}</div>
                    <div className="text-sm text-muted-foreground">Core Files</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{validation.summary.dbTables}</div>
                    <div className="text-sm text-muted-foreground">Database Tables</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{validation.summary.edgeFunctions}</div>
                    <div className="text-sm text-muted-foreground">Edge Functions</div>
                  </div>
                </div>

                <ScrollArea className="h-64 w-full border rounded-md p-4">
                  <div className="font-mono text-sm space-y-1">
                    {validation.logs.map((log, index) => (
                      <div key={index}>{log}</div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex items-center gap-2">
                  {validation.isValid ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      System Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Issues Found
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}