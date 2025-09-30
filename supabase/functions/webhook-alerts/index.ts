import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { sendAlert } from '../_shared/alerts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AlertRequest {
  event: string;
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'critical';
  meta?: Record<string, any>;
  actor?: {
    id?: string;
    email?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const alertRequest: AlertRequest = await req.json();

    console.log('📧 Processing webhook alert:', { 
      event: alertRequest.event, 
      severity: alertRequest.severity 
    });

    // Send alert via webhook channels
    const result = await sendAlert(supabase, {
      event: alertRequest.event,
      title: alertRequest.title,
      message: alertRequest.message,
      severity: alertRequest.severity ?? 'info',
      meta: {
        ...alertRequest.meta,
        actor: alertRequest.actor,
        timestamp: new Date().toISOString(),
        source: 'webhook-alerts-function'
      }
    });

    if (!result.ok) {
      console.log('📭 Alert skipped:', result.reason);
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: result.reason,
          message: 'Alert was skipped (disabled, below threshold, or duplicate)'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Alert sent successfully:', result);

    return new Response(
      JSON.stringify({
        success: true,
        event: alertRequest.event,
        channels_attempted: result.results?.length || 0,
        channels_delivered: result.results?.filter(r => r.ok).length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Webhook alert error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send webhook alert' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});