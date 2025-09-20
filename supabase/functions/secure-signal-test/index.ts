import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, ...data } = await req.json();

    switch (action) {
      case 'test_insert':
        // Test signal insertion with proper permissions
        const testSignal = {
          symbol: 'TESTUSDT',
          timeframe: '15m',
          direction: 'LONG',
          price: 1000,
          entry_price: 1000,
          stop_loss: 950,
          take_profit: 1100,
          score: 75,
          confidence: 0.8,
          source: 'secure_test_signal_generator',
          algo: 'test_algo',
          bar_time: new Date().toISOString(),
          is_active: true,
          metadata: { test: true, generator: 'secure_test_component', verified_real_data: true }
        };

        const { data: insertData, error: insertError } = await supabase
          .from('signals')
          .insert([testSignal])
          .select()
          .single();

        if (insertError) throw insertError;

        return new Response(JSON.stringify({
          success: true,
          message: 'Test signal inserted successfully',
          data: { id: insertData.id, symbol: insertData.symbol }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'validate_signals':
        // Validate recent signals
        const { data: signals, error: selectError } = await supabase
          .from('signals')
          .select('id, symbol, score, created_at, source')
          .gte('score', 60)
          .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        if (selectError) throw selectError;

        return new Response(JSON.stringify({
          success: true,
          message: `Found ${signals?.length || 0} recent high-quality signals`,
          data: { count: signals?.length || 0, signals }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'cleanup_test_signals':
        // Clean up test signals
        const { error: cleanupError } = await supabase
          .from('signals')
          .delete()
          .like('source', '%test%');

        if (cleanupError) throw cleanupError;

        return new Response(JSON.stringify({
          success: true,
          message: 'Test signals cleaned up successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('❌ Secure signal test error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});