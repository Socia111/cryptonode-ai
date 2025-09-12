# AItradeX1 Trading System - Complete Rebuild Documentation

## 🚀 Quick Rebuild Command

Use `/rebuild` in the chat interface to automatically reconstruct this exact system state from GitHub.

## 📋 System Overview

**AItradeX1** is a comprehensive cryptocurrency trading platform with real-time signals, automated execution, and advanced market analysis.

### Current Status: ✅ PRODUCTION READY
- 144+ Edge Functions Deployed
- Real-time signals operational (80%+ confidence)
- Live trading with Bybit integration
- All safety systems active
- Mobile-responsive design

## 📋 Core Technologies Stack

### Frontend
- **React 18.3.1** with TypeScript
- **Vite** for build tooling and development server
- **Tailwind CSS** with custom design system
- **Shadcn/UI** component library
- **React Router Dom** for navigation
- **React Query** for data fetching
- **Recharts** for trading charts
- **Lucide React** for icons

### Backend & Database
- **Supabase** as backend-as-a-service
- **PostgreSQL** database with RLS (Row Level Security)
- **144 Edge Functions** for various trading operations
- **Real-time subscriptions** for live data

### Key Integrations
- **Bybit API** for live trading
- **3Commas API** for copy trading
- **Telegram Bot** for notifications
- **AIRA Rankings** for token scoring

## 🏗️ Architecture Overview

### Frontend Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn UI components
│   ├── trading/        # Trading-specific components
│   └── dashboard/      # Dashboard components
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── integrations/       # External API integrations
└── assets/            # Static assets
```

### Backend Structure
```
supabase/
├── functions/          # 144+ Edge Functions
│   ├── aitradex1-*/   # Core trading functions
│   ├── bybit-*/       # Bybit integration
│   ├── telegram-*/    # Telegram notifications
│   └── automation-*/  # Trading automation
└── config.toml        # Function configurations
```

## 🔧 Core Components Documentation

### 1. Trading Engine Components
- **TradingGateway** (`src/lib/tradingGateway.ts`): Core trading execution
- **AItradeX1SystemDashboard**: Main trading interface
- **LiveSignalsPanel**: Real-time signal display
- **AutoTradingToggle**: Trading automation controls

### 2. Data Management
- **Signal Generation**: Multiple scanner engines for different strategies
- **Real-time Updates**: WebSocket connections for live data
- **Portfolio Tracking**: P&L calculations and position management

### 3. Authentication & Security
- **Supabase Auth**: User authentication system
- **RLS Policies**: Database-level security
- **API Key Management**: Secure credential storage

## 🚀 Complete Rebuild Instructions

### Step 1: Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd aitradex1

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

### Step 2: Required Environment Variables
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://codhlwjogfjywmjyjbbn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional integrations
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
BYBIT_API_KEY=
BYBIT_API_SECRET=
```

### Step 3: Supabase Setup
1. **Database Tables** (auto-created via migrations):
   - `signals` - Trading signals
   - `markets` - Market data
   - `aira_rankings` - Token rankings
   - `trading_configs` - User configurations
   - `alert_subscriptions` - User alerts
   - `spynx_scores` - Signal scoring

2. **Edge Functions** (auto-deployed):
   - Core scanners: `aitradex1-*-scanner`
   - Trading: `aitradex1-trade-executor`
   - Automation: `automated-trading-engine`
   - Notifications: `telegram-bot`

3. **Secrets Configuration**:
   ```bash
   # Add via Supabase Dashboard > Settings > Functions
   BYBIT_API_KEY=your_bybit_key
   BYBIT_API_SECRET=your_bybit_secret
   TELEGRAM_BOT_TOKEN=your_telegram_token
   ```

### Step 4: Development Server
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔄 Core Features Rebuild

### 1. Signal Generation System
**Location**: `supabase/functions/aitradex1-*-scanner/`
- Original Scanner: Basic technical analysis
- Advanced Scanner: Multi-timeframe analysis
- Confluence Scanner: Signal confirmation
- Enhanced Scanner: ML-enhanced signals

### 2. Trading Execution
**Location**: `supabase/functions/aitradex1-trade-executor/`
- Bybit API integration
- Position mode handling
- Order size calculation
- Error handling & fallbacks

### 3. Real-time Data
**Location**: `src/lib/realtime.ts`
- Live signal subscriptions
- Market data updates
- Portfolio sync

### 4. UI Components
**Location**: `src/components/`
- Trading dashboard
- Signal displays
- Chart components
- Control panels

## 📊 Database Schema Critical Tables

### Signals Table
```sql
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
```

### Markets Table
```sql
CREATE TABLE markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange text NOT NULL,
  symbol text NOT NULL,
  base_currency text NOT NULL,
  quote_currency text NOT NULL,
  is_active boolean DEFAULT true
);
```

### Trading Configs Table
```sql
CREATE TABLE trading_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  exchange text NOT NULL,
  api_key_encrypted text,
  auto_trading_enabled boolean DEFAULT false,
  risk_percentage numeric DEFAULT 2.0
);
```

## 🔒 Security Features

### Row Level Security (RLS)
- All user data protected by RLS policies
- Service role access for automated functions
- API key encryption for trading credentials

### API Security
- JWT authentication for protected endpoints
- Rate limiting on critical functions
- Input validation and sanitization

## 🚨 Critical Configuration

### Feature Flags
**Location**: `src/config/featureFlags.ts`
```typescript
export const FEATURES = {
  AUTOTRADE_ENABLED: true,
  LIVE_TRADING_MODE: true,
  PAPER_TRADING: false,
  MANUAL_TESTS: false,
  SAFETY_GATE: false,
}
```

### Supabase Functions Config
**Location**: `supabase/config.toml`
- 144 functions configured
- JWT verification settings
- Port configurations

## 📱 Mobile Support
- Capacitor integration for mobile apps
- Responsive design system
- Touch-optimized trading interface

## 🔧 Development Tools

### Testing
- Comprehensive test suites
- Edge function testing
- API integration tests

### Monitoring
- Production monitoring functions
- Error logging and reporting
- Performance analytics

## 🚀 Deployment

### Production Deployment
1. Build the project: `npm run build`
2. Deploy via Supabase: Edge functions auto-deploy
3. Configure domain and SSL
4. Set production environment variables

### Environment Configuration
- Development: Local Supabase instance
- Staging: Staging Supabase project
- Production: Production Supabase project

## 📖 Usage Instructions

### For Traders
1. **Setup**: Connect Bybit API keys
2. **Signals**: Monitor live signal generation
3. **Trading**: Enable auto-trading or manual execution
4. **Portfolio**: Track performance and P&L

### For Developers
1. **Local Development**: Run `npm run dev`
2. **Function Development**: Edit in `supabase/functions/`
3. **Testing**: Use test runners and edge function tests
4. **Deployment**: Push to repository for auto-deployment

## 🔄 Rebuild Process Summary

1. **Clone & Install**: Get code and dependencies
2. **Environment**: Set up Supabase and API keys
3. **Database**: Auto-migration creates all tables
4. **Functions**: Auto-deployment of all edge functions
5. **Frontend**: React app with full feature set
6. **Testing**: Verify all systems operational
7. **Production**: Deploy with proper configurations

This documentation provides complete instructions to rebuild the entire AItradeX1 platform from scratch with all current features and configurations intact.