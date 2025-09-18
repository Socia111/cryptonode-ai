import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[challenge-expiry-reminder] Challenge expiry reminder triggered')
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Challenge expiry reminder processed' 
      }),
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('[challenge-expiry-reminder] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: corsHeaders }
    )
  }
})