#!/bin/bash

echo "🚀 Starting Live Data Feed Pipeline..."
echo "======================================"

# Make the trigger script executable
chmod +x trigger-live-feeds.js

# Run the live data feeds
echo "📡 Triggering all real-time data sources..."
node trigger-live-feeds.js

echo ""
echo "✅ Live data pipeline started!"
echo ""
echo "📊 Real-time data sources activated:"
echo "   • Live crypto price feeds"
echo "   • Market data APIs" 
echo "   • Trading signal scanners"
echo "   • AIRA ranking system"
echo "   • Quantum analysis engine"
echo ""
echo "⏱️  Data will populate within 1-2 minutes"
echo "🔄 Refresh your browser to see live data"