# AItradeX Edge Functions Test Harness

A comprehensive testing suite for all Supabase edge functions and Telegram integration.

## Quick Start

```bash
# Make test runner executable
chmod +x tests/run-tests.sh

# Run all tests
./tests/run-tests.sh all

# Run core tests only
./tests/run-tests.sh core

# Test signal generation and Telegram
./tests/run-tests.sh signals

# Run stress test (5 iterations)
./tests/run-tests.sh stress 5

# Monitor performance continuously
./tests/run-tests.sh monitor
```

## Direct Deno Usage

```bash
# Run all tests
deno run --allow-net --allow-env tests/edge-functions-harness.ts all

# Run specific test suite
deno run --allow-net --allow-env tests/edge-functions-harness.ts core
deno run --allow-net --allow-env tests/edge-functions-harness.ts signals
```

## Test Categories

### All Tests (`all`)
- Scanner Engine
- Enhanced Signal Generation
- Calculate Spynx Scores
- Backtest Engine
- Sentiment Analysis
- Trade Execution
- Free Telegram Signal
- Premium Telegram Signal

### Core Tests (`core`)
- Scanner Engine
- Enhanced Signal Generation
- Free & Premium Telegram Signals

### Signal Tests (`signals`)
- Scanner Engine → Telegram pipeline
- Signal generation verification
- Telegram delivery confirmation

## Environment Setup

Set these environment variables for testing:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Optional: For direct Telegram testing
export TELEGRAM_FREE_BOT_TOKEN="your_free_bot_token"
export TELEGRAM_FREE_CHAT_ID="your_free_chat_id"
export TELEGRAM_PAID_BOT_TOKEN="your_premium_bot_token"
export TELEGRAM_PAID_CHAT_ID="your_premium_chat_id"
```

## Test Output

The harness provides detailed output:

```
🚀 Starting comprehensive edge functions test harness...

🧪 Testing scanner-engine...
✅ scanner-engine succeeded in 1250ms

🧪 Testing enhanced-signal-generation...
✅ enhanced-signal-generation succeeded in 890ms

📊 Test Results Summary:
==================================================
✅ Successful: 8
❌ Failed: 0
⏱️  Total Duration: 3420ms

Detailed Results:
✅ scanner-engine              1250ms
   Generated 7 signals
✅ enhanced-signal-generation   890ms
✅ telegram-bot                 340ms
   Signal sent to Telegram

📱 Check your Telegram channels for signal alerts!
```

## Stress Testing

Run repeated tests to verify stability:

```bash
# Run 10 iterations
./tests/run-tests.sh stress 10

# Custom stress test
deno run --allow-net --allow-env tests/edge-functions-harness.ts stress 20
```

## Performance Monitoring

Continuous monitoring for production:

```bash
# Monitor every 30 seconds
./tests/run-tests.sh monitor
```

## Files Structure

```
tests/
├── edge-functions-harness.ts  # Main test harness
├── telegram-formatter.ts      # Signal formatting utilities
├── run-tests.sh              # Bash test runner
└── README.md                 # This file
```

## Integration with CI/CD

Add to your deployment pipeline:

```yaml
# .github/workflows/test-edge-functions.yml
name: Test Edge Functions
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: denoland/setup-deno@v1
      - name: Test Edge Functions
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: ./tests/run-tests.sh core
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   chmod +x tests/run-tests.sh
   ```

2. **Environment Variables Missing**
   ```bash
   # Check your .env file or export manually
   export SUPABASE_URL="https://your-project.supabase.co"
   ```

3. **Network Timeouts**
   - Edge functions may take time to cold start
   - Re-run tests if initial run fails

### Debug Mode

Enable verbose logging:

```bash
DENO_LOG=debug deno run --allow-net --allow-env tests/edge-functions-harness.ts all
```

## Contributing

To add new tests:

1. Add test method to `EdgeFunctionTestHarness` class
2. Include in appropriate test suite (`runAllTests`, `runCoreTests`, etc.)
3. Update this README with new test documentation