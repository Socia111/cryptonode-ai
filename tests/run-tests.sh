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
    "production")
        echo "🏭 Running production test suite..."
        deno run --allow-net --allow-env --allow-write tests/production-test-runner.ts production
        ;;
    "production-verbose")
        echo "🏭 Running production test suite (verbose)..."
        deno run --allow-net --allow-env --allow-write tests/production-test-runner.ts production --verbose
        ;;
    "continuous")
        INTERVAL=${2:-30}
        echo "📡 Starting continuous monitoring every $INTERVAL minutes..."
        deno run --allow-net --allow-env --allow-write tests/production-test-runner.ts monitor $INTERVAL
        ;;
    "debug")
        echo "🐛 Running debug mode (sequential, verbose)..."
        deno run --allow-net --allow-env --allow-write tests/production-test-runner.ts debug
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
    "parallel")
        echo "⚡ Running parallel edge function tests..."
        echo "📦 Testing all functions simultaneously..."
        deno run --allow-net --allow-env -e "
        import { EdgeFunctionTestHarness } from './tests/edge-functions-harness.ts';
        const harness = new EdgeFunctionTestHarness();
        
        // Hammer all functions in parallel
        const tasks = [
          'scanner-engine',
          'enhanced-signal-generation', 
          'calculate-spynx-scores',
          'backtest-engine',
          'sentiment-analysis',
          'trade-execution'
        ].map(fn => harness.testFunction(fn));
        
        // Add telegram tests
        tasks.push(harness.sendTestSignal(false));
        tasks.push(harness.sendTestSignal(true));
        
        const results = await Promise.allSettled(tasks);
        console.log('🎯 Parallel test complete!');
        console.log('Results:', results.map(r => r.status).join(', '));
        "
        ;;
    "help")
        echo "Available commands:"
        echo "  all              - Run all edge function tests (default)"
        echo "  core             - Run essential function tests"
        echo "  signals          - Test signal generation and Telegram delivery"
        echo "  stress N         - Run stress test with N iterations (default: 5)"
        echo "  monitor          - Continuous performance monitoring"
        echo "  production       - Full production test suite with reporting"
        echo "  production-verbose - Production suite with detailed output"
        echo "  continuous N     - Continuous monitoring every N minutes (default: 30)"
        echo "  debug            - Sequential tests with full debugging"
        echo "  parallel         - Hammer all functions simultaneously"
        echo "  single F         - Test single function F"
        echo "  help             - Show this help"
        ;;
    *)
        echo "❌ Unknown command: $COMMAND"
        echo "Use './run-tests.sh help' for available commands"
        exit 1
        ;;
esac

echo ""
echo "✨ Test run complete!"