import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SecurityEventRequest {
  action: string;
  session_data?: any;
  severity?: 'info' | 'warning' | 'high' | 'critical';
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

    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    const { action, session_data = {}, severity = 'info' }: SecurityEventRequest = await req.json();

    console.log('📋 Logging security event:', { action, severity, userId });

    // Get client IP (will be overridden with actual IP server-side)
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Enhanced session data with server-side context
    const enhancedSessionData = {
      ...session_data,
      server_timestamp: new Date().toISOString(),
      client_ip: clientIP,
      user_agent: req.headers.get('user-agent') || 'unknown',
      referer: req.headers.get('referer') || null,
      logged_via: 'security_event_api'
    };

    // Insert into security audit log
    const { data, error } = await supabase
      .from('security_audit_log')
      .insert([
        {
          user_id: userId,
          action,
          session_data: enhancedSessionData,
          severity,
          ip_address: clientIP
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to insert security event:', error);
      throw error;
    }

    console.log('✅ Security event logged successfully:', data);

    // For critical events, also log to admin audit log if user is admin
    if (severity === 'critical' && action.includes('live_trading')) {
      try {
        await supabase
          .from('admin_audit_log')
          .insert([
            {
              admin_user_id: userId,
              action: `critical_security_event_${action}`,
              table_name: 'trading_system',
              record_id: 'production_controls',
              old_values: { mode: session_data.from_mode || 'unknown' },
              new_values: { mode: session_data.to_mode || 'unknown' }
            }
          ]);

        console.log('✅ Critical event also logged to admin audit log');
      } catch (adminLogError) {
        console.warn('⚠️ Failed to log to admin audit log:', adminLogError);
        // Don't fail the main request for this
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id: data.id,
        logged_at: data.created_at
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Security event logging error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to log security event' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});