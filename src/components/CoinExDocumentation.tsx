import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SkipToMain } from '@/components/SkipToMain';
import { 
  ExternalLink, 
  Book, 
  Key, 
  Shield, 
  Zap, 
  Globe, 
  MessageCircle,
  Code,
  TrendingUp
} from 'lucide-react';

export function CoinExDocumentation() {
  return (
    <div className="min-h-screen bg-background">
      <SkipToMain />
      
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">CoinEx</span>
            </div>
          </div>
          
          <nav className="ml-auto flex items-center space-x-4 text-sm">
            <a href="#" className="hover:text-primary transition-colors">User Manual</a>
            <a href="#" className="hover:text-primary transition-colors">Account</a>
            <a href="#" className="hover:text-primary transition-colors">Asset</a>
            <a href="#" className="hover:text-primary transition-colors">Spot</a>
            <a href="#" className="hover:text-primary transition-colors">Futures</a>
            <a href="#" className="hover:text-primary transition-colors">FAQ</a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="container py-8" tabIndex={-1}>
        <div className="mx-auto max-w-4xl space-y-8">
          
          {/* Hero Section */}
          <section className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              CoinEx API Documentation
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Welcome to the CoinEx API documentation. Build powerful trading applications, 
              automate strategies, and integrate with our exchange platform.
            </p>
          </section>

          {/* Quick Stats */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Globe className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">REST API</div>
                <p className="text-sm text-muted-foreground">HTTP-based trading API</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold">WebSocket</div>
                <p className="text-sm text-muted-foreground">Real-time market data</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">Secure</div>
                <p className="text-sm text-muted-foreground">API key authentication</p>
              </CardContent>
            </Card>
          </section>

          {/* API Base URLs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                API Base URLs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div>
                    <div className="font-medium">HTTP API</div>
                    <div className="text-sm text-muted-foreground">REST endpoints for trading and account management</div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    https://api.coinex.com/v2
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div>
                    <div className="font-medium">Spot WebSocket</div>
                    <div className="text-sm text-muted-foreground">Real-time spot market data</div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    wss://socket.coinex.com/v2/spot
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div>
                    <div className="font-medium">Futures WebSocket</div>
                    <div className="text-sm text-muted-foreground">Real-time futures market data</div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    wss://socket.coinex.com/v2/futures
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documentation Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Documentation Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
                    <div>
                      <div className="font-medium">API Introduction</div>
                      <div className="text-sm text-muted-foreground">Overall API overview and demo materials</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
                    <div>
                      <div className="font-medium">Integration Guide</div>
                      <div className="text-sm text-muted-foreground">Step-by-step access process and best practices</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 mt-2"></div>
                    <div>
                      <div className="font-medium">Authentication</div>
                      <div className="text-sm text-muted-foreground">API key generation and authentication</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="h-2 w-2 rounded-full bg-red-500 mt-2"></div>
                    <div>
                      <div className="font-medium">Rate Limits</div>
                      <div className="text-sm text-muted-foreground">Endpoint usage limits and sample code</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="h-2 w-2 rounded-full bg-purple-500 mt-2"></div>
                    <div>
                      <div className="font-medium">Error Handling</div>
                      <div className="text-sm text-muted-foreground">Common error codes and handling methods</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="h-2 w-2 rounded-full bg-pink-500 mt-2"></div>
                    <div>
                      <div className="font-medium">Enumeration Definitions</div>
                      <div className="text-sm text-muted-foreground">Enumeration values and descriptions</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="h-2 w-2 rounded-full bg-cyan-500 mt-2"></div>
                    <div>
                      <div className="font-medium">FAQ</div>
                      <div className="text-sm text-muted-foreground">Frequently asked questions and answers</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Module Grouping */}
          <Card>
            <CardHeader>
              <CardTitle>API Module Grouping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Account Module */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Account
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                    <div className="text-sm p-2 bg-muted/30 rounded">Subaccount management</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">API key management</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">Balance inquiry</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">Asset transfer</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">Trading fees</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">Account settings</div>
                  </div>
                </div>

                <Separator />

                {/* Assets Module */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Assets
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                    <div className="text-sm p-2 bg-muted/30 rounded">Balance management</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">Borrow & Repay</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">Deposit & Withdrawal</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">Asset transfers</div>
                  </div>
                </div>

                <Separator />

                {/* Spot Trading */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Spot Trading
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                    <div className="text-sm p-2 bg-muted/30 rounded">Market data</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">Trading records</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">Order management</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">Batch operations</div>
                  </div>
                </div>

                <Separator />

                {/* Futures Trading */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Futures Trading
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                    <div className="text-sm p-2 bg-muted/30 rounded">Market data</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">Position management</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">Order management</div>
                    <div className="text-sm p-2 bg-muted/30 rounded">Risk management</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resources and Support */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Related Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="#" className="flex items-center gap-2">
                    <Book className="h-4 w-4" />
                    API Documentation
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                </Button>
                
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="#" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    API Management Console
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                </Button>
                
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="#" className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Sample Code
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Support & Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Need help or have feedback? Our support team is here to assist you during development.
                </p>
                
                <Button className="w-full">
                  Contact Support Team
                </Button>
                
                <div className="text-center text-xs text-muted-foreground">
                  We value your feedback and suggestions for improving our API documentation.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer CTA */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <h2 className="text-2xl font-bold mb-2">Ready to Get Started?</h2>
              <p className="text-muted-foreground mb-4">
                Thank you for choosing CoinEx API services. Build outstanding applications and integrate with our exchange.
              </p>
              <Button size="lg">
                Start Building
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="font-semibold">CoinEx</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Docs</a>
              <a href="#" className="hover:text-primary transition-colors">Tutorial</a>
            </div>
            
            <div className="text-sm text-muted-foreground">
              © 2017-2024 CoinEx.com. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}