import {
  computeCategorias,
  computeTopClientes,
  computeTotais,
  type CategoriaTotal,
  type ClienteTotal,
  type Totais,
} from "@/lib/finance"
import { fmtDateBR, toNumber } from "@/lib/format"
import { MESES } from "@/lib/constants"
import type { Entrada, Saida } from "@/lib/types"
import type { ResolvedRange } from "@/lib/reports/period"

/**
 * Monta o relatório do período a partir das linhas já filtradas. Puro /
 * testável — sem I/O. A busca fica em `lib/reports/data.ts`.
 */

export type GrupoValor = {
  chave: string
  count: number
  valor: number
}

export type PontoSerie = {
  label: string
  entradas: number
  saidas: number
}

export type FinanceReportData = {
  range: ResolvedRange
  /** Cabeçalho do relatório: rótulo + datas concretas cobertas (sem o sentinel de "Tudo"). */
  cabecalho: string
  totais: Totais & { qtdVendas: number; qtdGastos: number }
  categorias: CategoriaTotal[]
  formaPagamento: GrupoValor[]
  tipoVenda: GrupoValor[]
  topClientes: ClienteTotal[]
  serie: PontoSerie[]
  vendas: Entrada[]
  gastos: Saida[]
}

/**
 * "Setembro de 2026 · 01/09/2026 a 08/09/2026". Para o preset "Tudo" usa as
 * datas reais das linhas (não o `from` sentinela 2000-01-01); não repete o
 * intervalo quando o próprio rótulo já é um intervalo (recorte personalizado).
 */
function cabecalhoRelatorio(
  range: ResolvedRange,
  vendas: Entrada[],
  gastos: Saida[]
): string {
  let from = range.from
  let to = range.to
  if (range.preset === "tudo") {
    const datas = [...vendas, ...gastos].map((r) => r.data).sort()
    if (datas.length === 0) return range.label
    from = datas[0]
    to = datas[datas.length - 1]
  }
  const intervalo = `${fmtDateBR(from)} a ${fmtDateBR(to)}`
  return range.label === intervalo ? intervalo : `${range.label} · ${intervalo}`
}

/** Agrupa vendas por forma de pagamento (null -> "Não informado"). */
export function porFormaPagamento(entradas: Entrada[]): GrupoValor[] {
  const map = new Map<string, { count: number; valor: number }>()
  for (const e of entradas) {
    const k = e.forma_pagamento?.trim() || "Não informado"
    const cur = map.get(k) ?? { count: 0, valor: 0 }
    cur.count += 1
    cur.valor += toNumber(e.valor_total)
    map.set(k, cur)
  }
  return [...map.entries()]
    .map(([chave, v]) => ({ chave, ...v }))
    .sort((a, b) => b.valor - a.valor)
}

/** Agrupa vendas por tipo (Cliente Final / Fornecedor Atacado). */
export function porTipoVenda(entradas: Entrada[]): GrupoValor[] {
  const map = new Map<string, { count: number; valor: number }>()
  for (const e of entradas) {
    const k = e.tipo_venda
    const cur = map.get(k) ?? { count: 0, valor: 0 }
    cur.count += 1
    cur.valor += toNumber(e.valor_total)
    map.set(k, cur)
  }
  return [...map.entries()]
    .map(([chave, v]) => ({ chave, ...v }))
    .sort((a, b) => b.valor - a.valor)
}

const dias = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
  )

/** Acima disso o gráfico vira mensal (senão viram dezenas de barras). */
const DIAS_BUCKET_DIARIO = 45

/**
 * Série pro gráfico: buckets diários se o intervalo <= 45 dias (mês, "30 dias"),
 * senão mensais (YYYY-MM). Só devolve pontos com algum movimento.
 */
export function serie(
  entradas: Entrada[],
  saidas: Saida[],
  range: ResolvedRange
): PontoSerie[] {
  const diario = dias(range.from, range.to) <= DIAS_BUCKET_DIARIO
  const key = (iso: string) => (diario ? iso.slice(0, 10) : iso.slice(0, 7))
  const label = (k: string) => {
    if (diario) {
      const [, m, d] = k.split("-")
      return `${d}/${m}`
    }
    const [y, m] = k.split("-")
    return `${MESES[parseInt(m, 10) - 1] ?? m}/${y.slice(2)}`
  }

  const map = new Map<string, { entradas: number; saidas: number }>()
  for (const e of entradas) {
    const k = key(e.data)
    const cur = map.get(k) ?? { entradas: 0, saidas: 0 }
    cur.entradas += toNumber(e.valor_total)
    map.set(k, cur)
  }
  for (const s of saidas) {
    const k = key(s.data)
    const cur = map.get(k) ?? { entradas: 0, saidas: 0 }
    cur.saidas += toNumber(s.valor)
    map.set(k, cur)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({ label: label(k), entradas: v.entradas, saidas: v.saidas }))
}

/** Linha dentro da janela (compara `yyyy-MM-dd` como string). */
const noPeriodo = (range: ResolvedRange) => (r: { data: string }) =>
  r.data >= range.from && r.data <= range.to

export function buildFinanceReport(
  entradas: Entrada[],
  saidas: Saida[],
  range: ResolvedRange
): FinanceReportData {
  // A busca (`lib/reports/data.ts`) já filtra por data; refiltra aqui pra a
  // função pura honrar o `range` mesmo se receber linhas de fora da janela.
  const vendas = entradas.filter(noPeriodo(range))
  const gastos = saidas.filter(noPeriodo(range))
  return {
    range,
    cabecalho: cabecalhoRelatorio(range, vendas, gastos),
    totais: {
      ...computeTotais(vendas, gastos),
      qtdVendas: vendas.length,
      qtdGastos: gastos.length,
    },
    categorias: computeCategorias(gastos),
    formaPagamento: porFormaPagamento(vendas),
    tipoVenda: porTipoVenda(vendas),
    topClientes: computeTopClientes(vendas),
    serie: serie(vendas, gastos, range),
    vendas,
    gastos,
  }
}
