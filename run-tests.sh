#!/bin/bash

# AItradeX1 Test Suite Runner with Node version compatibility
# Supports Node 18+ with automatic fallback for --env-file

echo "🧪 AItradeX1 Test Suite"
echo "========================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ to run tests."
    exit 1
fi

# Check Node version and use appropriate env loading method
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1,2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)
MINOR_VERSION=$(echo $NODE_VERSION | cut -d. -f2)

echo "📦 Node version: $NODE_VERSION"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the comprehensive test suite
echo "🔍 Starting comprehensive stack validation..."
echo ""

if [ "$MAJOR_VERSION" -gt 20 ] || ([ "$MAJOR_VERSION" -eq 20 ] && [ "$MINOR_VERSION" -ge 6 ]); then
    echo "✅ Using native --env-file (Node 20.6+)"
    node --env-file=.env tests/run-all.mjs
else
    echo "✅ Using dotenv preload (Node 18-20.5)"
    if ! npm list dotenv >/dev/null 2>&1; then
        echo "📦 Installing dotenv for Node compatibility..."
        npm install dotenv
    fi
    node -r dotenv/config tests/run-all.mjs dotenv_config_path=.env
fi

echo ""
echo "✅ Test execution complete!"