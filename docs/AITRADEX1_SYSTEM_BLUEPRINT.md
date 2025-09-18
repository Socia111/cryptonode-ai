# 🔧 AITRADEX1 System Architecture Blueprint

## Overview
Complete system architecture for AITRADEX1 - an automated crypto trading signal generation and execution platform.

---

## 🗃️ 1. Database Schema (PostgreSQL via Supabase)

### Core Tables:

- **signals** – stores all signal data (symbol, direction, score, algo, etc.)
- **execution_orders** – tracks executed trades
- **user_trading_accounts** – stores Bybit API keys & configuration
- **instruments_cache** – caches valid tradable symbols (for validation)
- **markets** – stores market metadata (used in validation)
- **app_settings** – stores global flags like LIVE_TRADING_ENABLED

### RLS Policies:

- **signals**: publicly readable (for display)
- **user_trading_accounts**: user-specific access
- **execution_orders**: user-specific access
- **markets, instruments_cache**: service role read access only

---

## ⚙️ 2. Edge Functions (Supabase Edge Functions)

| Function | Purpose |
|----------|---------|
| `signals-api` | Fetches recent, inserts new signals, checks status |
| `aitradex1-trade-executor` | Places real/paper trades, validates signals |
| `symbol-validator` | Validates symbol across linear/spot/inverse |
| `bybit-authenticate` | Saves user's Bybit credentials securely |
| `diagnostics` | System health and function testing |
| `unireli-core-scanner` | Real-time signal generation using unirail_core |

### Worker Scripts:
- `rebuild-unireli-system.js` – Restores entire signal→trade pipeline
- `start-unireli-feed.js` – Starts live signal generation worker

---

## 📡 3. Live Feed & Workers

### To generate live signals:
```bash
node start-unireli-feed.js
```

### To test full restoration:
```bash
node rebuild-unireli-system.js
```

### To test signal-to-trade pipeline:
```bash
node test-live-signals.js
```

---

## 🔐 4. Secrets & Env Setup (Supabase)

Ensure these are configured:

- `LIVE_TRADING_ENABLED`: true or false
- `BYBIT_API_KEY`
- `BYBIT_API_SECRET`
- `BYBIT_BASE_URL`: https://api.bybit.com or testnet
- `PAPER_TRADING`: false for real trading
- `SERVICE_ROLE_KEY`: required for internal edge functions

---

## 🎯 5. Signal Generation Logic

- **Primary Algorithm**: `unirail_core` (Sept 14th working algorithm)
- **Alternative**: `quantum_ai`
- **Timeframes**: 1m, 5m, 15m, 1h (multi-timeframe support)

### Signal Filtering:
- Score ≥ 80
- Direction: LONG or SHORT → translated to BUY/SELL
- Time + price + entry/exit configuration

---

## 📊 6. Monitoring & Testing

### Trade UI Tabs (in React):

- **📊 Status** – shows system health
- **🎯 Signals** – shows live database signals
- **🧪 Trading** – manual trade testing
- **🔄 Pipeline** – E2E signal-to-trade testing

### Test Components:
**LiveTradingEnabler.tsx** includes:
- Trigger test trade (BUY/SELL with leverage)
- Display result (mode: live/paper, order ID, etc.)

---

## ✅ Deployment Summary

| Component | Status |
|-----------|--------|
| Database Tables & Policies | ✅ |
| Supabase Edge Functions | ✅ |
| Live Feed Scripts | ✅ |
| Bybit Integration | ✅ |
| Authentication & RLS | ✅ |
| Real-time Signal Generation | ✅ |
| Signal to Trade Pipeline | ✅ |
| Diagnostics + Testing UI | ✅ |

---

## 🚀 Quick Start

1. **Setup Secrets**: Configure all required environment variables in Supabase
2. **Deploy Functions**: All edge functions auto-deploy with code changes
3. **Start Workers**: Run `node start-unireli-feed.js` for live signal generation
4. **Monitor**: Use the React dashboard to monitor system health and signals
5. **Test**: Use built-in testing components to verify trade execution

---

## 📖 Additional Documentation

- [Technical Documentation](./TECHNICAL_DOCUMENTATION.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Bybit Setup Guide](./BYBIT_SETUP_GUIDE.md)