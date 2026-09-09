import {
  computeCategorias,
  computeTopClientes,
  computeTotais,
  type CategoriaTotal,
  type ClienteTotal,
  type Totais,
} from "@/lib/finance"
import { fmtDateBR, toNumber, todayISO } from "@/lib/format"
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

/** Granularidade da série "vendas x gastos" (adapta-se ao tamanho do período). */
export type SerieUnidade = "dia" | "semana" | "mês"

export type ReportTotais = Totais & {
  qtdVendas: number
  qtdGastos: number
  /** Total de vendas / quantidade de vendas (0 quando não há vendas). */
  ticketMedio: number
}

export type FinanceReportData = {
  range: ResolvedRange
  /** Cabeçalho do relatório: rótulo + datas concretas cobertas (sem o sentinel de "Tudo"). */
  cabecalho: string
  /** Datas concretas do período analisado, formatadas dd/MM/yyyy. */
  periodo: { de: string; ate: string }
  /** As mesmas datas em ISO (yyyy-MM-dd) — pra nome de arquivo etc. */
  periodoISO: { de: string; ate: string }
  /** Data em que o relatório foi montado (ISO yyyy-MM-dd). */
  geradoEm: string
  /** Há pelo menos uma venda ou gasto no período. */
  temMovimento: boolean
  totais: ReportTotais
  categorias: CategoriaTotal[]
  formaPagamento: GrupoValor[]
  tipoVenda: GrupoValor[]
  topClientes: ClienteTotal[]
  serie: PontoSerie[]
  serieUnidade: SerieUnidade
  vendas: Entrada[]
  gastos: Saida[]
}

/**
 * Datas concretas do período. Para o preset "Tudo" usa a data real da primeira
 * e da última linha (não o `from` sentinela 2000-01-01); cai pra hoje quando
 * não há nenhum lançamento.
 */
function periodoConcreto(
  range: ResolvedRange,
  vendas: Entrada[],
  gastos: Saida[]
): { de: string; ate: string } {
  const [de, ate] = periodoConcretoISO(range, vendas, gastos)
  return { de: fmtDateBR(de), ate: fmtDateBR(ate) }
}

function periodoConcretoISO(
  range: ResolvedRange,
  vendas: Entrada[],
  gastos: Saida[]
): [string, string] {
  if (range.preset === "tudo") {
    const datas = [...vendas, ...gastos].map((r) => r.data).sort()
    if (datas.length > 0) return [datas[0], datas[datas.length - 1]]
  }
  return [range.from, range.to]
}

/**
 * "Setembro de 2026 · 01/09/2026 a 08/09/2026". Não repete o intervalo quando o
 * próprio rótulo já é um intervalo (recorte personalizado).
 */
function montaCabecalho(
  range: ResolvedRange,
  periodo: { de: string; ate: string },
  temMovimento: boolean
): string {
  if (range.preset === "tudo" && !temMovimento) return range.label
  const intervalo = `${periodo.de} a ${periodo.ate}`
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

// A granularidade da série se adapta ao período (evita dezenas de barras).
const DIAS_DIARIO = 45 // até ~1 mês e meio -> dia a dia
const DIAS_SEMANAL = 186 // até ~6 meses -> semana a semana; acima disso, mensal

/** Unidade da série para um intervalo. */
export function serieUnidade(range: ResolvedRange): SerieUnidade {
  const d = dias(range.from, range.to)
  if (d <= DIAS_DIARIO) return "dia"
  if (d <= DIAS_SEMANAL) return "semana"
  return "mês"
}

/** Segunda-feira da semana de `iso` (yyyy-MM-dd), em UTC pra não pegar fuso. */
function segundaDaSemana(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  const desdeSegunda = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - desdeSegunda)
  return d.toISOString().slice(0, 10)
}

/** "28/07–03/08" a partir da segunda-feira. */
function rotuloSemana(segunda: string): string {
  const ini = new Date(`${segunda}T00:00:00Z`)
  const fim = new Date(ini)
  fim.setUTCDate(fim.getUTCDate() + 6)
  const dd = (x: Date) => String(x.getUTCDate()).padStart(2, "0")
  const mm = (x: Date) => String(x.getUTCMonth() + 1).padStart(2, "0")
  return mm(ini) === mm(fim)
    ? `${dd(ini)}–${dd(fim)}/${mm(fim)}`
    : `${dd(ini)}/${mm(ini)}–${dd(fim)}/${mm(fim)}`
}

/**
 * Série "vendas x gastos" do período. Buckets por dia (<= 45d), semana (<= 186d)
 * ou mês. Só devolve pontos com algum movimento, em ordem cronológica.
 */
export function serie(
  entradas: Entrada[],
  saidas: Saida[],
  range: ResolvedRange
): PontoSerie[] {
  const unidade = serieUnidade(range)
  const key = (iso: string) => {
    if (unidade === "dia") return iso.slice(0, 10)
    if (unidade === "semana") return segundaDaSemana(iso)
    return iso.slice(0, 7)
  }
  const label = (k: string) => {
    if (unidade === "mês") {
      const [y, m] = k.split("-")
      return `${MESES[parseInt(m, 10) - 1] ?? m}/${y.slice(2)}`
    }
    if (unidade === "semana") return rotuloSemana(k)
    const [, m, d] = k.split("-")
    return `${d}/${m}`
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
  const t = computeTotais(vendas, gastos)
  const temMovimento = vendas.length > 0 || gastos.length > 0
  const periodo = periodoConcreto(range, vendas, gastos)
  const [deISO, ateISO] = periodoConcretoISO(range, vendas, gastos)
  return {
    range,
    cabecalho: montaCabecalho(range, periodo, temMovimento),
    periodo,
    periodoISO: { de: deISO, ate: ateISO },
    geradoEm: todayISO(),
    temMovimento,
    totais: {
      ...t,
      qtdVendas: vendas.length,
      qtdGastos: gastos.length,
      ticketMedio: vendas.length > 0 ? t.totalEntradas / vendas.length : 0,
    },
    categorias: computeCategorias(gastos),
    formaPagamento: porFormaPagamento(vendas),
    tipoVenda: porTipoVenda(vendas),
    topClientes: computeTopClientes(vendas),
    serie: serie(vendas, gastos, range),
    serieUnidade: serieUnidade(range),
    vendas,
    gastos,
  }
}
