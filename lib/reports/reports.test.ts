import { unzipSync } from "fflate"
import { describe, expect, it } from "vitest"

import { computeTotais } from "@/lib/finance"
import { buildFinanceReport, serie } from "@/lib/reports/build"
import { resolveRange } from "@/lib/reports/period"
import { buildFinanceReportPdf } from "@/lib/reports/pdf"
import { buildFinanceReportXlsx } from "@/lib/reports/xlsx"
import type { Entrada, Saida } from "@/lib/types"

const entrada = (over: Partial<Entrada>): Entrada => ({
  id: "e",
  user_id: "u",
  data: "2026-09-05",
  cliente: "Cliente Acentuação São João",
  produto: "Farofa Tradicional",
  tipo_venda: "Cliente Final",
  qtd: "2",
  valor_unitario: "14.00",
  valor_total: "28.00",
  forma_pagamento: "PIX",
  obs: null,
  origem: "manual",
  origem_id: null,
  created_at: "",
  ...over,
})

const saida = (over: Partial<Saida>): Saida => ({
  id: "s",
  user_id: "u",
  data: "2026-09-05",
  categoria: "Ingredientes",
  descricao: "Farinha",
  fornecedor: null,
  valor: "40.00",
  forma_pagamento: "Dinheiro",
  obs: null,
  created_at: "",
  ...over,
})

const vendas = [
  entrada({ id: "1", data: "2026-09-02", valor_total: "28.00" }),
  entrada({
    id: "2",
    data: "2026-09-05",
    valor_total: "117.60",
    tipo_venda: "Fornecedor (Atacado)",
    forma_pagamento: null,
    cliente: "Mercadinho da Praça",
  }),
  entrada({ id: "3", data: "2026-09-20", valor_total: "14.00", cliente: null }),
]
const gastos = [
  saida({ id: "1", data: "2026-09-03", valor: "40.00", categoria: "Ingredientes" }),
  saida({ id: "2", data: "2026-09-18", valor: "12.00", categoria: "Embalagens" }),
]

describe("resolveRange", () => {
  it("padrão é 'tudo'", () => {
    const r = resolveRange({})
    expect(r.preset).toBe("tudo")
    expect(r.from).toBe("2000-01-01")
    expect(r.label).toBe("Todo o período")
  })

  it("este_mes começa no dia 1", () => {
    const r = resolveRange({ preset: "este_mes" })
    expect(r.from.endsWith("-01")).toBe(true)
    expect(r.from <= r.to).toBe(true)
  })

  it("30d = janela de 30 dias", () => {
    const r = resolveRange({ preset: "30d" })
    const days = Math.round((Date.parse(r.to) - Date.parse(r.from)) / 86_400_000)
    expect(days).toBe(29)
  })

  it("from/to explícitos vencem o preset e são ordenados", () => {
    const r = resolveRange({ from: "2026-03-31", to: "2026-01-01" })
    expect(r.preset).toBeNull()
    expect(r).toMatchObject({ from: "2026-01-01", to: "2026-03-31" })
    expect(r.label).toBe("01/01/2026 a 31/03/2026")
  })
})

describe("buildFinanceReport", () => {
  const range = resolveRange({ from: "2026-09-01", to: "2026-09-30" })
  const rep = buildFinanceReport(vendas, gastos, range)

  it("totais batem com computeTotais + contagens + ticket médio", () => {
    const t = computeTotais(vendas, gastos)
    expect(rep.totais.totalEntradas).toBeCloseTo(t.totalEntradas)
    expect(rep.totais.totalSaidas).toBeCloseTo(t.totalSaidas)
    expect(rep.totais.qtdVendas).toBe(3)
    expect(rep.totais.qtdGastos).toBe(2)
    expect(rep.totais.totalEntradas).toBeCloseTo(159.6)
    expect(rep.totais.lucro).toBeCloseTo(107.6)
    // ticket médio = total de vendas / qtd de vendas
    expect(rep.totais.ticketMedio).toBeCloseTo(159.6 / 3)
    expect(rep.temMovimento).toBe(true)
  })

  it("ticket médio é 0 quando não há vendas (sem divisão por zero)", () => {
    const r = buildFinanceReport([], gastos, range)
    expect(r.totais.ticketMedio).toBe(0)
    expect(r.totais.margem).toBe(0)
    expect(r.temMovimento).toBe(true) // tem gastos
  })

  it("agrupa por forma de pagamento (null -> Não informado) e soma certo", () => {
    const pix = rep.formaPagamento.find((r) => r.chave === "PIX")
    const ni = rep.formaPagamento.find((r) => r.chave === "Não informado")
    expect(pix).toMatchObject({ count: 2, valor: 42 })
    expect(ni).toMatchObject({ count: 1, valor: 117.6 })
  })

  it("agrupa por tipo de venda", () => {
    const atacado = rep.tipoVenda.find((r) => r.chave === "Fornecedor (Atacado)")
    const final = rep.tipoVenda.find((r) => r.chave === "Cliente Final")
    expect(atacado).toMatchObject({ count: 1, valor: 117.6 })
    expect(final).toMatchObject({ count: 2, valor: 42 })
  })

  it("gastos por categoria: valor + contagem, ordenado por valor", () => {
    const ing = rep.categorias.find((c) => c.categoria === "Ingredientes")
    const emb = rep.categorias.find((c) => c.categoria === "Embalagens")
    expect(ing).toMatchObject({ valor: 40, count: 1 })
    expect(emb).toMatchObject({ valor: 12, count: 1 })
    expect(rep.categorias[0].categoria).toBe("Ingredientes")
  })

  it("período concreto e data de geração", () => {
    expect(rep.periodo).toEqual({ de: "01/09/2026", ate: "30/09/2026" })
    expect(rep.geradoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("descarta linhas fora da janela (não confia só na busca)", () => {
    const forceOut = [
      ...vendas,
      entrada({ id: "fora", data: "2025-12-31", valor_total: "999.00" }),
    ]
    const r = buildFinanceReport(forceOut, gastos, range)
    expect(r.totais.qtdVendas).toBe(3)
    expect(r.vendas.some((v) => v.id === "fora")).toBe(false)
    expect(r.totais.totalEntradas).toBeCloseTo(159.6)
  })

  it("cabeçalho: 'Tudo' usa as datas reais, não o sentinel 2000-01-01", () => {
    const antigas = [
      entrada({ id: "a", data: "2025-02-10", valor_total: "10.00" }),
      entrada({ id: "b", data: "2025-06-30", valor_total: "20.00" }),
    ]
    const r = buildFinanceReport(antigas, [], resolveRange({ preset: "tudo" }))
    expect(r.cabecalho).toBe("Todo o período · 10/02/2025 a 30/06/2025")
    expect(r.periodo).toEqual({ de: "10/02/2025", ate: "30/06/2025" })
    expect(r.cabecalho).not.toContain("2000")
  })

  it("cabeçalho: recorte personalizado não repete o intervalo", () => {
    expect(rep.cabecalho).toBe("01/09/2026 a 30/09/2026")
  })

  it("período sem movimento: relatório monta, temMovimento = false", () => {
    const r = buildFinanceReport([], [], resolveRange({ preset: "mes_passado" }))
    expect(r.temMovimento).toBe(false)
    expect(r.totais).toMatchObject({
      totalEntradas: 0,
      totalSaidas: 0,
      lucro: 0,
      margem: 0,
      qtdVendas: 0,
      qtdGastos: 0,
      ticketMedio: 0,
    })
  })
})

describe("serie — granularidade adapta ao período", () => {
  it("<= 45 dias: diário (dd/MM)", () => {
    const s = serie(vendas, gastos, resolveRange({ from: "2026-09-01", to: "2026-09-30" }))
    expect(s.every((p) => /^\d{2}\/\d{2}$/.test(p.label))).toBe(true)
    expect(s.length).toBe(5) // 02, 03, 05, 18, 20
  })

  it("46–186 dias: semanal (intervalo dd–dd/MM)", () => {
    const s = serie(vendas, gastos, resolveRange({ from: "2026-07-01", to: "2026-10-31" }))
    expect(s.every((p) => p.label.includes("–") || p.label.includes("-"))).toBe(true)
    // vendas caem em 2 semanas de setembro (02/09 e 05/09 juntas; 20/09 separada)
    const totalV = s.reduce((a, p) => a + p.entradas, 0)
    expect(totalV).toBeCloseTo(159.6)
  })

  it("> 186 dias: mensal (Mmm/AA)", () => {
    const s = serie(vendas, gastos, resolveRange({ from: "2026-01-01", to: "2026-12-31" }))
    expect(s.every((p) => /^[A-Z][a-z]{2}\/\d{2}$/.test(p.label))).toBe(true)
    expect(s.length).toBe(1) // só setembro tem movimento
    expect(s[0].entradas).toBeCloseTo(159.6)
    expect(s[0].saidas).toBeCloseTo(52)
  })
})

describe("exportação — PDF", () => {
  it("gera um PDF válido e paginado", async () => {
    const data = buildFinanceReport(vendas, gastos, resolveRange({ preset: "tudo" }))
    const bytes = await buildFinanceReportPdf(data)
    expect(bytes.byteLength).toBeGreaterThan(1000)
    expect(Buffer.from(bytes.subarray(0, 5)).toString("latin1")).toBe("%PDF-")
  })

  it("sobrevive a acento/emoji nos dados", async () => {
    const data = buildFinanceReport(
      [entrada({ id: "x", produto: "Farofa 🌽 Ação", cliente: "João D'Ávila" })],
      [saida({ id: "y", descricao: "Café ☕", fornecedor: "Ção Ltda." })],
      resolveRange({ preset: "tudo" })
    )
    const bytes = await buildFinanceReportPdf(data)
    expect(Buffer.from(bytes.subarray(0, 5)).toString("latin1")).toBe("%PDF-")
  })

  it("período vazio ainda gera o PDF", async () => {
    const empty = buildFinanceReport([], [], resolveRange({ preset: "mes_passado" }))
    const bytes = await buildFinanceReportPdf(empty)
    expect(bytes.byteLength).toBeGreaterThan(1000)
    expect(Buffer.from(bytes.subarray(0, 5)).toString("latin1")).toBe("%PDF-")
  })
})

describe("exportação — Excel", () => {
  const data = buildFinanceReport(vendas, gastos, resolveRange({ preset: "tudo" }))

  it("gera um .xlsx com as 5 abas nomeadas", async () => {
    const buf = await buildFinanceReportXlsx(data)
    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK")
    const zip = unzipSync(new Uint8Array(buf))
    const workbook = Buffer.from(zip["xl/workbook.xml"]).toString("utf8")
    for (const nome of [
      "Resumo",
      "Vendas",
      "Gastos",
      "Gastos por categoria",
      "Análise",
    ]) {
      expect(workbook).toContain(`"${nome}"`)
    }
  })

  it("a aba Resumo traz os indicadores pedidos", async () => {
    const buf = await buildFinanceReportXlsx(data)
    const zip = unzipSync(new Uint8Array(buf))
    const sst = Buffer.from(zip["xl/sharedStrings.xml"]).toString("utf8")
    for (const label of [
      "Entradas",
      "Saídas",
      "Total de vendas",
      "Quantidade de vendas",
      "Ticket médio",
      "Total de gastos",
      "Quantidade de gastos",
      "Percentual",
      "Período analisado",
      "Data de geração",
    ]) {
      expect(sst).toContain(label)
    }
  })

  it("período vazio ainda gera o .xlsx (com o aviso)", async () => {
    const empty = buildFinanceReport([], [], resolveRange({ preset: "mes_passado" }))
    const buf = await buildFinanceReportXlsx(empty)
    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK")
    const zip = unzipSync(new Uint8Array(buf))
    const sst = Buffer.from(zip["xl/sharedStrings.xml"]).toString("utf8")
    expect(sst).toContain("Nenhuma movimentação encontrada no período selecionado.")
  })
})
