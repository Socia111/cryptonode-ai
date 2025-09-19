# Bybit Automated Trading Setup - Quick Test Guide

## Setup Complete! 🎉

The automated trading system is now ready to test. Here's what's been configured:

### 1. Edge Function Created
- `bybit-order-execution` - Handles all Bybit API operations
- Routes: `/test`, `/order`, `/cancel`, `/positions`, `/balance`
- Proper CORS headers and error handling

### 2. Secrets Configured
You need to add these three secrets with your Bybit API credentials:
- `BYBIT_BASE` - Set to `https://api-testnet.bybit.com` (testnet) or `https://api.bybit.com` (live)
- `BYBIT_KEY` - Your Bybit API Key
- `BYBIT_SECRET` - Your Bybit API Secret

### 3. Quick Tests You Can Run Now

#### Test 1: Health Check
```bash
curl -s https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/bybit-order-execution/test
```
Expected: `{"ok":true,"time":{...},"me":{...},"base":"https://api-testnet.bybit.com"}`

#### Test 2: Small Market Order (Testnet)
```bash
curl -s -X POST https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/bybit-order-execution/order \
 -H 'content-type: application/json' \
 -d '{
   "category": "linear",
   "symbol": "BTCUSDT", 
   "side": "Buy",
   "orderType": "Market",
   "qty": "0.001",
   "timeInForce": "IOC",
   "orderLinkId": "unireli-test-001"
 }'
```

#### Test 3: Check Positions
```bash
curl -s "https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/bybit-order-execution/positions?category=linear"
```

#### Test 4: Check Balance
```bash
curl -s "https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/bybit-order-execution/balance?accountType=UNIFIED"
```

### 4. Next Steps

1. **Create Bybit API Key:**
   - Go to https://www.bybit.com/app/user/api-management
   - Create key with permissions: Trade (Spot + Contract), Orders/Positions, Wallet/Account, Market data
   - Add the credentials to your secrets

2. **Test the Health Check:**
   - Run the first curl command above
   - Should return success with your API info

3. **Test a Small Order (Testnet):**
   - Ensure you have testnet funds
   - Run the market order test above
   - Check your Bybit testnet interface for the order

4. **Wire to Auto-Trading:**
   - The system will automatically use this endpoint for live trading
   - Make sure `auto_execute_enabled = true` in user trading configs
   - Signals with 80%+ confidence will trigger automatic orders

### 5. Error Handling

The function includes specific error handling for common Bybit issues:
- **10010**: IP not whitelisted - add your server IP or disable IP restriction
- **10003**: Invalid API key
- **10004**: Signature expired - check server time
- **10005**: Invalid permissions - enable trading in API settings
- **10001**: Order size too small - try larger quantities
- **170074**: Insufficient balance

### 6. Production Deployment

When ready for live trading:
1. Change `BYBIT_BASE` to `https://api.bybit.com`
2. Use live API credentials (not testnet)
3. Test with small amounts first
4. Monitor the edge function logs for any issues

The system is now ready for automated trading! 🚀