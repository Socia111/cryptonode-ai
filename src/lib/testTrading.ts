import { supabase } from '@/integrations/supabase/client';

export const testTradeExecutor = async () => {
  try {
    console.log('🧪 Testing simple test function...');
    
    const { data, error } = await supabase.functions.invoke('simple-test', {
      body: { action: 'status' }
    });
    
    if (error) {
      console.error('❌ Simple test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Simple test passed:', data);
    return { success: true, data };
  } catch (err: any) {
    console.error('❌ Simple test error:', err);
    return { success: false, error: err.message };
  }
};

export const testDatabaseConnection = async () => {
  try {
    console.log('🧪 Testing database connection...');
    
    const { data, error } = await supabase.functions.invoke('simple-test', {
      body: { action: 'db_test' }
    });
    
    if (error) {
      console.error('❌ Database test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Database test passed:', data);
    return { success: true, data };
  } catch (err: any) {
    console.error('❌ Database test error:', err);
    return { success: false, error: err.message };
  }
};

export const testMockTrade = async () => {
  try {
    console.log('🧪 Testing mock trade...');
    
    const { data, error } = await supabase.functions.invoke('simple-test', {
      body: { action: 'mock_trade' }
    });
    
    if (error) {
      console.error('❌ Mock trade test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Mock trade test passed:', data);
    return { success: true, data };
  } catch (err: any) {
    console.error('❌ Mock trade test error:', err);
    return { success: false, error: err.message };
  }
};