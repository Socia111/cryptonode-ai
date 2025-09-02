# AItradeX1 API Documentation

## 🚀 **Edge Functions API Reference**

### **Base Configuration**

All edge functions are deployed on Supabase and accessible via:
```
Base URL: https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/
Authentication: Bearer token (JWT) or Service Role
Content-Type: application/json
```

---

## 📊 **Scanner Functions**

### **1. AItradeX1 Advanced Scanner**

**Endpoint:** `POST /aitradex1-advanced-scanner`

**Description:** Advanced trading logic with adaptive AI weighting and multi-timeframe analysis.

#### **Request Body**
```typescript
interface ScanRequest {
  symbols?: string[];           // Optional: specific symbols to scan
  timeframes?: string[];        // Optional: timeframes (5m, 15m, 30m, 1h, 2h, 4h)
  exchange?: string;           // Optional: exchange name (default: bybit)
  relaxed_filters?: boolean;   // Optional: use relaxed filtering
  confidence_threshold?: number; // Optional: minimum confidence score
}
```

#### **Example Request**
```bash
curl -X POST \
  https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/aitradex1-advanced-scanner \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
    "timeframes": ["15m", "1h"],
    "relaxed_filters": false,
    "confidence_threshold": 6
  }'
```

#### **Response**
```typescript
interface ScanResponse {
  success: boolean;
  signals: Signal[];
  metadata: {
    scan_duration_ms: number;
    symbols_processed: number;
    signals_generated: number;
    timestamp: string;
  };
}

interface Signal {
  id: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence_score: number;  // 0-7 for X2 system
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  signal_strength: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  conditions: {
    trend_bullish: boolean;
    momentum_oversold: boolean;
    trend_strength: boolean;
    directional_positive: boolean;
    volume_confirmed: boolean;
    volatility_expanding: boolean;
    stoch_entry: boolean;
  };
  indicators: {
    ema21: number;
    ema200: number;
    rsi: number;
    adx: number;
    plus_di: number;
    minus_di: number;
    volume_spike: boolean;
    hvp: number;
    stoch_k: number;
    stoch_d: number;
  };
  generated_at: string;
}
```

---

### **2. Bybit Comprehensive Scanner**

**Endpoint:** `POST /bybit-comprehensive-scanner`

**Description:** Comprehensive scanning of all Bybit USDT trading pairs with intelligent rate limiting.

#### **Request Body**
```typescript
interface ComprehensiveScanRequest {
  timeframes?: string[];        // Default: ["5m", "15m"]
  batch_size?: number;         // Default: 20
  rate_limit_delay?: number;   // Default: 100ms
  filter_conditions?: {
    min_volume_24h?: number;   // Minimum 24h volume
    min_market_cap?: number;   // Minimum market cap
    max_spread?: number;       // Maximum bid-ask spread
  };
}
```

#### **Example Request**
```bash
curl -X POST \
  https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/bybit-comprehensive-scanner \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timeframes": ["5m", "15m", "30m"],
    "batch_size": 25,
    "filter_conditions": {
      "min_volume_24h": 1000000,
      "max_spread": 0.5
    }
  }'
```

#### **Response**
```typescript
interface ComprehensiveScanResponse {
  success: boolean;
  scan_id: string;
  processing_status: 'completed' | 'partial' | 'failed';
  results: {
    total_symbols: number;
    processed_symbols: number;
    signals_generated: number;
    errors: number;
    scan_duration_ms: number;
  };
  signals: Signal[];
  errors?: ErrorLog[];
}

interface ErrorLog {
  symbol: string;
  error_code: string;
  error_message: string;
  timestamp: string;
}
```

---

### **3. Trigger Comprehensive Scan**

**Endpoint:** `POST /trigger-comprehensive-scan`

**Description:** Initiates a comprehensive market scan across all available symbols.

#### **Request Body**
```typescript
interface TriggerScanRequest {
  scan_type?: 'full' | 'quick' | 'targeted';
  target_symbols?: string[];
  notification_channels?: ('telegram' | 'webhook' | 'database')[];
  schedule?: {
    immediate: boolean;
    delayed_start?: string;  // ISO timestamp
    recurring?: {
      interval_minutes: number;
      max_iterations: number;
    };
  };
}
```

#### **Response**
```typescript
interface TriggerScanResponse {
  success: boolean;
  scan_id: string;
  status: 'queued' | 'started' | 'completed';
  estimated_duration_ms: number;
  webhook_url?: string;
  message: string;
}
```

---

## 🔍 **Analysis Functions**

### **4. Quantum Analysis**

**Endpoint:** `POST /quantum-analysis`

**Description:** Advanced market analysis using quantum-inspired algorithms.

#### **Request Body**
```typescript
interface QuantumAnalysisRequest {
  symbol: string;
  timeframe: string;
  analysis_depth?: 'basic' | 'standard' | 'deep';
  lookback_periods?: number;   // Default: 200
  include_forecasting?: boolean;
}
```

#### **Response**
```typescript
interface QuantumAnalysisResponse {
  success: boolean;
  symbol: string;
  timeframe: string;
  analysis: {
    market_phase: 'accumulation' | 'markup' | 'distribution' | 'decline';
    volatility_regime: 'low' | 'medium' | 'high' | 'extreme';
    momentum_strength: number;  // -1 to 1
    trend_persistence: number;  // 0 to 1
    support_resistance: {
      support_levels: number[];
      resistance_levels: number[];
      pivot_points: number[];
    };
    probability_matrix: {
      bullish_probability: number;
      bearish_probability: number;
      sideways_probability: number;
    };
    risk_metrics: {
      value_at_risk: number;
      expected_shortfall: number;
      maximum_drawdown: number;
    };
  };
  forecast?: {
    price_targets: {
      timeframe: string;
      bullish_target: number;
      bearish_target: number;
      confidence: number;
    }[];
    key_levels: number[];
  };
  generated_at: string;
}
```

---

### **5. Sentiment Analysis**

**Endpoint:** `POST /sentiment-analysis`

**Description:** Market sentiment evaluation from multiple data sources.

#### **Request Body**
```typescript
interface SentimentRequest {
  symbols?: string[];
  data_sources?: ('social' | 'news' | 'onchain' | 'options')[];
  timeframe?: '1h' | '4h' | '24h' | '7d';
}
```

#### **Response**
```typescript
interface SentimentResponse {
  success: boolean;
  sentiment_data: {
    [symbol: string]: {
      overall_sentiment: number;    // -1 to 1
      sentiment_strength: number;   // 0 to 1
      fear_greed_index: number;    // 0 to 100
      social_sentiment: {
        twitter_sentiment: number;
        reddit_sentiment: number;
        telegram_sentiment: number;
        mentions_count: number;
      };
      news_sentiment: {
        positive_articles: number;
        negative_articles: number;
        neutral_articles: number;
        overall_score: number;
      };
      onchain_metrics: {
        whale_activity: number;
        exchange_inflows: number;
        long_short_ratio: number;
        funding_rates: number;
      };
    };
  };
  metadata: {
    data_freshness: string;
    sources_used: string[];
    confidence_score: number;
  };
}
```

---

## 💼 **Trading Functions**

### **6. Trade Execution**

**Endpoint:** `POST /trade-execution`

**Description:** Execute trades based on generated signals.

#### **Request Body**
```typescript
interface TradeExecutionRequest {
  signal_id: string;
  execution_mode: 'paper' | 'live';
  position_sizing: {
    method: 'fixed' | 'percentage' | 'kelly' | 'risk_parity';
    value: number;
    max_position_size?: number;
  };
  risk_management: {
    stop_loss_type: 'fixed' | 'trailing' | 'atr';
    take_profit_type: 'fixed' | 'scaled' | 'trailing';
    max_risk_per_trade?: number;
  };
  execution_params?: {
    slippage_tolerance: number;
    execution_timeout_ms: number;
    partial_fills_allowed: boolean;
  };
}
```

#### **Response**
```typescript
interface TradeExecutionResponse {
  success: boolean;
  execution_id: string;
  order_details: {
    symbol: string;
    side: 'BUY' | 'SELL';
    order_type: 'MARKET' | 'LIMIT';
    quantity: number;
    price?: number;
    stop_loss: number;
    take_profit: number;
    status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected';
  };
  risk_metrics: {
    position_size: number;
    risk_amount: number;
    reward_potential: number;
    risk_reward_ratio: number;
  };
  execution_time_ms: number;
  fees?: {
    maker_fee: number;
    taker_fee: number;
    estimated_total: number;
  };
}
```

---

### **7. Bybit Order Execution**

**Endpoint:** `POST /bybit-order-execution`

**Description:** Direct order execution on Bybit exchange.

#### **Request Body**
```typescript
interface BybitOrderRequest {
  symbol: string;
  side: 'Buy' | 'Sell';
  order_type: 'Market' | 'Limit';
  quantity: number;
  price?: number;
  time_in_force?: 'GTC' | 'IOC' | 'FOK';
  reduce_only?: boolean;
  post_only?: boolean;
  order_link_id?: string;
}
```

#### **Response**
```typescript
interface BybitOrderResponse {
  success: boolean;
  order_id: string;
  order_link_id?: string;
  status: 'New' | 'PartiallyFilled' | 'Filled' | 'Cancelled' | 'Rejected';
  symbol: string;
  side: 'Buy' | 'Sell';
  order_type: 'Market' | 'Limit';
  quantity: number;
  filled_quantity: number;
  average_price?: number;
  fees: {
    trading_fee: number;
    funding_fee: number;
  };
  created_time: string;
  updated_time: string;
}
```

---

## 📊 **Scoring Functions**

### **8. Calculate Spynx Scores**

**Endpoint:** `POST /calculate-spynx-scores`

**Description:** Calculate proprietary Spynx scores for token evaluation.

#### **Request Body**
```typescript
interface SpynxScoreRequest {
  symbols?: string[];
  calculation_params?: {
    market_cap_weight: number;
    volume_weight: number;
    price_action_weight: number;
    liquidity_weight: number;
    sentiment_weight: number;
  };
  include_forecasting?: boolean;
}
```

#### **Response**
```typescript
interface SpynxScoreResponse {
  success: boolean;
  scores: {
    [symbol: string]: {
      overall_score: number;      // 0-100
      grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
      component_scores: {
        market_cap_score: number;
        volume_score: number;
        price_action_score: number;
        liquidity_score: number;
        sentiment_score: number;
        technical_score: number;
      };
      metrics: {
        market_cap: number;
        volume_24h: number;
        price_change_24h: number;
        liquidity_ratio: number;
        holder_count: number;
        whale_activity: number;
      };
      risk_assessment: {
        volatility_score: number;
        liquidity_risk: number;
        concentration_risk: number;
        overall_risk: 'LOW' | 'MEDIUM' | 'HIGH';
      };
      forecast?: {
        price_target_7d: number;
        price_target_30d: number;
        confidence: number;
      };
    };
  };
  metadata: {
    calculation_time: string;
    data_sources: string[];
    score_version: string;
  };
}
```

---

## 📈 **Backtesting Functions**

### **9. Backtest Engine**

**Endpoint:** `POST /backtest-engine`

**Description:** Historical strategy backtesting with comprehensive metrics.

#### **Request Body**
```typescript
interface BacktestRequest {
  strategy_config: {
    name: string;
    parameters: { [key: string]: any };
    entry_conditions: string[];
    exit_conditions: string[];
  };
  test_parameters: {
    symbols: string[];
    start_date: string;        // ISO date
    end_date: string;          // ISO date
    timeframe: string;
    initial_capital: number;
    commission_rate: number;
    slippage_rate: number;
  };
  risk_management: {
    position_sizing: 'fixed' | 'percentage' | 'kelly';
    max_position_size: number;
    stop_loss_pct: number;
    take_profit_pct: number;
  };
}
```

#### **Response**
```typescript
interface BacktestResponse {
  success: boolean;
  backtest_id: string;
  results: {
    performance_metrics: {
      total_return: number;
      annualized_return: number;
      volatility: number;
      sharpe_ratio: number;
      sortino_ratio: number;
      max_drawdown: number;
      calmar_ratio: number;
      win_rate: number;
      profit_factor: number;
    };
    trade_statistics: {
      total_trades: number;
      winning_trades: number;
      losing_trades: number;
      average_win: number;
      average_loss: number;
      largest_win: number;
      largest_loss: number;
      average_trade_duration: number;
    };
    monthly_returns: { [month: string]: number };
    drawdown_periods: {
      start_date: string;
      end_date: string;
      duration_days: number;
      drawdown_pct: number;
    }[];
    equity_curve: {
      date: string;
      equity: number;
      drawdown: number;
    }[];
  };
  strategy_analysis: {
    parameter_sensitivity: { [param: string]: number };
    market_condition_performance: {
      trending: number;
      sideways: number;
      volatile: number;
    };
    symbol_performance: { [symbol: string]: number };
  };
}
```

---

## 🔔 **Notification Functions**

### **10. Telegram Bot**

**Endpoint:** `POST /telegram-bot`

**Description:** Send trading signals and alerts via Telegram.

#### **Request Body**
```typescript
interface TelegramBotRequest {
  action: 'send_signal' | 'send_alert' | 'send_summary';
  channel_type: 'private' | 'public' | 'both';
  message_data: {
    signal?: Signal;
    alert?: {
      type: 'price_alert' | 'volume_alert' | 'technical_alert';
      symbol: string;
      message: string;
      priority: 'low' | 'medium' | 'high';
    };
    summary?: {
      period: '1h' | '4h' | '24h';
      signals_count: number;
      top_performers: string[];
    };
  };
  formatting?: {
    include_chart: boolean;
    include_analysis: boolean;
    use_markdown: boolean;
  };
}
```

#### **Response**
```typescript
interface TelegramBotResponse {
  success: boolean;
  message_id: string;
  channels_sent: string[];
  delivery_status: {
    private_channel: 'sent' | 'failed' | 'not_configured';
    public_channel: 'sent' | 'failed' | 'not_configured';
  };
  error_messages?: string[];
}
```

---

## 🔧 **Utility Functions**

### **11. Live Crypto Feed**

**Endpoint:** `GET /live-crypto-feed`

**Description:** Real-time cryptocurrency data feed.

#### **Query Parameters**
```typescript
interface LiveFeedParams {
  symbols?: string[];          // Comma-separated list
  data_types?: string[];       // price,volume,orderbook,trades
  update_frequency?: number;   // Seconds between updates
  include_historical?: boolean;
}
```

#### **Response**
```typescript
interface LiveFeedResponse {
  success: boolean;
  data: {
    [symbol: string]: {
      price: number;
      volume_24h: number;
      price_change_24h: number;
      price_change_pct_24h: number;
      high_24h: number;
      low_24h: number;
      last_updated: string;
      orderbook?: {
        bids: [number, number][];
        asks: [number, number][];
      };
      recent_trades?: {
        price: number;
        quantity: number;
        timestamp: string;
        side: 'buy' | 'sell';
      }[];
    };
  };
  metadata: {
    update_frequency: number;
    data_sources: string[];
    last_update: string;
  };
}
```

---

### **12. Production Monitor**

**Endpoint:** `GET /production-monitor`

**Description:** System health and performance monitoring.

#### **Response**
```typescript
interface ProductionMonitorResponse {
  success: boolean;
  system_status: 'healthy' | 'degraded' | 'critical';
  services: {
    database: {
      status: 'online' | 'offline' | 'degraded';
      response_time_ms: number;
      connection_count: number;
    };
    edge_functions: {
      status: 'online' | 'offline' | 'degraded';
      active_functions: number;
      average_execution_time: number;
      error_rate: number;
    };
    external_apis: {
      bybit: {
        status: 'online' | 'offline' | 'rate_limited';
        latency_ms: number;
        success_rate: number;
      };
      telegram: {
        status: 'online' | 'offline';
        message_queue_size: number;
      };
    };
  };
  performance_metrics: {
    total_requests_24h: number;
    average_response_time: number;
    error_rate_24h: number;
    active_signals: number;
    signals_generated_24h: number;
  };
  alerts: {
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
  }[];
}
```

---

## 🔒 **Authentication & Security**

### **JWT Token Authentication**

Most endpoints require JWT authentication:

```bash
curl -X POST \
  https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/endpoint-name \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### **Service Role Authentication**

For system-level operations:

```bash
curl -X POST \
  https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/endpoint-name \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### **Rate Limiting**

All endpoints implement rate limiting:

- **Public endpoints**: 120 requests/minute
- **Authenticated endpoints**: 600 requests/minute
- **Trading endpoints**: 100 orders/minute

### **Error Responses**

Standard error response format:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  request_id: string;
}
```

### **Common Error Codes**

- `INVALID_TOKEN`: Authentication failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `VALIDATION_ERROR`: Invalid request parameters
- `EXTERNAL_API_ERROR`: Third-party service error
- `INTERNAL_ERROR`: System error

---

## 📋 **SDK Examples**

### **JavaScript/TypeScript Client**

```typescript
class AItradeX1Client {
  constructor(
    private baseUrl: string,
    private authToken: string
  ) {}
  
  async scanMarkets(params: ScanRequest): Promise<ScanResponse> {
    const response = await fetch(`${this.baseUrl}/aitradex1-advanced-scanner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    return response.json();
  }
  
  async getSignals(filters?: any): Promise<Signal[]> {
    // Implementation for fetching stored signals
  }
  
  async executeTrade(tradeParams: TradeExecutionRequest): Promise<TradeExecutionResponse> {
    // Implementation for trade execution
  }
}

// Usage
const client = new AItradeX1Client(
  'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1',
  'your-jwt-token'
);

const scanResults = await client.scanMarkets({
  symbols: ['BTCUSDT', 'ETHUSDT'],
  timeframes: ['15m', '1h'],
  confidence_threshold: 6
});
```

### **Python Client**

```python
import requests
from typing import Dict, List, Optional

class AItradeX1Client:
    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }
    
    def scan_markets(self, params: Dict) -> Dict:
        response = requests.post(
            f'{self.base_url}/aitradex1-advanced-scanner',
            headers=self.headers,
            json=params
        )
        return response.json()
    
    def get_quantum_analysis(self, symbol: str, timeframe: str) -> Dict:
        response = requests.post(
            f'{self.base_url}/quantum-analysis',
            headers=self.headers,
            json={'symbol': symbol, 'timeframe': timeframe}
        )
        return response.json()

# Usage
client = AItradeX1Client(
    'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1',
    'your-jwt-token'
)

results = client.scan_markets({
    'symbols': ['BTCUSDT', 'ETHUSDT'],
    'timeframes': ['15m', '1h'],
    'confidence_threshold': 6
})
```

---

This comprehensive API documentation provides complete reference for integrating with all AItradeX1 edge functions and services.