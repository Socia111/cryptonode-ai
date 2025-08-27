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
    const endpoint = url.pathname.split('/').pop();

    switch (endpoint) {
      case 'recent': {
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const { data, error } = await supabase
          .from('scanner_signals')
          .select('*')
          .order('generated_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, signals: data }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'live': {
        const { data, error } = await supabase
          .from('scanner_signals')
          .select('*')
          .eq('is_active', true)
          .order('confidence_score', { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, live_signals: data }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default: {
        return new Response(JSON.stringify({ success: false, error: 'Invalid endpoint' }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});