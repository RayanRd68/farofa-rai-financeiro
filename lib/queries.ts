import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Entrada, Produto, Saida } from "@/lib/types"

export async function getEntradas(): Promise<Entrada[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("entradas")
    .select("*")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function getSaidas(): Promise<Saida[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("saidas")
    .select("*")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
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
