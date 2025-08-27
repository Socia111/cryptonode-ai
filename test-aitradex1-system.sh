#!/bin/bash

# AItradeX1 Comprehensive System Test Script
# Tests all backend functions, APIs, and integrations

echo "🚀 Starting AItradeX1 Comprehensive System Tests"
echo "=============================================="

# Configuration
SUPABASE_URL="https://codhlwjogfjywmjyjbbn.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0"

# Test 1: Configuration API
echo "📋 Test 1: Configuration API"
echo "-----------------------------"
echo "Testing canonical config..."
curl -s -X GET "${SUPABASE_URL}/functions/v1/aitradex1-config?relaxed_filters=false" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" | jq '.config.inputs | {adxThreshold, hvpLower, hvpUpper}'

echo -e "\nTesting relaxed config..."
curl -s -X GET "${SUPABASE_URL}/functions/v1/aitradex1-config?relaxed_filters=true" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" | jq '.config.inputs | {adxThreshold, hvpLower, hvpUpper}'

# Test 2: Live Scanner Production (Real Data)
echo -e "\n🔄 Test 2: Live Scanner Production (Real Market Data)"
echo "-----------------------------------------------------"
echo "Testing 1m discovery scan (relaxed)..."
SCAN_RESULT=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/live-scanner-production" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"exchange":"bybit","timeframe":"1m","relaxed_filters":true}')

echo $SCAN_RESULT | jq '{success, algorithm, symbols_scanned, signals_found, signals_processed}'

echo -e "\nTesting 1h canonical scan..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/live-scanner-production" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"exchange":"bybit","timeframe":"1h","relaxed_filters":false}' | jq '{success, algorithm, symbols_scanned, signals_found, signals_processed}'

# Test 3: Scanner Engine
echo -e "\n⚡ Test 3: Scanner Engine"
echo "------------------------"
curl -s -X POST "${SUPABASE_URL}/functions/v1/scanner-engine" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"exchange":"bybit","timeframe":"15m","relaxed_filters":false}' | jq '{success, signals_count, symbols_scanned}'

# Test 4: Signals API (Frontend)
echo -e "\n📡 Test 4: Signals API (Frontend)"
echo "---------------------------------"
curl -s -X POST "${SUPABASE_URL}/functions/v1/signals-api" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" | jq '{success, count: (.items | length), latest_signal: .items[0] | {symbol, direction, score, timeframe}}'

# Test 5: Telegram Bot (Test Signal)
echo -e "\n📱 Test 5: Telegram Bot Integration"
echo "-----------------------------------"
TEST_SIGNAL=$(cat << 'EOF'
{
  "signal": {
    "token": "BTCUSDT",
    "direction": "LONG",
    "entry_price": 65000,
    "confidence_score": 89.5,
    "stop_loss": 64000,
    "take_profit": 67000,
    "timeframe": "1h",
    "exchange": "bybit",
    "indicators": {
      "hvp": 75.2,
      "atr": 312.45
    }
  }
}
EOF
)

curl -s -X POST "${SUPABASE_URL}/functions/v1/telegram-bot" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "$TEST_SIGNAL" | jq '{success, message}'

# Test 6: Enhanced Signal Generation
echo -e "\n🎯 Test 6: Enhanced Signal Generation"
echo "------------------------------------"
curl -s -X POST "${SUPABASE_URL}/functions/v1/enhanced-signal-generation" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"symbols":["BTCUSDT","ETHUSDT"],"timeframes":["1h"],"exchange":"bybit"}' | jq '{success, signals_generated}'

# Test 7: Backtest Engine
echo -e "\n📈 Test 7: Backtest Engine"
echo "--------------------------"
curl -s -X POST "${SUPABASE_URL}/functions/v1/backtest-engine" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","start_date":"2025-08-20","end_date":"2025-08-27","timeframe":"1h","strategy":"AItradeX1"}' | jq '{success, total_trades, win_rate, total_return}'

# Test 8: Database Health Check
echo -e "\n🗄️  Test 8: Database Health Check"
echo "---------------------------------"
echo "Recent signals (last 1 hour):"
curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/check_signals_health" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" || echo "RPC function not available, checking directly..."

# Direct database check
echo "Checking signals table directly..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/signals?select=created_at,symbol,direction,score,timeframe&order=created_at.desc&limit=5" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" | jq '.[] | {created_at, symbol, direction, score, timeframe}'

# Test 9: Cron Jobs Status
echo -e "\n⏰ Test 9: Cron Jobs Status"
echo "---------------------------"
curl -s -X GET "${SUPABASE_URL}/rest/v1/rpc/check_cron_status" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" || echo "Cron status check not available"

# Test 10: Error Logs Check
echo -e "\n🚨 Test 10: Error Logs Check"
echo "----------------------------"
curl -s -X GET "${SUPABASE_URL}/rest/v1/errors_log?select=created_at,where_at,details&order=created_at.desc&limit=3" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" | jq '.[] | {created_at, where_at, error: .details.error}'

echo -e "\n✅ AItradeX1 System Tests Completed!"
echo "===================================="
echo "Check the results above for any failures or issues."
echo "All functions should return success: true for a healthy system."