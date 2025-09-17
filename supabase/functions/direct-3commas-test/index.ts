import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ThreeCommasCredentials {
  api_key: string;
  secret: string;
  passphrase?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Starting 3Commas API test...')
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get 3Commas credentials from Supabase secrets
    const { data: apiKeys, error: keysError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('exchange', '3commas')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (keysError || !apiKeys) {
      console.log('❌ No 3Commas API keys found:', keysError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active 3Commas API keys found in database',
          details: keysError?.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    console.log('✅ Found 3Commas credentials')
    
    // Parse credentials
    const credentials: ThreeCommasCredentials = {
      api_key: apiKeys.api_key,
      secret: apiKeys.api_secret,
      passphrase: apiKeys.passphrase
    }

    // Test 3Commas API connection
    const testResult = await test3CommasConnection(credentials)
    
    console.log('🔍 3Commas test result:', testResult)
    
    return new Response(
      JSON.stringify({
        success: testResult.success,
        data: testResult.data,
        error: testResult.error,
        credentials_found: true,
        api_key_preview: credentials.api_key.substring(0, 8) + '...'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Direct 3Commas test failed:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function test3CommasConnection(credentials: ThreeCommasCredentials) {
  try {
    console.log('🔍 Testing 3Commas API connection...')
    
    if (!credentials.api_key || !credentials.secret) {
      return {
        success: false,
        error: 'Missing API key or secret'
      }
    }

    // Create signature for 3Commas API
    const timestamp = Date.now().toString()
    const query = '/public/api/ver1/accounts'
    
    const signature = await createSignature(credentials.secret, query + timestamp)
    
    const response = await fetch('https://api.3commas.io/public/api/ver1/accounts', {
      method: 'GET',
      headers: {
        'APIKEY': credentials.api_key,
        'Signature': signature,
        'timestamp': timestamp,
        'Content-Type': 'application/json'
      }
    })

    const responseText = await response.text()
    console.log('📊 3Commas API response status:', response.status)
    console.log('📊 3Commas API response:', responseText.substring(0, 200))

    if (!response.ok) {
      return {
        success: false,
        error: `API request failed: ${response.status} ${response.statusText}`,
        details: responseText
      }
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      return {
        success: false,
        error: 'Invalid JSON response',
        details: responseText
      }
    }

    return {
      success: true,
      data: {
        accounts_count: Array.isArray(data) ? data.length : 0,
        accounts: Array.isArray(data) ? data.map(acc => ({
          id: acc.id,
          name: acc.name,
          exchange: acc.exchange_name,
          enabled: acc.is_enabled
        })) : [],
        raw_response_preview: JSON.stringify(data).substring(0, 300)
      }
    }

  } catch (error) {
    console.error('❌ 3Commas connection test failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function createSignature(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(message)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}