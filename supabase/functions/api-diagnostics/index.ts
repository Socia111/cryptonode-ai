import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

interface APITest {
  name: string;
  endpoint: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  responseTime?: number;
  details?: Record<string, unknown>;
}

async function testBybitAPI(): Promise<APITest[]> {
  const results: APITest[] = [];
  const BASE_URL = Deno.env.get("BYBIT_BASE") ?? "https://api-testnet.bybit.com";
  const API_KEY = Deno.env.get("BYBIT_KEY");
  const API_SECRET = Deno.env.get("BYBIT_SECRET");

  // Test 1: Public endpoint (server time)
  try {
    const start = Date.now();
    const response = await fetch(`${BASE_URL}/v5/market/time`);
    const data = await response.json();
    const responseTime = Date.now() - start;

    if (response.ok && data.retCode === 0) {
      results.push({
        name: "Public API Access",
        endpoint: "/v5/market/time",
        status: "success",
        message: "Public endpoints accessible",
        responseTime,
        details: { serverTime: data.result?.timeSecond }
      });
    } else {
      results.push({
        name: "Public API Access",
        endpoint: "/v5/market/time",
        status: "error", 
        message: `Public API failed: ${data.retMsg || 'Unknown error'}`,
        responseTime,
        details: data
      });
    }
  } catch (error) {
    results.push({
      name: "Public API Access",
      endpoint: "/v5/market/time",
      status: "error",
      message: `Network error: ${error.message}`,
      details: { error: String(error) }
    });
  }

  // Test 2: API credentials check
  if (!API_KEY || !API_SECRET) {
    results.push({
      name: "API Credentials",
      endpoint: "N/A",
      status: "error",
      message: "Missing Bybit API credentials (BYBIT_KEY or BYBIT_SECRET)",
      details: { 
        hasApiKey: !!API_KEY, 
        hasApiSecret: !!API_SECRET,
        baseUrl: BASE_URL
      }
    });
  } else {
    results.push({
      name: "API Credentials",
      endpoint: "N/A", 
      status: "success",
      message: "API credentials configured",
      details: {
        apiKeyLength: API_KEY.length,
        secretLength: API_SECRET.length,
        baseUrl: BASE_URL
      }
    });

    // Test 3: Authentication test (if credentials available)
    try {
      const start = Date.now();
      const ts = Date.now().toString();
      const recv = "5000";
      
      // Create signature for authentication test
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(API_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      
      const message = ts + API_KEY + recv;
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
      const signature = [...new Uint8Array(sig)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      const response = await fetch(`${BASE_URL}/v5/user/query-api`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-BAPI-API-KEY": API_KEY,
          "X-BAPI-TIMESTAMP": ts,
          "X-BAPI-RECV-WINDOW": recv,
          "X-BAPI-SIGN": signature,
        },
      });

      const data = await response.json();
      const responseTime = Date.now() - start;

      if (response.ok && data.retCode === 0) {
        results.push({
          name: "API Authentication",
          endpoint: "/v5/user/query-api",
          status: "success",
          message: "Authentication successful",
          responseTime,
          details: { permissions: data.result?.permissions || [] }
        });
      } else {
        let errorType = "Unknown";
        if (data.retCode === 10004) errorType = "Invalid signature";
        else if (data.retCode === 10003) errorType = "Invalid API key";
        else if (data.retCode === 10005) errorType = "Permission denied";

        results.push({
          name: "API Authentication",
          endpoint: "/v5/user/query-api",
          status: "error",
          message: `Authentication failed: ${errorType} (${data.retCode})`,
          responseTime,
          details: { retCode: data.retCode, retMsg: data.retMsg, rawResponse: data }
        });
      }
    } catch (error) {
      results.push({
        name: "API Authentication", 
        endpoint: "/v5/user/query-api",
        status: "error",
        message: `Authentication test failed: ${error.message}`,
        details: { error: String(error) }
      });
    }
  }

  // Test 4: Signals API functionality
  try {
    const start = Date.now();
    const response = await fetch('https://codhlwjogfjywmjyjbbn.supabase.co/rest/v1/signals?select=id&limit=1', {
      headers: {
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
        'authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      }
    });
    const responseTime = Date.now() - start;

    if (response.ok) {
      results.push({
        name: "Signals Database",
        endpoint: "/rest/v1/signals",
        status: "success", 
        message: "Database connection working",
        responseTime
      });
    } else {
      results.push({
        name: "Signals Database",
        endpoint: "/rest/v1/signals",
        status: "error",
        message: `Database connection failed: ${response.status}`,
        responseTime
      });
    }
  } catch (error) {
    results.push({
      name: "Signals Database",
      endpoint: "/rest/v1/signals", 
      status: "error",
      message: `Database test failed: ${error.message}`
    });
  }

  return results;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pathname } = new URL(req.url);

    if (pathname.endsWith('/api-diagnostics') || pathname.endsWith('/')) {
      console.log("🔍 Running API diagnostics...");
      
      const tests = await testBybitAPI();
      const summary = {
        totalTests: tests.length,
        passed: tests.filter(t => t.status === 'success').length,
        failed: tests.filter(t => t.status === 'error').length,
        warnings: tests.filter(t => t.status === 'warning').length,
        averageResponseTime: tests
          .filter(t => t.responseTime)
          .reduce((sum, t) => sum + (t.responseTime || 0), 0) / 
          tests.filter(t => t.responseTime).length || 0
      };

      const result = {
        timestamp: new Date().toISOString(),
        summary,
        tests,
        recommendations: generateRecommendations(tests)
      };

      console.log("✅ API diagnostics completed");
      return new Response(JSON.stringify(result, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("❌ Error in api-diagnostics:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: String(error) 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateRecommendations(tests: APITest[]): string[] {
  const recommendations: string[] = [];
  const errors = tests.filter(t => t.status === 'error');

  if (errors.some(e => e.name === "API Credentials")) {
    recommendations.push("Configure Bybit API credentials (BYBIT_KEY, BYBIT_SECRET)");
  }

  if (errors.some(e => e.name === "API Authentication")) {
    const authError = errors.find(e => e.name === "API Authentication");
    if (authError?.details?.retCode === 10004) {
      recommendations.push("Check API signature generation - ensure correct timestamp and payload format");
    } else if (authError?.details?.retCode === 10003) {
      recommendations.push("Verify API key is correct and active");
    } else if (authError?.details?.retCode === 10005) {
      recommendations.push("Enable required permissions for your API key in Bybit settings");
    }
  }

  if (errors.some(e => e.name === "Public API Access")) {
    recommendations.push("Check network connectivity and Bybit API endpoint availability");
  }

  if (errors.some(e => e.name === "Signals Database")) {
    recommendations.push("Verify Supabase connection and database availability");
  }

  const slowTests = tests.filter(t => t.responseTime && t.responseTime > 2000);
  if (slowTests.length > 0) {
    recommendations.push("API response times are slow - consider connection optimization");
  }

  if (recommendations.length === 0) {
    recommendations.push("All API systems are functioning normally");
  }

  return recommendations;
}