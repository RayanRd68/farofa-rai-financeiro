import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config"
import { ingestVendaSchema } from "@/lib/validations"

export const runtime = "nodejs"

/**
 * Ingestão de vendas vindas do CRM da Farofa da Rai.
 *
 * O CRM (cron diário) manda um pedido "entregue + pago" pra cá. A gravação
 * acontece via RPC `ingest_venda` (SECURITY DEFINER), que revalida o segredo
 * contra `private.sync_config` — então este deploy só guarda o segredo
 * compartilhado, nunca a `service_role`.
 *
 * Auth: `Authorization: Bearer <INGEST_SECRET>`. Sem a env var → 401
 * (fail-closed, igual aos webhooks do CRM).
 */

function anon() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.INGEST_SECRET
  if (!secret) return false
  return request.headers.get("authorization") === `Bearer ${secret}`
}

/** Erro da RPC: 28000 = segredo inválido → 401; resto → 502. */
function rpcError(error: { code?: string; message?: string }) {
  if (error.code === "28000") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  return NextResponse.json(
    { error: error.message ?? "Falha ao gravar" },
    { status: 502 }
  )
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = ingestVendaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { data, error } = await anon().rpc("ingest_venda", {
    p_secret: process.env.INGEST_SECRET,
    p_payload: parsed.data,
  })
  if (error) return rpcError(error)

  return NextResponse.json(data ?? { ok: true })
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const origemId = request.nextUrl.searchParams.get("origem_id")
  if (!origemId) {
    return NextResponse.json({ error: "origem_id ausente" }, { status: 400 })
  }

  const { data, error } = await anon().rpc("ingest_venda", {
    p_secret: process.env.INGEST_SECRET,
    p_payload: { _op: "delete", origem_id: origemId },
  })
  if (error) return rpcError(error)

  return NextResponse.json(data ?? { deleted: true })
}
