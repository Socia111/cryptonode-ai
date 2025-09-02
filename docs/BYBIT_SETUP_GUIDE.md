# Bybit Real Trading Account Setup Guide

## ✅ Production Configuration Checklist

### Step 1: API Key Creation
1. **Go to Bybit Account**: Visit [bybit.com](https://www.bybit.com) and log in
2. **Navigate to API**: Account & Security → API Management
3. **Create API Key**: 
   - Select "System-generated API Keys" (HMAC encryption)
   - Name: `AItradeX1_Live_Trading`
   - **CRITICAL**: Enable these permissions:
     - ✅ **Spot Trading** (if using spot trading)
     - ✅ **Futures Trading** (if using futures/linear)
     - ✅ **Derivatives** (for perpetual contracts)
     - ✅ **Read** (for balance checks)
     - ❌ **Withdrawals** (NEVER enable for security)

### Step 2: IP Restriction Configuration
**Option A - Recommended**: Add Server IP
- Find your server's IP address
- Add it to the IP whitelist in API settings

**Option B - Less Secure**: Disable IP Restriction
- Only if you cannot determine server IP
- ⚠️ **Security Risk**: API can be used from any IP

### Step 3: Configure Secrets in Lovable
✅ **BYBIT_API_KEY**: Your API key from Step 1
✅ **BYBIT_API_SECRET**: Your secret key from Step 1

### Step 4: Production Endpoints
✅ **Mainnet**: `https://api.bybit.com` (Currently configured)
- Order creation: `/v5/order/create`
- Balance check: `/v5/account/wallet-balance`

### Step 5: Account Requirements
1. **KYC Verification**: Complete identity verification
2. **Trading Permissions**: Ensure spot/futures trading is enabled
3. **Account Balance**: Fund your account with USDT
4. **Risk Management**: Set appropriate position limits

## 🔧 Current System Configuration

### Authentication (✅ Ready)
- **Signature Algorithm**: HMAC-SHA256
- **Headers**: 
  - `X-BAPI-API-KEY`: Your API key
  - `X-BAPI-SIGN`: HMAC signature
  - `X-BAPI-TIMESTAMP`: UTC timestamp in milliseconds
  - `X-BAPI-RECV-WINDOW`: 5000ms (5 seconds)

### Supported Features
- ✅ **Market Orders**: Immediate execution
- ✅ **Stop Loss**: Automatic risk management
- ✅ **Take Profit**: Automatic profit taking
- ✅ **Balance Verification**: Pre-trade checks
- ✅ **Error Handling**: Detailed error messages
- ✅ **Order Tracking**: Unique order IDs

### Trading Categories
- **Spot Trading**: `category: "spot"`
- **Futures Trading**: `category: "linear"`

## 🚨 Common Issues & Solutions

### Error 10010: "Unmatched IP"
**Solution**: Add your server IP to Bybit API whitelist or disable IP restriction

### Error 10003: "Invalid API key"
**Solution**: Check API key is correctly entered in secrets

### Error 10005: "Invalid permissions"
**Solution**: Enable spot/futures trading permissions in Bybit API settings

### Error 110026: "Insufficient balance"
**Solution**: Add funds to your Bybit account

## 🔒 Security Best Practices

1. **Never enable withdrawal permissions**
2. **Use IP whitelisting when possible**
3. **Regularly rotate API keys**
4. **Monitor trading activity**
5. **Set position size limits**
6. **Use stop losses on all trades**

## 📊 Testing Before Live Trading

### Test Mode Available
```javascript
// Enable test mode for safe testing
{
  "testMode": true,
  "signal": { /* your signal data */ },
  "orderSize": "10",
  "category": "spot"
}
```

### Verification Steps
1. Test with small amounts first
2. Verify order execution in Bybit web interface
3. Check balance updates
4. Confirm stop loss/take profit setup

## 🎯 Ready for Production
- ✅ Production endpoints configured
- ✅ HMAC authentication implemented
- ✅ Error handling comprehensive
- ✅ Risk management features included
- ✅ Secrets management secure

Your system is now configured for **REAL MONEY TRADING** with Bybit!