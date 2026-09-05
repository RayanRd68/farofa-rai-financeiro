import { MESES_LONGOS } from "@/lib/constants"
import { toNumber } from "@/lib/format"
import type { Entrada, Produto, Saida } from "@/lib/types"

const mes = (iso: string) => parseInt(iso.split("-")[1] ?? "0", 10) - 1
const ano = (iso: string) => iso.split("-")[0] ?? ""

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

export type LinhaMensal = {
  mes: string
  idx: number
  entradas: number
  saidas: number
  lucro: number
  margem: number
}

/** 12 linhas (Jan..Dez), como a aba "Resumo" da planilha. */
export function computeMensal(
  entradas: Entrada[],
  saidas: Saida[]
): LinhaMensal[] {
  const rows: LinhaMensal[] = MESES_LONGOS.map((m, i) => ({
    mes: m,
    idx: i,
    entradas: 0,
    saidas: 0,
    lucro: 0,
    margem: 0,
  }))
  for (const e of entradas) {
    const i = mes(e.data)
    if (rows[i]) rows[i].entradas += toNumber(e.valor_total)
  }
  for (const s of saidas) {
    const i = mes(s.data)
    if (rows[i]) rows[i].saidas += toNumber(s.valor)
  }
  for (const r of rows) {
    r.lucro = r.entradas - r.saidas
    r.margem = r.entradas > 0 ? r.lucro / r.entradas : 0
  }
  return rows
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

export function anosPresentes(entradas: Entrada[], saidas: Saida[]): string[] {
  const ys = new Set<string>()
  for (const e of entradas) if (e.data) ys.add(ano(e.data))
  for (const s of saidas) if (s.data) ys.add(ano(s.data))
  return [...ys].sort()
}
