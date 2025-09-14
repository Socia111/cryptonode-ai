import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🕐 Crypto scheduler triggered - starting automated trading cycle');
    
    // Trigger the auto-trading-poller function
    const pollerResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/auto-trading-poller`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        triggered_by: 'crypto-scheduler',
        timestamp: new Date().toISOString()
      })
    });

    const pollerResult = await pollerResponse.json();
    
    if (!pollerResponse.ok) {
      throw new Error(`Auto-trading poller failed: ${pollerResult.error || 'Unknown error'}`);
    }

    console.log('✅ Auto-trading cycle completed:', pollerResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Automated trading cycle completed successfully',
        execution_details: pollerResult,
        next_execution: 'Manual trigger or scheduled',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Crypto scheduler error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});