# AItradeX1 GitHub Rebuild Memo

## 🎯 Executive Summary
This memo contains complete documentation for rebuilding the AItradeX1 cryptocurrency trading platform from scratch. The system includes frontend React application, backend Supabase functions, real-time trading capabilities, and comprehensive integrations.

## 🚀 Quick Rebuild Command
```bash
# In browser console or URL:
/rebuild
# OR
window.location.href = '/rebuild?rebuild=true'
# OR visit directly
https://your-domain.com/rebuild
```

## 📋 Complete System Architecture

### Technology Stack
- **Frontend**: React 18.3.1 + TypeScript + Vite + Tailwind CSS + Shadcn/UI
- **Backend**: Supabase with 144 Edge Functions
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: WebSocket subscriptions for live data
- **Trading**: Bybit API integration with automated execution
- **Notifications**: Telegram bot integration
- **Charts**: Recharts for trading visualizations

### Core Dependencies
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.56.0",
    "@tanstack/react-query": "^5.83.0",
    "react": "^18.3.1",
    "react-router-dom": "^6.30.1",
    "recharts": "^2.15.4",
    "tailwindcss": "^3.4.17",
    "lucide-react": "^0.462.0"
  }
}
```

## 🏗️ File Structure for Rebuild

### Critical Frontend Files
```
src/
├── App.tsx                              # Main app with routing
├── main.tsx                             # Entry point
├── index.css                            # Global styles + design tokens
├── components/
│   ├── AItradeX1SystemDashboard.tsx     # Main trading interface
│   ├── LiveSignalsPanel.tsx             # Real-time signals
│   ├── AutoTradingToggle.tsx            # Trading controls
│   ├── TradingChart.tsx                 # Price charts
│   ├── PortfolioStats.tsx               # Portfolio tracking
│   ├── RebuildConsole.tsx               # Rebuild system
│   └── ui/                              # Shadcn components
├── lib/
│   ├── tradingGateway.ts                # Trading execution
│   ├── supabaseClient.ts                # Database client
│   ├── realtime.ts                      # Live data subscriptions
│   ├── rebuildSystem.ts                 # Rebuild functionality
│   └── commandProcessor.ts              # Command system
├── hooks/
│   ├── useRebuild.ts                    # Rebuild hook
│   ├── useSignals.ts                    # Signals management
│   └── useRankedSignals.ts              # Signal ranking
├── pages/
│   ├── Index.tsx                        # Landing page
│   ├── Trade.tsx                        # Trading page
│   ├── Signals.tsx                      # Signals page
│   ├── Portfolio.tsx                    # Portfolio page
│   └── Settings.tsx                     # Settings page
└── config/
    └── featureFlags.ts                  # Feature toggles
```

### Critical Backend Files
```
supabase/
├── config.toml                          # Edge functions config
└── functions/
    ├── aitradex1-trade-executor/         # Core trading execution
    ├── aitradex1-original-scanner/       # Signal generation
    ├── aitradex1-advanced-scanner/       # Advanced signals
    ├── aitradex1-confluence-scanner/     # Signal confirmation
    ├── bybit-comprehensive-scanner/      # Market scanning
    ├── live-scanner-production/          # Production scanner
    ├── telegram-bot/                     # Notifications
    ├── automated-trading-engine/         # Auto trading
    └── [141 more functions]              # Complete function list
```

## 🗄️ Database Schema

### Core Tables
```sql
-- Trading signals
CREATE TABLE signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange text NOT NULL,
  symbol text NOT NULL,
  timeframe text NOT NULL,
  direction text NOT NULL,
  score numeric NOT NULL,
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  generated_at timestamp with time zone DEFAULT now()
);

-- Market data
CREATE TABLE markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange text NOT NULL,
  symbol text NOT NULL,
  base_currency text NOT NULL,
  quote_currency text NOT NULL,
  is_active boolean DEFAULT true
);

-- Token rankings
CREATE TABLE aira_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_symbol text NOT NULL,
  token_name text NOT NULL,
  rank_position integer NOT NULL,
  score numeric,
  market_cap numeric,
  volume_24h numeric,
  last_updated timestamp with time zone DEFAULT now()
);

-- User trading configurations
CREATE TABLE trading_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  exchange text NOT NULL,
  auto_trading_enabled boolean DEFAULT false,
  risk_percentage numeric DEFAULT 2.0,
  api_key_encrypted text
);

-- Alert subscriptions
CREATE TABLE alert_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  type text NOT NULL,
  target text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Signal scoring
CREATE TABLE spynx_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES signals(id),
  technical_score numeric,
  sentiment_score numeric,
  volume_score numeric,
  total_score numeric,
  calculated_at timestamp with time zone DEFAULT now()
);
```

## ⚙️ Environment Configuration

### Required Environment Variables
```env
# Supabase (Required)
VITE_SUPABASE_URL=https://codhlwjogfjywmjyjbbn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Trading (Optional but recommended)
BYBIT_API_KEY=your_bybit_api_key
BYBIT_API_SECRET=your_bybit_api_secret

# Notifications (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Additional (Optional)
DEFAULT_EXCHANGE=bybit
DEFAULT_TIMEFRAME=1h
```

### Supabase Edge Function Secrets
```bash
# Add via Supabase Dashboard > Settings > Functions
BYBIT_API_KEY=your_bybit_key
BYBIT_API_SECRET=your_bybit_secret
TELEGRAM_BOT_TOKEN=your_telegram_token
TELEGRAM_FREE_BOT_TOKEN=free_signals_bot
TELEGRAM_PAID_BOT_TOKEN=premium_signals_bot
TELEGRAM_FREE_CHAT_ID=free_chat_id
TELEGRAM_PAID_CHAT_ID=premium_chat_id
```

## 🔧 Feature Flags Configuration
```typescript
// src/config/featureFlags.ts
export const FEATURES = {
  AUTOTRADE_ENABLED: true,    // Enable automated trading
  LIVE_TRADING_MODE: true,    // Live trading vs simulation
  PAPER_TRADING: false,       // Hide paper trading UI
  MANUAL_TESTS: false,        // Hide manual testing components
  SAFETY_GATE: false,         // Disable safety confirmation for trades
}
```

## 🚀 Complete Rebuild Process

### Step 1: Repository Setup
```bash
# Clone or create new repository
git clone <repository-url> aitradex1
cd aitradex1

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Step 2: Supabase Project Setup
```bash
# Create new Supabase project at https://supabase.com
# Note your project URL and keys
# Add to .env file

# Database will auto-migrate on first function call
# Edge functions will auto-deploy on code push
```

### Step 3: Frontend Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Step 4: Backend Configuration
1. **Edge Functions**: Auto-deploy on repository push
2. **Database**: Auto-creates tables via migrations
3. **Secrets**: Add via Supabase Dashboard > Functions > Settings
4. **RLS Policies**: Auto-applied for security

### Step 5: Trading Integration
1. **Bybit Setup**: Add API keys to Supabase secrets
2. **Test Trading**: Use `/trade` page with test mode
3. **Live Trading**: Enable auto-trading in settings
4. **Monitoring**: Check logs via Supabase Functions dashboard

### Step 6: Real-time Features
1. **Signal Generation**: Auto-runs every few minutes
2. **Live Updates**: WebSocket subscriptions active
3. **Notifications**: Telegram bot sends alerts
4. **Portfolio Sync**: Real-time P&L tracking

## 🔒 Security Implementation

### Row Level Security (RLS)
```sql
-- All user data protected by RLS
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- Example RLS policy
CREATE POLICY "Users can view their own configs" ON trading_configs
FOR SELECT USING (auth.uid() = user_id);
```

### API Security
- JWT authentication for protected endpoints
- Rate limiting on critical functions
- Input validation and sanitization
- Encrypted storage of API keys

## 📊 Key Features Breakdown

### 1. Signal Generation System
- **Multiple Scanners**: Original, Advanced, Confluence, Enhanced
- **Real-time Processing**: Continuous market analysis
- **Scoring System**: Proprietary SPYNX scoring algorithm
- **Multi-timeframe**: 5m, 15m, 30m, 1h, 2h, 4h, 1d

### 2. Trading Execution
- **Bybit Integration**: Direct API trading
- **Position Management**: Automated position sizing
- **Risk Management**: Stop loss and take profit
- **Error Handling**: Comprehensive fallback system

### 3. Portfolio Management
- **Real-time P&L**: Live profit/loss tracking
- **Position Monitoring**: Current holdings display
- **Performance Analytics**: Historical performance
- **Risk Metrics**: Portfolio risk assessment

### 4. User Interface
- **Trading Dashboard**: Comprehensive trading interface
- **Signal Display**: Real-time signal visualization
- **Chart Integration**: Advanced price charts
- **Mobile Responsive**: Works on all devices

### 5. Automation Features
- **Auto-trading**: Automated signal execution
- **Schedule Trading**: Time-based trading rules
- **Risk Controls**: Automated risk management
- **Notification System**: Real-time alerts

## 🧪 Testing & Validation

### Automated Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:components
npm run test:functions
npm run test:integration
```

### Manual Testing
1. **Signal Generation**: Verify signals appear in dashboard
2. **Trading Execution**: Test buy/sell operations
3. **Real-time Updates**: Confirm live data updates
4. **Portfolio Sync**: Check P&L calculations
5. **Notifications**: Test Telegram alerts

### Production Validation
1. **Function Health**: All 144 functions operational
2. **Database Connectivity**: All tables accessible
3. **API Integrations**: Bybit, Telegram, AIRA working
4. **Security**: RLS policies active
5. **Performance**: Sub-second response times

## 🚀 Deployment Instructions

### Development Deployment
```bash
npm run dev
# Access at http://localhost:8080
```

### Production Deployment
```bash
# Build application
npm run build

# Deploy to hosting provider
# Configure environment variables
# Set up custom domain
# Enable SSL certificate
```

### Supabase Deployment
- Functions auto-deploy on git push
- Database migrations run automatically
- Secrets configured via dashboard
- Monitoring available in Supabase dashboard

## 🔄 Maintenance & Updates

### Regular Maintenance
1. **Function Logs**: Monitor edge function performance
2. **Database Health**: Check query performance
3. **API Limits**: Monitor rate limits and usage
4. **Security Updates**: Regular dependency updates

### Feature Updates
1. **New Scanners**: Add additional signal strategies
2. **Exchange Integration**: Support more exchanges
3. **UI Improvements**: Enhanced user experience
4. **Performance Optimization**: Faster execution

## 📞 Support & Troubleshooting

### Common Issues
1. **"Engine not defined"**: Restart edge functions
2. **"Not enough for new order"**: Check minimum order size
3. **"Position idx not match"**: Bybit position mode issue
4. **Real-time not working**: Check WebSocket connections

### Debug Commands
```javascript
// In browser console
/rebuild          // Rebuild entire system
/status          // Show system status
/validate        // Validate system integrity
/help            // Show available commands
```

### Emergency Recovery
```bash
# Reset to working state
git reset --hard 5872916  # Known working commit
npm install
npm run dev
```

## 📝 Final Notes

This memo contains everything needed to rebuild the AItradeX1 platform from scratch. The system is designed for resilience with automatic recovery, comprehensive error handling, and complete documentation.

### Success Criteria
- ✅ All 144 edge functions operational
- ✅ Real-time signal generation active
- ✅ Trading execution working
- ✅ Portfolio tracking accurate
- ✅ Security policies enforced
- ✅ Mobile responsive design
- ✅ Notification system active

### Version Info
- **Current Version**: 1.0.0
- **Last Updated**: September 2025
- **Commit Hash**: 5872916 (known working state)
- **Features**: 144 edge functions, real-time trading, automated signals

For immediate rebuild, use the `/rebuild` command or visit `/rebuild` route in the application.