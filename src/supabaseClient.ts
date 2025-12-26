import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log environment variable status for debugging
const isConfigured = !!(supabaseUrl && supabaseAnonKey);
console.log('Supabase config status:', { 
  isConfigured,
  hasUrl: !!supabaseUrl, 
  hasKey: !!supabaseAnonKey,
  urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing'
});

// Create a mock response that can be both awaited and chained
const createMockResponse = (data: unknown = null, error: { message: string } | null = { message: 'Supabase not configured - check .env.local' }) => {
  const response = {
    data,
    error,
    select: () => createMockResponse(data, error),
    single: () => Promise.resolve({ data, error }),
    order: () => createMockResponse(data, error),
    eq: () => createMockResponse(data, error),
    then: (resolve: (value: { data: unknown; error: { message: string } | null }) => void) => {
      resolve({ data, error });
    },
  };
  return response;
};

// Create a mock client that returns empty data when env vars are missing
// This prevents crashes in production when Supabase isn't configured
const createMockClient = () => ({
  from: (tableName: string) => {
    console.warn(`Mock Supabase: Accessing table "${tableName}" but Supabase is not configured`);
    return {
      select: () => createMockResponse([], null),
      insert: () => createMockResponse(null, { message: 'Supabase not configured - check .env.local' }),
    };
  },
});

export const supabase: SupabaseClient | ReturnType<typeof createMockClient> = 
  isConfigured 
    ? createClient(supabaseUrl!, supabaseAnonKey!)
    : createMockClient() as unknown as SupabaseClient;













