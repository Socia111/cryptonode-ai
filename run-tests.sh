#!/bin/bash

echo "🚀 Running AItradeX1 Complete Test Suite"
echo "========================================"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ to run tests."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the comprehensive test suite
echo "🔍 Starting comprehensive stack validation..."
echo ""

node --env-file=.env tests/run-all.mjs

echo ""
echo "✅ Test execution complete!"