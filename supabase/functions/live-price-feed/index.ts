import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WebSocket connections for real-time price feeds
const activeConnections = new Map();

// Major symbols for price tracking
const TRACKED_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
  'DOGEUSDT', 'SOLUSDT', 'DOTUSDT', 'MATICUSDT', 'AVAXUSDT'
];

class LivePriceFeed {
  private ws: WebSocket | null = null;
  private supabase: any;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: number | null = null;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async connect() {
    try {
      // Connect to Bybit WebSocket
      this.ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');
      
      this.ws.onopen = () => {
        console.log('📡 Connected to Bybit WebSocket');
        this.reconnectAttempts = 0;
        
        // Subscribe to ticker data for all tracked symbols
        const subscribeMessage = {
          op: 'subscribe',
          args: TRACKED_SYMBOLS.map(symbol => `tickers.${symbol}`)
        };
        
        this.ws?.send(JSON.stringify(subscribeMessage));
        
        // Set up heartbeat
        this.heartbeatInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ op: 'ping' }));
          }
        }, 30000);
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.topic && data.topic.startsWith('tickers.') && data.data) {
            const tickerData = data.data;
            const symbol = tickerData.symbol;
            
            const priceUpdate = {
              symbol,
              price: parseFloat(tickerData.lastPrice),
              change24h: parseFloat(tickerData.price24hPcnt) * 100,
              volume24h: parseFloat(tickerData.volume24h),
              high24h: parseFloat(tickerData.highPrice24h),
              low24h: parseFloat(tickerData.lowPrice24h),
              timestamp: new Date().toISOString(),
              source: 'bybit_ws'
            };

            // Store in database for historical tracking
            await this.storePriceData(priceUpdate);
            
            // Broadcast to connected clients
            this.broadcastPriceUpdate(priceUpdate);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('📡 WebSocket connection closed');
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
        }
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('📡 WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private async storePriceData(priceUpdate: any) {
    try {
      await this.supabase
        .from('live_prices')
        .upsert({
          symbol: priceUpdate.symbol,
          price: priceUpdate.price,
          change_24h: priceUpdate.change24h,
          volume_24h: priceUpdate.volume24h,
          high_24h: priceUpdate.high24h,
          low_24h: priceUpdate.low24h,
          last_updated: priceUpdate.timestamp
        }, { 
          onConflict: 'symbol',
          ignoreDuplicates: false 
        });
    } catch (error) {
      console.error('Failed to store price data:', error);
    }
  }

  private broadcastPriceUpdate(priceUpdate: any) {
    // Send to all connected clients via Supabase realtime
    this.supabase.channel('live-prices').send({
      type: 'broadcast',
      event: 'price_update',
      payload: priceUpdate
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`📡 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('📡 Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'start';

    if (action === 'start') {
      // Start live price feed
      const priceFeed = new LivePriceFeed(supabase);
      await priceFeed.connect();

      // Keep the function alive
      setTimeout(() => {
        console.log('📡 Live price feed session timeout');
      }, 300000); // 5 minutes

      return new Response(JSON.stringify({
        success: true,
        message: 'Live price feed started',
        symbols: TRACKED_SYMBOLS,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'status') {
      // Get current price data
      const { data: prices, error } = await supabase
        .from('live_prices')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(10);

      return new Response(JSON.stringify({
        success: true,
        prices: prices || [],
        tracked_symbols: TRACKED_SYMBOLS,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      message: 'Invalid action. Use ?action=start or ?action=status'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Live price feed error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
