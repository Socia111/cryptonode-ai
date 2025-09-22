// Test script for production signal generation
async function testProductionSignals() {
  const supabaseUrl = 'https://codhlwjogfjywmjyjbbn.supabase.co';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0';
  
  try {
    console.log('🚀 Testing production signal generation...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/production-signal-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Signal generation successful:', data);
      console.log(`📊 Generated ${data.signals_generated} signals from ${data.market_pairs_analyzed} pairs`);
      
      if (data.signals && data.signals.length > 0) {
        console.log('\n📈 Sample signals:');
        data.signals.slice(0, 3).forEach((signal, i) => {
          console.log(`${i + 1}. ${signal.symbol} ${signal.direction} - Score: ${signal.score}%`);
          console.log(`   Entry: $${signal.entry_price} | SL: $${signal.stop_loss} | TP: $${signal.take_profit}`);
        });
      }
    } else {
      console.error('❌ Signal generation failed:', data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testProductionSignals();