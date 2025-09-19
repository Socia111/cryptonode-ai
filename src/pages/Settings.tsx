import MainLayout from '@/layouts/MainLayout';
import TradingDiagnostics from '@/components/TradingDiagnostics';
import { TradingConnectionTest } from '@/components/TradingConnectionTest';
import { ProductionControls } from '@/components/ProductionControls';

import AutoTradingToggle from '@/components/AutoTradingToggle';
import ThreeCommasAuth from '@/components/ThreeCommasAuth';
import BybitTradingAuth from '@/components/BybitTradingAuth';
import { SystemRebuildPanel } from '@/components/SystemRebuildPanel';
import { WhitelistManager } from '@/components/WhitelistManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Settings() {
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Trading Settings</h1>
          <p className="text-muted-foreground">
            Configure automation settings, run diagnostics, and rebuild your system
          </p>
        </div>
        
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Trading Settings</TabsTrigger>
            <TabsTrigger value="whitelist">Symbol Whitelist</TabsTrigger>
            <TabsTrigger value="rebuild">System Rebuild</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Trading Account Connections</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <ThreeCommasAuth />
                <BybitTradingAuth />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <h2 className="text-xl font-semibold mb-4">Automation Control</h2>
                <AutoTradingToggle />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4">Production Mode</h2>
                <ProductionControls />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4">Quick Tests</h2>
                <TradingConnectionTest />
              </div>
            </div>

            <div className="grid gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">System Diagnostics</h2>
                <TradingDiagnostics />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="whitelist" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Symbol Whitelist Management</h2>
              <p className="text-muted-foreground mb-6">
                Control which symbols are scanned by the trading system. Toggle between whitelist mode (limited symbols) and comprehensive mode (all symbols).
              </p>
              <WhitelistManager />
            </div>
          </TabsContent>

          <TabsContent value="rebuild" className="space-y-6">
            <SystemRebuildPanel />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}