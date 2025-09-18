// Trigger the comprehensive trading pipeline
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0";

async function triggerPipeline() {
  console.log("🚀 Triggering Comprehensive Trading Pipeline...");

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/comprehensive-trading-pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        mode: 'full',
        trigger: 'manual_test'
      })
    });

    const result = await response.json();
    
    console.log("📊 Pipeline Result:", JSON.stringify(result, null, 2));

    if (result.success) {
      console.log("\n✅ Pipeline executed successfully!");
      console.log(`🏗️  Steps completed: ${result.steps_completed?.length || 0}`);
      console.log(`📈 Market data points: ${result.market_data_points || 0}`);
      console.log(`🔥 Signals generated: ${result.signals_generated || 0}`);
      console.log(`⚠️  Errors: ${result.errors?.length || 0}`);
      
      if (result.errors?.length > 0) {
        console.log("\n❌ Errors encountered:");
        result.errors.forEach((error, i) => {
          console.log(`   ${i + 1}. ${error}`);
        });
      }
    } else {
      console.log("❌ Pipeline failed!");
    }

  } catch (error) {
    console.error("💥 Pipeline trigger failed:", error);
  }
}

triggerPipeline();