import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import type { Database } from "@/lib/types"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config"

/**
 * Cliente Supabase para o servidor (Server Components, Server Actions).
 * Um por request. O refresh de sessão acontece no `proxy.ts`; num Server
 * Component o `setAll` pode falhar e é ignorado com segurança.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Component — o proxy.ts cuida do refresh.
        }
      },
    },
  })
}
