
// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'
import { SupabaseClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'  // 👈 Important for URL issues in RN

const supabaseUrl = 'https://svaftdaojzryuinbpmai.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2YWZ0ZGFvanpyeXVpbmJwbWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNDY5NDEsImV4cCI6MjA3MDcyMjk0MX0.XVx97Vqp7tSi3KCrpdzLTpAofb9p4ewe_QpfXboyJzM';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
