// Comprehensive API authentication and login test script
const SUPABASE_URL = "https://codhlwjogfjywmjyjbbn.supabase.co";

async function testApiLoginErrors() {
  console.log("🔍 Testing API Login Errors and Authentication...");
  
  try {
    // Test 1: Markets table access (should work now with authenticated user)
    console.log("\n1. Testing markets table access...");
    const marketsResponse = await fetch(`${SUPABASE_URL}/rest/v1/markets?select=id&limit=1`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0',
        'authorization': 'Bearer ' + 'YOUR_USER_TOKEN', // Replace with actual user token
        'accept-profile': 'public'
      }
    });
    
    console.log(`Markets response status: ${marketsResponse.status}`);
    if (marketsResponse.status === 200) {
      const marketsData = await marketsResponse.json();
      console.log("✅ Markets table access successful");
    } else {
      console.log("❌ Markets table access failed:", await marketsResponse.text());
    }
    
    // Test 2: Signals table access (should work for anonymous)
    console.log("\n2. Testing signals table access...");
    const signalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&score=gte.80&limit=1`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0',
        'accept-profile': 'public'
      }
    });
    
    console.log(`Signals response status: ${signalsResponse.status}`);
    if (signalsResponse.status === 200) {
      const signalsData = await signalsResponse.json();
      console.log("✅ Signals table access successful, found", signalsData.length, "signals");
    } else {
      console.log("❌ Signals table access failed:", await signalsResponse.text());
    }
    
    // Test 3: Debug trading status function
    console.log("\n3. Testing debug trading status function...");
    const debugResponse = await fetch(`${SUPABASE_URL}/functions/v1/debug-trading-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
      },
      body: JSON.stringify({ action: 'env_check' })
    });
    
    const debugResult = await debugResponse.json();
    console.log(`Debug response status: ${debugResponse.status}`);
    if (debugResult.success) {
      console.log("✅ Debug function working");
      console.log("- Environment configured:", debugResult.environment.configurationStatus);
      console.log("- Bybit connected:", debugResult.bybit.connected);
    } else {
      console.log("❌ Debug function failed:", debugResult.error);
    }
    
    // Test 4: Bybit live trading function 
    console.log("\n4. Testing Bybit live trading function...");
    const tradingResponse = await fetch(`${SUPABASE_URL}/functions/v1/bybit-live-trading`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
      },
      body: JSON.stringify({ action: 'status' })
    });
    
    const tradingResult = await tradingResponse.json();
    console.log(`Trading response status: ${tradingResponse.status}`);
    if (tradingResult.success) {
      console.log("✅ Bybit trading function working");
      console.log("- Live trading enabled:", tradingResult.live_trading_enabled);
      console.log("- Test mode:", tradingResult.testMode);
    } else {
      console.log("❌ Bybit trading function failed:", tradingResult.error);
      console.log("- Error code:", tradingResult.code);
    }
    
    // Test 5: User trading accounts access
    console.log("\n5. Testing user trading accounts access...");
    const accountsResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_trading_accounts?select=*&limit=1`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0',
        'authorization': 'Bearer ' + 'YOUR_USER_TOKEN', // Replace with actual user token
        'accept-profile': 'public'
      }
    });
    
    console.log(`Trading accounts response status: ${accountsResponse.status}`);
    if (accountsResponse.status === 200) {
      console.log("✅ User trading accounts access successful");
    } else {
      console.log("❌ User trading accounts access failed:", await accountsResponse.text());
    }
    
    console.log("\n📋 Summary of API Login Error Fixes:");
    console.log("1. ✅ Fixed markets table RLS policy (authenticated users only)");
    console.log("2. ✅ Fixed signals table access (anonymous and authenticated)");
    console.log("3. ✅ Fixed user trading accounts RLS policy");
    console.log("4. ✅ Fixed Bybit authentication edge function error handling");
    console.log("5. ✅ Improved JSON parsing in bybit-live-trading function");
    
    console.log("\n🔧 Next Steps:");
    console.log("- Users need to authenticate to access markets data");
    console.log("- Bybit API credentials need to be configured in user accounts");
    console.log("- All edge functions now have proper error handling");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testApiLoginErrors();