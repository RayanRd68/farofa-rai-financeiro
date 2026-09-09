import { toNumber } from "@/lib/format"
import type { Entrada, Produto, Saida } from "@/lib/types"

export type Totais = {
  totalEntradas: number
  totalSaidas: number
  lucro: number
  margem: number // razão (0..1)
}

export function computeTotais(entradas: Entrada[], saidas: Saida[]): Totais {
  const totalEntradas = entradas.reduce(
    (s, e) => s + toNumber(e.valor_total),
    0
  )
  const totalSaidas = saidas.reduce((s, e) => s + toNumber(e.valor), 0)
  const lucro = totalEntradas - totalSaidas
  const margem = totalEntradas > 0 ? lucro / totalEntradas : 0
  return { totalEntradas, totalSaidas, lucro, margem }
}

export type CategoriaTotal = { categoria: string; valor: number }

export function computeCategorias(saidas: Saida[]): CategoriaTotal[] {
  const map = new Map<string, number>()
  for (const s of saidas) {
    const c = s.categoria || "Outros"
    map.set(c, (map.get(c) ?? 0) + toNumber(s.valor))
  }
  return [...map.entries()]
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor)
}

export type ClienteTotal = {
  cliente: string
  total: number
  pedidos: number
}

export function computeTopClientes(
  entradas: Entrada[],
  limit = 5
): ClienteTotal[] {
  const map = new Map<string, { total: number; pedidos: number }>()
  for (const e of entradas) {
    const c = (e.cliente ?? "").trim() || "Não identificado"
    const cur = map.get(c) ?? { total: 0, pedidos: 0 }
    cur.total += toNumber(e.valor_total)
    cur.pedidos += 1
    map.set(c, cur)
  }
  return [...map.entries()]
    .map(([cliente, d]) => ({ cliente, ...d }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export type MargemProduto = {
  lucroFinal: number
  margemFinal: number
  lucroRevenda: number
  margemRevenda: number
}

export function margemProduto(p: Produto): MargemProduto {
  const custo = toNumber(p.custo_producao)
  const final = toNumber(p.preco_cliente_final)
  const revenda = toNumber(p.preco_revenda)
  const lucroFinal = final - custo
  const lucroRevenda = revenda - custo
  return {
    lucroFinal,
    margemFinal: final > 0 ? lucroFinal / final : 0,
    lucroRevenda,
    margemRevenda: revenda > 0 ? lucroRevenda / revenda : 0,
  }
}
