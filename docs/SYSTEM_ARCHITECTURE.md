# AITRADEX1 System Architecture

## Data Flow Overview

```
Market Data → Signal Generation → Signal Storage → Trade Execution → Order Tracking
     ↓              ↓                   ↓              ↓              ↓
  Bybit API    Edge Functions      Supabase      Edge Functions   Database
```

## Component Relationships

### 1. Signal Generation Pipeline
- **Input**: Live market data from Bybit
- **Processing**: `unireli-core-scanner` edge function
- **Algorithm**: `unirail_core` (primary) or `quantum_ai`
- **Output**: Filtered signals (score ≥ 80) stored in `signals` table

### 2. Trade Execution Pipeline
- **Input**: High-scoring signals from database
- **Processing**: `aitradex1-trade-executor` edge function
- **Validation**: Symbol validation via `symbol-validator`
- **Output**: Executed orders stored in `execution_orders` table

### 3. User Management
- **Authentication**: Supabase Auth
- **API Keys**: Stored in `user_trading_accounts` (encrypted)
- **Preferences**: Stored in `trading_preferences`

## Security Architecture

### Row Level Security (RLS)
- User-specific data isolated by `auth.uid()`
- Service role has elevated permissions for automation
- Public read access for signal display

### API Key Security
- Bybit credentials encrypted in database
- Only accessible by authenticated users and service role
- No plain text storage

## Performance Considerations

### Caching Strategy
- `instruments_cache`: 5-minute cache for symbol validation
- `markets`: Static market metadata
- Real-time data: Direct API calls with minimal caching

### Scalability
- Edge functions auto-scale based on demand
- Database optimized with proper indexing
- Async processing for trade execution

## Monitoring & Observability

### Health Checks
- `diagnostics` function monitors all components
- Database connectivity tests
- Exchange API status checks
- Edge function availability

### Logging
- Trade execution logs in `trade_logs`
- Audit trail in `audit_log`
- Edge function logs via Supabase dashboard

## Disaster Recovery

### System Rebuild
- `rebuild-unireli-system.js` restores entire pipeline
- Database schema preserved via migrations
- Configuration backed up in `app_settings`

### Data Backup
- Supabase automatic backups
- Critical settings in version control
- API configurations stored securely