// Enhanced AI-powered sentiment analysis for crypto markets
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SentimentData {
  token: string
  sentiment_score: number
  social_volume: number
  trending_score: number
  fear_greed_index: number
  whale_movement_score: number
  news_sentiment: number
  technical_sentiment?: number
  overall_sentiment?: 'bullish' | 'bearish' | 'neutral'
  confidence?: number
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

    const { tokens } = await req.json()
    const tokensToAnalyze = tokens || ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'AVAX', 'MATIC']
    
    const sentimentData: SentimentData[] = []

    for (const token of tokensToAnalyze) {
      const sentiment = await analyzeSentiment(token)
      sentimentData.push(sentiment)
    }

    // Store sentiment data
    const { data, error } = await supabase
      .from('sentiment_analysis')
      .upsert(sentimentData, { onConflict: 'token' })
      .select()

    if (error) throw error

    // Generate sentiment-based alerts
    const strongSentiments = sentimentData.filter(s => 
      Math.abs(s.sentiment_score) > 0.7 || s.trending_score > 80
    )

    for (const sentiment of strongSentiments) {
      await generateSentimentAlert(sentiment)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analyzed: sentimentData.length,
        strong_sentiments: strongSentiments.length,
        data: sentimentData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function analyzeSentiment(token: string): Promise<SentimentData> {
  // Enhanced sentiment analysis with technical integration
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  // Get technical sentiment from recent signals
  const technicalSentiment = await getTechnicalSentiment(supabase, token)
  
  // Simulate comprehensive sentiment analysis
  const baseScore = (Math.random() - 0.5) * 2 // -1 to 1
  const socialVolume = Math.random() * 100
  const trendingScore = Math.random() * 100
  const fearGreed = Math.random() * 100
  const whaleMovement = Math.random() * 100
  const newsScore = (Math.random() - 0.5) * 2

  // Enhanced correlation between metrics including technical analysis
  const correlatedSentiment = baseScore + 
    (newsScore * 0.25) + 
    ((trendingScore - 50) / 100 * 0.25) +
    (technicalSentiment * 0.5) // Weight technical analysis heavily
  
  // Calculate overall sentiment and confidence
  const finalScore = Math.max(-1, Math.min(1, correlatedSentiment))
  const overallSentiment = finalScore > 0.3 ? 'bullish' : finalScore < -0.3 ? 'bearish' : 'neutral'
  const confidence = Math.abs(finalScore)
  
  return {
    token,
    sentiment_score: finalScore,
    social_volume: socialVolume,
    trending_score: trendingScore,
    fear_greed_index: fearGreed,
    whale_movement_score: whaleMovement,
    news_sentiment: newsScore,
    technical_sentiment: technicalSentiment,
    overall_sentiment: overallSentiment,
    confidence: confidence
  }
}

async function getTechnicalSentiment(supabase: any, token: string): Promise<number> {
  const symbol = `${token}USDT`
  
  const { data: recentSignals } = await supabase
    .from('signals')
    .select('direction, score, confidence')
    .eq('symbol', symbol)
    .eq('is_active', true)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  if (!recentSignals || recentSignals.length === 0) {
    return 0 // Neutral if no signals
  }

  // Calculate weighted technical sentiment
  let bullishWeight = 0
  let bearishWeight = 0
  let totalWeight = 0

  recentSignals.forEach(signal => {
    const weight = signal.score * (signal.confidence || 1)
    totalWeight += weight

    if (signal.direction === 'LONG') {
      bullishWeight += weight
    } else if (signal.direction === 'SHORT') {
      bearishWeight += weight
    }
  })

  if (totalWeight === 0) return 0
  
  const bullishRatio = bullishWeight / totalWeight
  return (bullishRatio - 0.5) * 2 // Convert to -1 to 1 scale
}

async function generateSentimentAlert(sentiment: SentimentData) {
  const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_SENTIMENT_CHAT_ID') || Deno.env.get('TELEGRAM_CHAT_ID')
  
  if (!telegramToken || !chatId) return

  let alertType = ''
  let emoji = ''
  
  if (sentiment.sentiment_score > 0.7) {
    alertType = 'BULLISH SENTIMENT SPIKE'
    emoji = '🔥📈'
  } else if (sentiment.sentiment_score < -0.7) {
    alertType = 'BEARISH SENTIMENT CRASH'
    emoji = '❄️📉'
  } else if (sentiment.trending_score > 80) {
    alertType = 'TRENDING ALERT'
    emoji = '🚨📊'
  } else {
    return // Don't send alert for neutral sentiment
  }

  const message = `
${emoji} *SENTIMENT ALERT* ${emoji}

🎯 *Token:* \`${sentiment.token}\`
📊 *Alert:* ${alertType}
💭 *Sentiment Score:* ${(sentiment.sentiment_score * 100).toFixed(1)}%
📈 *Trending Score:* ${sentiment.trending_score.toFixed(1)}%
🌊 *Social Volume:* ${sentiment.social_volume.toFixed(1)}
😱 *Fear/Greed:* ${sentiment.fear_greed_index.toFixed(1)}
🐋 *Whale Activity:* ${sentiment.whale_movement_score.toFixed(1)}%
📰 *News Sentiment:* ${(sentiment.news_sentiment * 100).toFixed(1)}%

⚡ *Consider combining with technical signals for optimal entry*

⏰ *${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC*
  `.trim()

  try {
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    })
  } catch (error) {
    console.error('Sentiment alert error:', error)
  }
}