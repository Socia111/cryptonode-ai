#!/usr/bin/env node

// Test script to trigger live scanner and send signals to Telegram
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testTelegramSignals() {
  console.log('🚀 Testing AItradeX1™ Live Scanner → Telegram Pipeline');
  console.log('=' .repeat(60));

  try {
    // 1. Get recent signals from database
    console.log('📊 Fetching recent signals from database...');
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (signalsError) {
      console.error('❌ Error fetching signals:', signalsError);
      return;
    }

    if (!signals || signals.length === 0) {
      console.log('⚠️  No signals found in database. Triggering scanner...');
      
      // Trigger scanner to generate signals
      const { data: scanResult, error: scanError } = await supabase.functions.invoke('live-scanner', {
        body: {
          exchange: 'bybit',
          timeframe: '1h',
          relaxed_filters: true  // Use relaxed for testing
        }
      });

      if (scanError) {
        console.error('❌ Scanner error:', scanError);
        return;
      }

      console.log('✅ Scanner triggered:', scanResult);
      
      // Wait a moment then fetch signals again
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: newSignals } = await supabase
        .from('signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (newSignals && newSignals.length > 0) {
        console.log(`📈 Found ${newSignals.length} new signals!`);
        signals.push(...newSignals);
      }
    }

    // 2. Test Telegram bot with existing signals
    if (signals && signals.length > 0) {
      console.log(`\n📱 Testing Telegram bot with ${signals.length} signals...`);
      
      for (const signal of signals.slice(0, 2)) { // Test with first 2 signals
        console.log(`\n🔥 Sending ${signal.direction} ${signal.symbol} signal (Score: ${signal.score})`);
        
        const telegramSignal = {
          signal_id: signal.id.toString(),
          token: signal.symbol,
          direction: signal.direction,
          entry_price: parseFloat(signal.price),
          confidence_score: parseFloat(signal.score),
          atr: signal.atr ? parseFloat(signal.atr) : undefined,
          sl: signal.sl ? parseFloat(signal.sl) : undefined,
          tp: signal.tp ? parseFloat(signal.tp) : undefined,
          hvp: signal.hvp ? parseFloat(signal.hvp) : undefined,
          indicators: signal.indicators || {},
          is_premium: signal.score >= 85
        };

        const { data: telegramResult, error: telegramError } = await supabase.functions.invoke('telegram-bot', {
          body: { signal: telegramSignal }
        });

        if (telegramError) {
          console.error('❌ Telegram error:', telegramError);
        } else {
          console.log('✅ Telegram sent:', telegramResult);
        }

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 3. Check Telegram notifications log
    console.log('\n📋 Checking Telegram notifications log...');
    const { data: notifications, error: notifError } = await supabase
      .from('telegram_notifications')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(5);

    if (notifError) {
      console.error('❌ Error fetching notifications:', notifError);
    } else {
      console.log(`📊 Found ${notifications?.length || 0} Telegram notifications`);
      notifications?.forEach(notif => {
        console.log(`  • ${notif.signal_id} - ${notif.message_type} - ${notif.sent_at}`);
      });
    }

    console.log('\n🎉 Test completed! Check your Telegram channels for messages.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testTelegramSignals();