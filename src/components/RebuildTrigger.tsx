import { useEffect } from 'react';
import { useRebuild } from '@/hooks/useRebuild';

export function RebuildTrigger() {
  const { executeRebuild } = useRebuild();

  useEffect(() => {
    console.log('🚀 /rebuild command detected - Starting GitHub rebuild...');
    console.log('📋 Restoring complete AItradeX1 system with all Supabase functions...');
    
    // Execute rebuild immediately
    executeRebuild();
    
    // Clear any rebuild flags
    localStorage.removeItem('rebuildCommand');
    localStorage.removeItem('rebuildExecuted');
  }, [executeRebuild]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        <h2 className="text-xl font-bold mb-2">Rebuilding from GitHub</h2>
        <p className="text-gray-600 mb-4">
          Restoring complete AItradeX1 system with all 144 Supabase functions...
        </p>
        <div className="text-sm text-gray-500">
          🔄 Loading perfect version from repository<br/>
          ⚡ Real-time trading system<br/>
          🛡️ Security policies & RLS<br/>
          📊 All scanner functions
        </div>
      </div>
    </div>
  );
}