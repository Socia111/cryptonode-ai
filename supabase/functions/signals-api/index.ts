import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    
    // GET /recent - Recent signals
    if (req.method === 'GET' && url.pathname.includes('/recent')) {
      const { data: signals, error } = await supabase
        .from('scanner_signals')
        .select('*')
        .eq('is_active', true)
        .order('generated_at', { ascending: false })
        .limit(50);

      return new Response(JSON.stringify({
        success: true,
        signals: signals || [],
        count: signals?.length || 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST /scan - Trigger scan
    if (req.method === 'POST' && url.pathname.includes('/scan')) {
      const body = await req.json();
      
      const { data, error } = await supabase.functions.invoke('live-scanner', {
        body
      });

      return new Response(JSON.stringify({
        success: true,
        scan_result: data
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Endpoint not found'
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404 
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 
    });
  }
});