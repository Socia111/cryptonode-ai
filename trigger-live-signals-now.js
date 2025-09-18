#!/usr/bin/env node

// Immediate signal generation trigger script
console.log('🚀 Triggering immediate live signal generation...');

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.qnqgaM4vwdlG69hE_DM0b7iCqfL8Y_tEpkPdEAQJ0xA';

async function triggerImmediateSignals() {
  console.log('\n=== STEP 1: Triggering Live Exchange Feed ===');
  
  try {
    const feedResponse = await fetch(`${SUPABASE_URL}/functions/v1/live-exchange-feed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ trigger: 'immediate' })
    });
    
    if (feedResponse.ok) {
      const feedResult = await feedResponse.json();
      console.log('✅ Live feed triggered successfully:', feedResult);
    } else {
      console.error('❌ Live feed failed:', await feedResponse.text());
    }
  } catch (error) {
    console.error('❌ Live feed error:', error.message);
  }

  // Wait for data to be processed
  console.log('\n⏳ Waiting 3 seconds for market data processing...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n=== STEP 2: Triggering Enhanced Signal Generation ===');
  
  try {
    const signalResponse = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-signal-generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ trigger: 'immediate' })
    });
    
    if (signalResponse.ok) {
      const signalResult = await signalResponse.json();
      console.log('✅ Enhanced signals generated:', signalResult);
    } else {
      console.error('❌ Enhanced signal generation failed:', await signalResponse.text());
    }
  } catch (error) {
    console.error('❌ Enhanced signal generation error:', error.message);
  }

  console.log('\n=== STEP 3: Triggering AItradeX1 Enhanced Scanner ===');
  
  try {
    const scannerResponse = await fetch(`${SUPABASE_URL}/functions/v1/aitradex1-enhanced-scanner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT', 'LINKUSDT'],
        trigger: 'immediate'
      })
    });
    
    if (scannerResponse.ok) {
      const scannerResult = await scannerResponse.json();
      console.log('✅ Scanner signals generated:', scannerResult);
    } else {
      console.error('❌ Scanner generation failed:', await scannerResponse.text());
    }
  } catch (error) {
    console.error('❌ Scanner generation error:', error.message);
  }

  console.log('\n=== STEP 4: Verification ===');
  
  try {
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&source=in.(real_market_data,aitradex1_real_enhanced,enhanced_signal_generation)&created_at=gte.${new Date(Date.now() - 10 * 60 * 1000).toISOString()}&order=created_at.desc&limit=10`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0'
      }
    });
    
    if (checkResponse.ok) {
      const signals = await checkResponse.json();
      console.log(`✅ Found ${signals.length} new signals generated in the last 10 minutes`);
      
      if (signals.length > 0) {
        console.log('\n📊 Recent signals summary:');
        signals.slice(0, 5).forEach((signal, i) => {
          console.log(`  ${i + 1}. ${signal.symbol} ${signal.direction} (Score: ${signal.score}) - ${signal.source}`);
        });
      }
    } else {
      console.error('❌ Verification failed:', await checkResponse.text());
    }
  } catch (error) {
    console.error('❌ Verification error:', error.message);
  }

  console.log('\n🎉 Immediate signal generation complete!');
}

// Run the trigger
triggerImmediateSignals().catch(console.error);