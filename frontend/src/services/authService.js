import { createClient } from '@supabase/supabase-js';
import { getConfig } from './configService';

let supabaseClient = null;

const isEmailVerificationEnabled = process.env.REACT_APP_ENABLE_EMAIL_VERIFICATION === 'true';
const isSignupEnabled = process.env.REACT_APP_ENABLE_SIGNUP === 'true';

const initSupabase = async () => {
  if (supabaseClient) return supabaseClient;

  const config = await getConfig();
  supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });
  return supabaseClient;
};

export const isSignupAllowed = () => isSignupEnabled;

export const signUp = async (email, password) => {
  if (!isSignupEnabled) {
    throw new Error('Signup is currently disabled');
  }

  const supabase = await initSupabase();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        email_confirmed: !isEmailVerificationEnabled // Only force confirm if verification is disabled
      }
    }
  });

  if (error) throw error;
  return data;
};

export const signIn = async (email, password) => {
  const supabase = await initSupabase();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Check email verification if enabled
  if (isEmailVerificationEnabled && !data.user?.email_confirmed_at) {
    throw new Error('Please verify your email before logging in');
  }

  return data;
};

export const signOut = async () => {
  const supabase = await initSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const supabase = await initSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) throw error;
  return user;
};

export const onAuthStateChange = async (callback) => {
  const supabase = await initSupabase();
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
  
  return () => {
    subscription.unsubscribe();
  };
};
