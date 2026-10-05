import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components — reads/writes the same
 * cookie-based session the server client and middleware use, so a signed-in
 * user stays signed in across a full page reload.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
