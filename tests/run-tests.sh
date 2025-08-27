#!/bin/bash

# AItradeX Edge Functions Test Runner
# Usage: ./run-tests.sh [command]

set -e

echo "🚀 AItradeX Edge Functions Test Harness"
echo "======================================="

# Check if Deno is installed
if ! command -v deno &> /dev/null; then
    echo "❌ Deno is not installed. Please install Deno first:"
    echo "   curl -fsSL https://deno.land/install.sh | sh"
    exit 1
fi

# Set environment variables for testing
export SUPABASE_URL="https://codhlwjogfjywmjyjbbn.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

COMMAND=${1:-"all"}

case $COMMAND in
    "all")
        echo "🧪 Running all edge function tests..."
        deno run --allow-net --allow-env tests/edge-functions-harness.ts all
        ;;
    "core")
        echo "⚡ Running core function tests..."
        deno run --allow-net --allow-env tests/edge-functions-harness.ts core
        ;;
    "signals")
        echo "📡 Testing signal generation and Telegram..."
        deno run --allow-net --allow-env tests/edge-functions-harness.ts signals
        ;;
    "stress")
        ITERATIONS=${2:-5}
        echo "🔥 Running stress test with $ITERATIONS iterations..."
        deno run --allow-net --allow-env tests/edge-functions-harness.ts stress $ITERATIONS
        ;;
    "monitor")
        echo "📈 Starting performance monitoring..."
        deno run --allow-net --allow-env tests/edge-functions-harness.ts monitor
        ;;
    "single")
        if [ -z "$2" ]; then
            echo "❌ Please specify a function name: scanner-engine, telegram-bot, etc."
            exit 1
        fi
        echo "🎯 Testing single function: $2"
        deno run --allow-net --allow-env -e "
        import { EdgeFunctionTestHarness } from './tests/edge-functions-harness.ts';
        const harness = new EdgeFunctionTestHarness();
        await harness.testFunction('$2');
        "
        ;;
    "help")
        echo "Available commands:"
        echo "  all       - Run all edge function tests (default)"
        echo "  core      - Run essential function tests"
        echo "  signals   - Test signal generation and Telegram delivery"
        echo "  stress N  - Run stress test with N iterations (default: 5)"
        echo "  monitor   - Continuous performance monitoring"
        echo "  single F  - Test single function F"
        echo "  help      - Show this help"
        ;;
    *)
        echo "❌ Unknown command: $COMMAND"
        echo "Use './run-tests.sh help' for available commands"
        exit 1
        ;;
esac

echo ""
echo "✨ Test run complete!"