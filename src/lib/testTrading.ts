import { supabase } from '@/integrations/supabase/client';

export const testTradeExecutor = async () => {
  try {
    console.log('🧪 Testing trade executor...');
    
    const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
      body: { action: 'status' }
    });
    
    if (error) {
      console.error('❌ Trade executor test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Trade executor test passed:', data);
    return { success: true, data };
  } catch (err: any) {
    console.error('❌ Trade executor test error:', err);
    return { success: false, error: err.message };
  }
};

export const testMockTrade = async () => {
  try {
    console.log('🧪 Testing mock trade...');
    
    const { data, error } = await supabase.functions.invoke('aitradex1-trade-executor', {
      body: { 
        action: 'place_order',
        symbol: 'BTCUSDT',
        side: 'Buy',
        amountUSD: 5,
        leverage: 1
      }
    });
    
    if (error) {
      console.error('❌ Mock trade test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Mock trade test result:', data);
    return { success: true, data };
  } catch (err: any) {
    console.error('❌ Mock trade test error:', err);
    return { success: false, error: err.message };
  }
};