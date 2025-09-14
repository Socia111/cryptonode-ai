import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Setting up Telegram Bot...');
    
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    if (!chatId) {
      throw new Error('TELEGRAM_CHAT_ID not configured');
    }

    // Test bot connection
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const botInfo = await botInfoResponse.json();
    
    if (!botInfo.ok) {
      throw new Error(`Telegram API error: ${botInfo.description}`);
    }

    // Set webhook commands (optional)
    const commands = [
      { command: 'start', description: 'Start receiving AItradeX1 signals' },
      { command: 'stop', description: 'Stop receiving signals' },
      { command: 'status', description: 'Check scanner status' },
      { command: 'help', description: 'Show help information' }
    ];

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands })
      });
    } catch (error) {
      console.warn('Could not set bot commands:', error.message);
    }

    // Send test message
    const testMessage = `🤖 *AItradeX1 Bot Setup Complete*\n\n✅ Bot: ${botInfo.result.first_name}\n✅ Username: @${botInfo.result.username}\n✅ Chat ID: ${chatId}\n\nBot is ready to send live trading signals!`;
    
    const messageResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: 'Markdown'
      })
    });

    const messageResult = await messageResponse.json();
    
    if (!messageResult.ok) {
      throw new Error(`Failed to send test message: ${messageResult.description}`);
    }

    console.log('✅ Telegram Bot setup successful');

    return new Response(JSON.stringify({
      success: true,
      bot_info: {
        name: botInfo.result.first_name,
        username: botInfo.result.username,
        id: botInfo.result.id
      },
      chat_id: chatId,
      test_message_sent: true,
      commands_set: commands.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Telegram Bot Setup Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});