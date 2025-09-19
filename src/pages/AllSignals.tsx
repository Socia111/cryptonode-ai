import { AllSignalsPanel } from '@/components/AllSignalsPanel';

export default function AllSignals() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Trading Signals</h1>
        <p className="text-muted-foreground">
          Complete view of all generated signals across all quality levels and strategies
        </p>
      </div>
      
      <AllSignalsPanel />
    </div>
  );
}