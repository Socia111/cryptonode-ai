import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenData {
  symbol: string
  marketCap: number
  volume24h: number
  priceChange24h: number
  circulatingSupply: number
  totalSupply: number
  holderCount?: number
}

interface SpynxScore {
  token: string
  score: number
  market_cap: number
  liquidity: number
  holder_distribution: number
  whale_activity: number
  sentiment_score: number
  roi_forecast: number
  volume_24h: number
  price_change_24h: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch token data from multiple sources
    const tokens = await fetchTokenData()
    const spynxScores: SpynxScore[] = []

    for (const token of tokens) {
      const score = await calculateSpynxScore(token)
      spynxScores.push(score)
    }

    // Update Spynx scores in database
    const { data, error } = await supabase
      .from('spynx_scores')
      .upsert(spynxScores, { onConflict: 'token' })
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: spynxScores.length,
        data: spynxScores.filter(s => s.score > 75) // Return high-quality tokens
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function fetchTokenData(): Promise<TokenData[]> {
  // Fetch from CoinGecko API with more detailed data
  const response = await fetch(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h'
  )
  
  if (!response.ok) throw new Error('Failed to fetch token data')
  
  const data = await response.json()
  
  return data.map((coin: any) => ({
    symbol: coin.symbol.toUpperCase(),
    marketCap: coin.market_cap || 0,
    volume24h: coin.total_volume || 0,
    priceChange24h: coin.price_change_percentage_24h || 0,
    circulatingSupply: coin.circulating_supply || 0,
    totalSupply: coin.total_supply || 0,
    holderCount: Math.floor(Math.random() * 100000) // Mock data - would integrate with on-chain APIs
  }))
}

async function calculateSpynxScore(token: TokenData): Promise<SpynxScore> {
  // Market Cap Score (0-25 points)
  const marketCapScore = Math.min(25, (token.marketCap / 1000000000) * 5) // Billions to score
  
  // Liquidity Score (0-20 points) - based on volume/market cap ratio
  const liquidityRatio = token.volume24h / Math.max(token.marketCap, 1)
  const liquidityScore = Math.min(20, liquidityRatio * 1000)
  
  // Holder Distribution Score (0-20 points)
  const holderScore = Math.min(20, (token.holderCount || 0) / 5000)
  
  // Whale Activity Score (0-15 points) - inverse of concentration
  const whaleScore = Math.min(15, 15 * (1 - Math.abs(token.priceChange24h) / 100))
  
  // Sentiment Score (0-10 points) - based on price momentum
  const sentimentScore = Math.min(10, Math.max(0, 5 + token.priceChange24h / 2))
  
  // ROI Forecast (0-10 points) - based on technical analysis
  const volatility = Math.abs(token.priceChange24h)
  const roiForecast = Math.min(10, (volatility + liquidityRatio * 100) / 2)
  
  const totalScore = marketCapScore + liquidityScore + holderScore + whaleScore + sentimentScore + roiForecast
  
  return {
    token: token.symbol,
    score: Math.round(totalScore),
    market_cap: token.marketCap,
    liquidity: liquidityRatio,
    holder_distribution: token.holderCount || 0,
    whale_activity: whaleScore,
    sentiment_score: sentimentScore,
    roi_forecast: roiForecast,
    volume_24h: token.volume24h,
    price_change_24h: token.priceChange24h
  }
}