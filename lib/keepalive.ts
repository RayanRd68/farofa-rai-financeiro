import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Keep-alive do Supabase (ADR-003). O plano gratuito pausa o projeto depois de
 * ~7 dias sem atividade — e com ele o login e todos os dados do Controle.
 * Uma rotina diária (Vercel Cron -> `/api/cron/keepalive`) faz um SELECT
 * mínimo, que atravessa API -> PostgREST -> Postgres e conta como uso.
 */

export type KeepaliveResult =
  | { ok: true; at: string }
  | { ok: false; error: string }

/**
 * Um SELECT de 1 linha com a chave pública (sem sessão). A RLS devolve `[]`,
 * o que basta: o objetivo é só exercitar o banco, não ler dado nenhum.
 * Nunca lança — banco pausado/indisponível vira `{ ok: false }`.
 */
export async function pingDatabase(
  client: SupabaseClient
): Promise<KeepaliveResult> {
  try {
    const { error } = await client.from("entradas").select("id").limit(1)
    if (error) return { ok: false, error: error.message }
    return { ok: true, at: new Date().toISOString() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * A rota é aberta de propósito: ela só faz um SELECT com a chave pública (a
 * mesma que o navegador já usa), sem expor dado nem dar capacidade nova — e
 * exigir segredo aqui só criaria um jeito de a rotina falhar em silêncio
 * (e o projeto pausar de novo). Se `CRON_SECRET` existir no projeto da Vercel,
 * o cron já manda `Authorization: Bearer <CRON_SECRET>` e passamos a exigir.
 */
export function cronAuthorized(
  authorization: string | null,
  secret: string | undefined
): boolean {
  if (!secret) return true
  return authorization === `Bearer ${secret}`
}
