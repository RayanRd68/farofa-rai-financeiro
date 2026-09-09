import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Entrada, Produto, Saida } from "@/lib/types"

/** Janela opcional por data (`yyyy-MM-dd`, inclusiva). */
export type Periodo = { from?: string; to?: string }

export async function getEntradas(periodo?: Periodo): Promise<Entrada[]> {
  const supabase = await createClient()
  let query = supabase
    .from("entradas")
    .select("*")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
  if (periodo?.from) query = query.gte("data", periodo.from)
  if (periodo?.to) query = query.lte("data", periodo.to)
  const { data } = await query
  return data ?? []
}

export async function getSaidas(periodo?: Periodo): Promise<Saida[]> {
  const supabase = await createClient()
  let query = supabase
    .from("saidas")
    .select("*")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
  if (periodo?.from) query = query.gte("data", periodo.from)
  if (periodo?.to) query = query.lte("data", periodo.to)
  const { data } = await query
  return data ?? []
}

export async function getProdutos(): Promise<Produto[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("produtos")
    .select("*")
    .order("produto")
  return data ?? []
}

export async function getEntrada(id: string): Promise<Entrada | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("entradas")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  return data
}

export async function getSaida(id: string): Promise<Saida | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("saidas")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  return data
}
