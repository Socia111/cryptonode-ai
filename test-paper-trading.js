#!/usr/bin/env node

// Test paper trading execution
console.log('🧪 Testing paper trading executor...');

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.qnqgaM4vwdlG69hE_DM0b7iCqfL8Y_tEpkPdEAQJ0xA';

async function testPaperTrading() {
  const testTrades = [
    {
      symbol: 'BTCUSDT',
      side: 'buy',
      amount: 50,
      order_type: 'market'
    },
    {
      symbol: 'ETHUSDT', 
      side: 'sell',
      quantity: 0.01,
      order_type: 'market'
    },
    {
      symbol: 'SOLUSDT',
      side: 'buy', 
      quantity: 1,
      order_type: 'market'
    }
  ];

  console.log('\n=== Testing Paper Trading Execution ===');
  
  for (const [index, trade] of testTrades.entries()) {
    console.log(`\n📝 Test ${index + 1}: ${trade.symbol} ${trade.side} ${trade.amount || trade.quantity}`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/paper-trading-executor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(trade)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Trade executed successfully:', {
          order_id: result.order_id,
          executed_price: result.executed_price,
          symbol: trade.symbol,
          side: trade.side
        });
      } else {
        console.error('❌ Trade failed:', await response.text());
      }
    } catch (error) {
      console.error('❌ Trade error:', error.message);
    }
    
    // Wait between trades
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== Checking Recent Paper Trades ===');
  
  try {
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/execution_orders?select=*&paper_mode=eq.true&created_at=gte.${new Date(Date.now() - 5 * 60 * 1000).toISOString()}&order=created_at.desc&limit=10`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
      }
    });
    
    if (checkResponse.ok) {
      const trades = await checkResponse.json();
      console.log(`\n📊 Found ${trades.length} recent paper trades:`);
      
      trades.forEach((trade, i) => {
        console.log(`  ${i + 1}. ${trade.symbol} ${trade.side} - Status: ${trade.status} (${new Date(trade.created_at).toLocaleTimeString()})`);
      });
    } else {
      console.error('❌ Failed to check trades:', await checkResponse.text());
    }
  } catch (error) {
    console.error('❌ Check error:', error.message);
  }

  console.log('\n🎉 Paper trading test complete!');
}

// Run the test
testPaperTrading().catch(console.error);