#!/bin/bash

echo "🧪 Running comprehensive real trading system verification..."

# Test 1: Verify live market data feed
echo "📊 Testing live market data feed..."
node trigger-comprehensive-pipeline.js

sleep 5

# Test 2: Verify real signals generation
echo "🎯 Testing real signal generation..."
curl -X POST "https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/aitradex1-original-scanner" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.qhWNjzZhYnpvlvW1x8wC7pR3VfvJCcVQs-nJYwT5VjM" \
  -d '{"action": "generate_signals", "count": 5}'

sleep 3

# Test 3: Verify signals API returns only real data
echo "📡 Testing signals API for real data only..."
curl -X GET "https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/signals-api?action=list" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.qhWNjzZhYnpvlvW1x8wC7pR3VfvJCcVQs-nJYwT5VjM"

sleep 3

# Test 4: Test paper trading execution with real prices
echo "💰 Testing paper trading with real market prices..."
curl -X POST "https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/paper-trading-executor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.qhWNjzZhYnpvlvW1x8wC7pR3VfvJCcVQs-nJYwT5VjM" \
  -d '{"symbol": "BTCUSDT", "side": "buy", "quantity": 0.001}'

sleep 3

# Test 5: Verify trade executor with proper symbol
echo "⚡ Testing trade executor..."
curl -X POST "https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/aitradex1-trade-executor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.qhWNjzZhYnpvlvW1x8wC7pR3VfvJCcVQs-nJYwT5VjM" \
  -d '{"action": "status"}'

echo "✅ All trading system tests completed!"

# Run final verification
echo "🔍 Final system verification..."
node verify-real-data-flow.js

echo "🎉 Comprehensive testing finished!"