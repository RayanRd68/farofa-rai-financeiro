import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { cronAuthorized, pingDatabase } from "@/lib/keepalive"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config"

export const runtime = "nodejs"

/**
 * Keep-alive diário do Supabase (ADR-003) — evita que o plano gratuito pause o
 * projeto por inatividade. Agendado em `vercel.json` (Vercel Cron, 1x/dia).
 * Responde 200 `{ ok: true }` ou 502 `{ ok: false, error }` (aparece como falha
 * no log do cron). `/api` já é público no `proxy.ts`.
 */
export async function GET(request: NextRequest) {
  if (
    !cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const result = await pingDatabase(supabase)

  if (!result.ok) {
    console.error("[cron/keepalive]", result.error)
    return NextResponse.json(result, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    })
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
}
