import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate that the URL is actually a real http/https URL, not a placeholder
const isValidHttpUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const isConfigured =
  !!(supabaseUrl && supabaseAnonKey) && isValidHttpUrl(supabaseUrl);

if (supabaseUrl && !isConfigured) {
  console.warn(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL is set but is not a valid HTTP/HTTPS URL ' +
    `("${supabaseUrl}"). Falling back to mock client — reviews will not load.`
  );
}

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

export type SupabaseLike = SupabaseClient | ReturnType<typeof createMockClient>;

// The Supabase client is ~459KB of JS and is only needed for reviews, which
// can't be seen until a cafe detail panel is opened. Importing it at module
// scope put all of that on the critical path of the homepage. Instead the
// library is fetched on first use and the resulting client cached, so the
// initial bundle carries only this thin wrapper.
let clientPromise: Promise<SupabaseLike> | null = null;

export function getSupabase(): Promise<SupabaseLike> {
  if (!clientPromise) {
    clientPromise = (
      isConfigured
        ? import('@supabase/supabase-js').then(({ createClient }) =>
            createClient(supabaseUrl!, supabaseAnonKey!),
          )
        : Promise.resolve(createMockClient() as unknown as SupabaseClient)
    ).catch((err) => {
      // A failed chunk load (flaky network) must not be cached forever —
      // clear the promise so the next call retries the import.
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}
