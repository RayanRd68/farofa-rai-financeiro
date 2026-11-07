import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import { cronAuthorized, pingDatabase } from "@/lib/keepalive"

/** Client falso: from(...).select(...).limit(...) resolve (ou lança) o que for passado. */
function fakeClient(outcome: { error: { message: string } | null } | Error) {
  const limit = vi.fn(async () => {
    if (outcome instanceof Error) throw outcome
    return outcome
  })
  const select = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ select }))
  return { client: { from } as unknown as SupabaseClient, from, select, limit }
}

describe("pingDatabase", () => {
  it("faz um SELECT mínimo de 1 linha e devolve ok", async () => {
    const { client, from, select, limit } = fakeClient({ error: null })
    const r = await pingDatabase(client)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(from).toHaveBeenCalledWith("entradas")
    expect(select).toHaveBeenCalledWith("id")
    expect(limit).toHaveBeenCalledWith(1)
  })

  it("devolve ok:false com a mensagem quando o PostgREST responde erro", async () => {
    const { client } = fakeClient({ error: { message: "relation does not exist" } })
    expect(await pingDatabase(client)).toEqual({
      ok: false,
      error: "relation does not exist",
    })
  })

  it("não lança quando a conexão falha (banco pausado)", async () => {
    const { client } = fakeClient(new TypeError("fetch failed"))
    expect(await pingDatabase(client)).toEqual({
      ok: false,
      error: "fetch failed",
    })
  })
})

describe("cronAuthorized", () => {
  it("sem CRON_SECRET a rota é aberta (a rotina não pode falhar em silêncio)", () => {
    expect(cronAuthorized(null, undefined)).toBe(true)
    expect(cronAuthorized("Bearer qualquer", undefined)).toBe(true)
  })

  it("com CRON_SECRET exige o Bearer exato", () => {
    expect(cronAuthorized("Bearer s3gredo", "s3gredo")).toBe(true)
    expect(cronAuthorized("Bearer errado", "s3gredo")).toBe(false)
    expect(cronAuthorized(null, "s3gredo")).toBe(false)
    expect(cronAuthorized("s3gredo", "s3gredo")).toBe(false)
  })
})
