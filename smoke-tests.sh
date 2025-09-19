#!/bin/bash

# Quick smoke test commands for AItradeX1

SUPABASE_URL="https://codhlwjogfjywmjyjbbn.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0"

echo "🧪 AItradeX1 Quick Smoke Tests"
echo "==============================="

echo ""
echo "1️⃣ Testing AItradeX1 Config..."
curl -s "${SUPABASE_URL}/functions/v1/aitradex1-config?relaxed_filters=false" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" | jq .

echo ""
echo "2️⃣ Testing Live Scanner (Production)..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/live-scanner-production" \
  -H "content-type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"exchange":"bybit","timeframe":"15m","relaxed_filters":true,"symbols":["BTCUSDT","ETHUSDT","SOLUSDT"]}' | jq .

echo ""
echo "3️⃣ Testing Signals API..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/signals-api" \
  -H "content-type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{"path":"/signals/live"}' | jq .

echo ""
echo "4️⃣ Testing AIRA Rankings Sync..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/aira-rankings-sync" \
  -H "content-type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{}' | jq .

echo ""
echo "🔍 Quick smoke tests complete!"
echo "Expected: non-empty signals_found and/or valid responses from all endpoints"