// Clean up all mock signals and ensure only real data remains
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function cleanupMockSignals() {
  console.log("🧹 Cleaning up mock signals...\n");

  try {
    // Get all signals to check
    const signalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });

    const allSignals = await signalsResponse.json();
    console.log(`📊 Total signals in database: ${allSignals.length}`);

    // Identify mock signals
    const mockSignals = allSignals.filter(signal => 
      signal.source === 'demo' ||
      signal.source === 'mock' ||
      signal.source === 'system' ||
      signal.algo?.includes('mock') ||
      signal.algo?.includes('demo') ||
      signal.algo === 'quantum_ai' || // Default algorithm is mock
      (signal.metadata && signal.metadata.real_data !== true && 
       !signal.source?.includes('real') && 
       !signal.source?.includes('enhanced') &&
       !signal.source?.includes('aitradex1'))
    );

    const realSignals = allSignals.filter(signal => 
      signal.source !== 'demo' && 
      signal.source !== 'mock' && 
      signal.source !== 'system' &&
      !signal.algo?.includes('mock') &&
      !signal.algo?.includes('demo') &&
      signal.algo !== 'quantum_ai' &&
      (signal.source?.includes('real') || 
       signal.source?.includes('enhanced') || 
       signal.source?.includes('aitradex1') ||
       signal.metadata?.real_data === true)
    );

    console.log(`🚫 Mock signals found: ${mockSignals.length}`);
    console.log(`✅ Real signals found: ${realSignals.length}`);

    if (mockSignals.length > 0) {
      console.log("\nMock signal sources found:");
      const mockSources = [...new Set(mockSignals.map(s => `${s.source} (${s.algo})`))];
      mockSources.forEach(source => console.log(`   • ${source}`));

      // Delete mock signals in batches
      const batchSize = 50;
      let deletedCount = 0;
      
      for (let i = 0; i < mockSignals.length; i += batchSize) {
        const batch = mockSignals.slice(i, i + batchSize);
        const ids = batch.map(s => s.id);
        
        const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?id=in.(${ids.map(id => `"${id}"`).join(',')})`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
            'Prefer': 'return=minimal'
          }
        });

        if (deleteResponse.ok) {
          deletedCount += batch.length;
          console.log(`   Deleted batch ${Math.floor(i/batchSize) + 1}: ${batch.length} signals`);
        } else {
          console.error(`   Failed to delete batch ${Math.floor(i/batchSize) + 1}:`, await deleteResponse.text());
        }
      }

      console.log(`\n🗑️  Total mock signals deleted: ${deletedCount}`);
    }

    if (realSignals.length > 0) {
      console.log("\nReal signal sources remaining:");
      const realSources = [...new Set(realSignals.map(s => `${s.source} (${s.algo})`))];
      realSources.forEach(source => console.log(`   ✅ ${source}`));
    }

    console.log("\n🎉 Mock signal cleanup complete!");
    console.log(`📊 Database now contains ${realSignals.length} real signals only`);

  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  }
}

cleanupMockSignals().catch(console.error);