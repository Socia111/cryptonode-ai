import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AIRA_RANKINGS_DATA = [
  { rank: 1, name: "Syrax AI", symbol: "SYRAX", bybit_symbol: "SYRAXUSDT" },
  { rank: 2, name: "Avarik Saga", symbol: "AVRK", bybit_symbol: "AVRKUSDT" },
  { rank: 3, name: "DeSci AI Agent", symbol: "DESCIAI", bybit_symbol: "DESCIAIUSDT" },
  { rank: 4, name: "Fusion AI", symbol: "FUSION", bybit_symbol: "FUSIONUSDT" },
  { rank: 5, name: "Morph AI", symbol: "MORPHAI", bybit_symbol: "MORPHAIUSDT" },
  { rank: 6, name: "SentAI", symbol: "SENTAI", bybit_symbol: "SENTAIUSDT" },
  { rank: 7, name: "Lucky Dog", symbol: "LUCKY", bybit_symbol: "LUCKYUSDT" },
  { rank: 8, name: "Genie AI", symbol: "GENIE", bybit_symbol: "GENIEUSDT" },
  { rank: 9, name: "AuditAI", symbol: "AUDAI", bybit_symbol: "AUDAIUSDT" },
  { rank: 10, name: "Oracle AI", symbol: "ORCAI", bybit_symbol: "ORCAIUSDT" },
  { rank: 11, name: "AI Rocket by Virtuals", symbol: "ROCKET", bybit_symbol: "ROCKETUSDT" },
  { rank: 12, name: "HadesAI by Virtuals", symbol: "HADES", bybit_symbol: "HADESUSDT" },
  { rank: 13, name: "Spectra", symbol: "SPECTRA", bybit_symbol: "SPECTRAUSDT" },
  { rank: 14, name: "Gud Tech", symbol: "GUD", bybit_symbol: "GUDUSDT" },
  { rank: 15, name: "Hana", symbol: "HANA", bybit_symbol: "HANAUSDT" },
  { rank: 16, name: "Kekius Maximus", symbol: "KEKIUS", bybit_symbol: "KEKIUSUSDT" },
  { rank: 17, name: "Flávia Is Online", symbol: "FLAVIA", bybit_symbol: "FLAVIAUSDT" },
  { rank: 18, name: "Fight to MAGA", symbol: "FIGHT", bybit_symbol: "FIGHTUSDT" },
  { rank: 19, name: "MAGA", symbol: "TRUMP", bybit_symbol: "TRUMPUSDT" },
  { rank: 20, name: "Bad Idea AI", symbol: "BAD", bybit_symbol: "BADUSDT" },
  { rank: 21, name: "Doland Tremp", symbol: "TREMP", bybit_symbol: "TREMPUSDT" },
  { rank: 22, name: "Shrubius Maximus", symbol: "SHRUBIUS", bybit_symbol: "SHRUBIUSUSDT" },
  { rank: 23, name: "The Pea Guy by Virtuals", symbol: "PEAGUY", bybit_symbol: "PEAGUYUSDT" },
  { rank: 24, name: "Desci AI Agent", symbol: "DESCIAI", bybit_symbol: "DESCIAIUSDT" },
  { rank: 25, name: "Crow Computer", symbol: "CROW", bybit_symbol: "CROWUSDT" },
  { rank: 26, name: "0xSim by Virtuals", symbol: "SAGE", bybit_symbol: "SAGEUSDT" },
  { rank: 27, name: "Euruka Tech", symbol: "ERC AI", bybit_symbol: "ERCAIUSDT" },
  { rank: 28, name: "DNAI16Z", symbol: "DNAI16Z", bybit_symbol: "DNAI16ZUSDT" },
  { rank: 29, name: "Baby XRP", symbol: "BABYXRP", bybit_symbol: "BABYXRPUSDT" },
  { rank: 30, name: "Pika Infinity", symbol: "PIKA", bybit_symbol: "PIKAUSDT" }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Syncing AIRA rankings data...');

    // Clear existing rankings
    const { error: deleteError } = await supabaseClient
      .from('aira_rankings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('❌ Error clearing existing rankings:', deleteError);
      throw deleteError;
    }

    // Insert new rankings
    const rankingsData = AIRA_RANKINGS_DATA.map(item => ({
      rank_position: item.rank,
      token_name: item.name,
      token_symbol: item.symbol,
      bybit_symbol: item.bybit_symbol,
      score: 100 - (item.rank * 0.5), // Higher rank = higher score
      last_updated: new Date().toISOString()
    }));

    const { data, error } = await supabaseClient
      .from('aira_rankings')
      .insert(rankingsData)
      .select();

    if (error) {
      console.error('❌ Error inserting rankings:', error);
      throw error;
    }

    console.log(`✅ Successfully synced ${data?.length || 0} AIRA rankings`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${data?.length || 0} AIRA rankings`,
        rankings_updated: data?.length || 0,
        top_5_tokens: data?.slice(0, 5).map(r => ({
          rank: r.rank_position,
          token: r.token_symbol,
          score: r.score
        })) || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ AIRA sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});