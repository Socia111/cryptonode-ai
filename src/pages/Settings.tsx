import MainLayout from '@/layouts/MainLayout';
import TradingDiagnostics from '@/components/TradingDiagnostics';
import { TradingConnectionTest } from '@/components/TradingConnectionTest';
import { ProductionControls } from '@/components/ProductionControls';
import { TestnetTradeTest } from '@/components/TestnetTradeTest';
import AutoTradingToggle from '@/components/AutoTradingToggle';
import ThreeCommasAuth from '@/components/ThreeCommasAuth';
import BybitTradingAuth from '@/components/BybitTradingAuth';

export default function Settings() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Trading Settings</h1>
          <p className="text-muted-foreground">
            Configure automation settings and run system diagnostics
          </p>
        </div>
        
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

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold mb-4">System Diagnostics</h2>
            <TradingDiagnostics />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Testnet Testing</h2>
            <TestnetTradeTest />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}