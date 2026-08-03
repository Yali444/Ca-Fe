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

/**
 * Whether real Supabase credentials are present in this build. `false` means
 * every call goes to the mock client below and nothing reaches the network —
 * the single most common reason reviews "fail to save" in a deployment.
 *
 * Note these are `NEXT_PUBLIC_*` vars, so they are inlined at **build** time:
 * adding them to the hosting provider without redeploying leaves this `false`.
 */
export const isSupabaseConfigured = isConfigured;

/** Discriminator on the mock client's errors, so callers can tell a missing
 *  configuration apart from a genuine database/RLS failure. */
export const SUPABASE_NOT_CONFIGURED = 'SUPABASE_NOT_CONFIGURED';

const notConfiguredError = () => ({
  code: SUPABASE_NOT_CONFIGURED,
  message:
    'Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
    'are missing from this build. Set them and redeploy — they are inlined at build time.',
});

if (supabaseUrl && !isConfigured) {
  console.warn(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL is set but is not a valid HTTP/HTTPS URL ' +
    `("${supabaseUrl}"). Falling back to mock client — reviews will not load.`
  );
}

// Create a mock response that can be both awaited and chained
const createMockResponse = (data: unknown = null, error: { message: string; code?: string } | null = notConfiguredError()) => {
  const response = {
    data,
    error,
    select: () => createMockResponse(data, error),
    single: () => Promise.resolve({ data, error }),
    order: () => createMockResponse(data, error),
    eq: () => createMockResponse(data, error),
    limit: () => createMockResponse(data, error),
    then: (resolve: (value: { data: unknown; error: { message: string; code?: string } | null }) => void) => {
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
      insert: () => createMockResponse(null, notConfiguredError()),
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
