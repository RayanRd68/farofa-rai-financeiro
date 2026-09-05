import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export type SessionUser = { id: string; email: string | null }

/** Claims do JWT (validados via JWKS). `null` se não autenticado. Memoizado. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) return null
  return {
    id: claims.sub as string,
    email: (claims.email as string | undefined) ?? null,
  }
})

/** Exige sessão. Redireciona para /login. Use em toda página/ação protegida. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser()
  if (!user) redirect("/login")
  return user
}
