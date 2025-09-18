// Test enhanced-signal-generation function
const testFunction = async () => {
  try {
    console.log('Testing enhanced-signal-generation function...');
    
    const response = await fetch('https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/enhanced-signal-generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ trigger: 'manual' })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ enhanced-signal-generation SUCCESS:', data);
    } else {
      console.error('❌ enhanced-signal-generation FAILED:', {
        status: response.status,
        statusText: response.statusText,
        error: data
      });
    }
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
  }
};

testFunction();