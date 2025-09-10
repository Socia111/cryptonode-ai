import MainLayout from '@/layouts/MainLayout';
import { TradingDiagnostics } from '@/components/TradingDiagnostics';
import { TradingConnectionTest } from '@/components/TradingConnectionTest';
import AutoTradingToggle from '@/components/AutoTradingToggle';

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
        
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold mb-4">Automation Control</h2>
            <AutoTradingToggle />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Tests</h2>
            <TradingConnectionTest />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">System Diagnostics</h2>
          <TradingDiagnostics />
        </div>
      </div>
    </MainLayout>
  )
}