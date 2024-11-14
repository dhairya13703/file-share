import { createClient } from '@supabase/supabase-js';
import { getConfig } from '../services/configService';

let supabaseInstance = null;

export const initSupabase = async () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  try {
    const config = await getConfig();
    supabaseInstance = createClient(
      config.supabaseUrl,
      config.supabaseAnonKey
    );
    return supabaseInstance;
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    throw error;
  }
};

export const getSupabase = () => {
  if (!supabaseInstance) {
    throw new Error('Supabase not initialized. Call initSupabase first.');
  }
  return supabaseInstance;
};