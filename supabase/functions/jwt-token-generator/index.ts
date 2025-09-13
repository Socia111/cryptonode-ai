import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenRequest {
  service: 'coinapi' | 'apilayer'
  scope?: string
  expiresIn?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    const { service, scope = 'read:market', expiresIn = '5m' } = await req.json() as TokenRequest

    // Generate JWT for the requested service
    let jwtToken: string

    switch (service) {
      case 'coinapi':
        jwtToken = await generateCoinAPIJWT(user.id, scope, expiresIn)
        break
      
      case 'apilayer':
        jwtToken = await generateAPILayerJWT(user.id, scope, expiresIn)
        break
      
      default:
        throw new Error(`Unsupported service: ${service}`)
    }

    // Log token generation for audit
    await supabase.from('token_audit_log').insert({
      user_id: user.id,
      service,
      scope,
      expires_in: expiresIn,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    })

    console.log(`🔑 Generated ${service} JWT for user ${user.id}, scope: ${scope}`)

    return new Response(
      JSON.stringify({
        success: true,
        jwt_token: jwtToken,
        service,
        scope,
        expires_in: expiresIn,
        issued_at: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ JWT Generation Error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function generateCoinAPIJWT(userId: string, scope: string, expiresIn: string): Promise<string> {
  // For now, return a placeholder JWT structure
  // In production, you would use your private key to sign this
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }

  const payload = {
    iss: 'aitradex1',
    sub: userId,
    aud: 'coinapi.io',
    scope: scope,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + parseExpiresIn(expiresIn)
  }

  // NOTE: In production, implement proper RSA signing here
  // For now, return a base64 encoded structure for development
  const encodedHeader = btoa(JSON.stringify(header))
  const encodedPayload = btoa(JSON.stringify(payload))
  
  return `${encodedHeader}.${encodedPayload}.development_signature`
}

async function generateAPILayerJWT(userId: string, scope: string, expiresIn: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }

  const payload = {
    iss: 'aitradex1',
    sub: userId,
    aud: 'apilayer.com',
    scope: scope,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + parseExpiresIn(expiresIn)
  }

  // NOTE: In production, implement proper HMAC signing here
  const encodedHeader = btoa(JSON.stringify(header))
  const encodedPayload = btoa(JSON.stringify(payload))
  
  return `${encodedHeader}.${encodedPayload}.development_signature`
}

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([mhd])$/)
  if (!match) return 300 // Default 5 minutes
  
  const [, amount, unit] = match
  const num = parseInt(amount)
  
  switch (unit) {
    case 'm': return num * 60
    case 'h': return num * 3600
    case 'd': return num * 86400
    default: return 300
  }
}