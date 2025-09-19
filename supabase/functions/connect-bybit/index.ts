import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, { 
      auth: { persistSession: false }
    });

    // Verify JWT token
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing JWT" }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const access_token = auth.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(access_token);
    
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JWT" }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const account_type = body?.accountType === "mainnet" ? "mainnet" : "testnet";

    console.log(`Connecting user ${user.id} to Bybit ${account_type}`);

    // Upsert user's trading account "marker" row
    const { error } = await supabase
      .from("user_trading_accounts")
      .upsert({
        user_id: user.id,
        exchange: "bybit",
        account_type,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,exchange" });

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Successfully connected user ${user.id} to Bybit ${account_type}`);

    return new Response(
      JSON.stringify({ ok: true, message: `Connected to Bybit ${account_type}` }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("Connect Bybit error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});