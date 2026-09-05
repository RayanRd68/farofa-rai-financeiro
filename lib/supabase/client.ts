import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/lib/types"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config"

/** Cliente Supabase para Client Components (sessão via cookies do @supabase/ssr). */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}
