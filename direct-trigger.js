const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://codhlwjogfjywmjyjbbn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
);

async function directTrigger() {
  console.log('🚀 DIRECT TRIGGER: all-symbols-scanner');
  
  try {
    const result = await supabase.functions.invoke('all-symbols-scanner');
    console.log('✅ Result:', JSON.stringify(result.data, null, 2));
    
    if (result.error) {
      console.error('❌ Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

directTrigger();