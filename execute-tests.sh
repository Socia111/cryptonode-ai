#!/bin/bash

echo "🚀 Executing AItradeX1 Test Suite Step by Step"
echo "=============================================="

# Make the test script executable
chmod +x run-test-step-by-step.js

# Run the comprehensive test suite
echo "📊 Running comprehensive test suite..."
node run-test-step-by-step.js

echo ""
echo "🔄 Running quick test suite..."
node quick-test.js

echo ""
echo "📡 Running live signals test..."
node test-live-signals.js

echo ""
echo "📱 Running Telegram signals test..."
node test-telegram-signals.js

echo ""
echo "⚡ Running all functions test..."
node test-all-functions.js

echo ""
echo "🎯 Running comprehensive system test..."
node comprehensive-test.js

echo ""
echo "✅ All test suites completed!"
echo "Check the output above for detailed results."