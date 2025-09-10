// Single Supabase client for the entire app
import { createClient } from '@supabase/supabase-js';

// Direct configuration
const supabaseUrl = 'https://codhlwjogfjywmjyjbbn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTA3NjgsImV4cCI6MjA2OTA4Njc2OH0.Rjfe5evX0JZ2O-D3em4Sm1FtwIRtfPZWhm0zAJvg-H0';

// Create Supabase client with minimal config
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Direct fetch function as fallback
export async function fetchSignalsDirect() {
  try {
    console.log('[Direct Fetch] Attempting to fetch signals...');
    const response = await fetch(`${supabaseUrl}/rest/v1/signals?score=gte.80&created_at=gte.${new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()}&order=created_at.desc&limit=50`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[Direct Fetch] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Direct Fetch] Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[Direct Fetch] Got signals:', data?.length || 0, 'signals');
    console.log('[Direct Fetch] Sample signal:', data?.[0]);
    return data || [];
  } catch (error) {
    console.error('[Direct Fetch] Error:', error);
    return [];
  }
}