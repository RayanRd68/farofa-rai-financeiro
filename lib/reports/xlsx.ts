import "server-only"

import writeXlsxFile, { type SheetData } from "write-excel-file/node"

import { fmtDateBR, toNumber } from "@/lib/format"
import type { FinanceReportData } from "@/lib/reports/build"

/**
 * .xlsx do "Relatório financeiro" da Farofa da Rai. 5 abas fixas: Resumo,
 * Vendas, Gastos, Gastos por categoria, Análise. Os valores saem do mesmo
 * `buildFinanceReport` que alimenta a tela e o PDF (não podem divergir).
 * `write-excel-file` (dep transitiva só `fflate`) não gera gráficos — a aba
 * Análise traz os dados prontos pra plotar no Excel.
 */

const MONEY = '"R$" #,##0.00'
const PERC = "0.00%"
const HEAD = { fontWeight: "bold" as const, backgroundColor: "#f7efdc" }

const money = (v: string | number) => ({
  type: Number as NumberConstructor,
  value: toNumber(v),
  format: MONEY,
})
const perc = (ratio: number) => ({
  type: Number as NumberConstructor,
  value: Number.isFinite(ratio) ? ratio : 0,
  format: PERC,
})
const int = (v: string | number) => ({
  type: Number as NumberConstructor,
  value: Math.round(toNumber(v)),
})
const num = (v: string | number) => ({
  type: Number as NumberConstructor,
  value: toNumber(v),
  format: "#,##0.###",
})
const text = (v: string) => ({ type: String as StringConstructor, value: v })
const strong = (v: string) => ({
  type: String as StringConstructor,
  value: v,
  fontWeight: "bold" as const,
})
const date = (iso: string) => ({
  type: Date as DateConstructor,
  value: new Date(`${iso.slice(0, 10)}T12:00:00Z`),
  format: "dd/mm/yyyy",
})

export async function buildFinanceReportXlsx(
  data: FinanceReportData
): Promise<Buffer> {
  const { totais, categorias, serie, vendas, gastos, periodo } = data
  const saidas = totais.totalSaidas

  // ── Aba 1: Resumo ────────────────────────────────────────────────────────
  const resumo: SheetData = [
    [strong("Relatório financeiro — Farofa da Rai")],
    [text("Período analisado"), text(`${periodo.de} até ${periodo.ate}`)],
    [text("Data de geração"), text(fmtDateBR(data.geradoEm))],
    [],
    [{ ...text("Indicador"), ...HEAD }, { ...text("Valor"), ...HEAD }],
    [text("Entradas"), money(totais.totalEntradas)],
    [text("Saídas"), money(totais.totalSaidas)],
    [
      text(totais.lucro < 0 ? "Prejuízo do período" : "Lucro do período"),
      money(totais.lucro),
    ],
    [text("Margem"), perc(totais.margem)],
    [text("Total de vendas"), money(totais.totalEntradas)],
    [text("Quantidade de vendas"), int(totais.qtdVendas)],
    [text("Ticket médio"), money(totais.ticketMedio)],
    [text("Total de gastos"), money(totais.totalSaidas)],
    [text("Quantidade de gastos"), int(totais.qtdGastos)],
    ...(data.temMovimento
      ? []
      : [
          [],
          [strong("Nenhuma movimentação encontrada no período selecionado.")],
        ]),
  ]

  // ── Aba 2: Vendas ────────────────────────────────────────────────────────
  const vendasSheet: SheetData = [
    [
      { ...text("Data"), ...HEAD },
      { ...text("Cliente"), ...HEAD },
      { ...text("Produto"), ...HEAD },
      { ...text("Quantidade"), ...HEAD },
      { ...text("Valor unitário"), ...HEAD },
      { ...text("Valor total"), ...HEAD },
      { ...text("Forma de pagamento"), ...HEAD },
      { ...text("Tipo"), ...HEAD },
      { ...text("Origem"), ...HEAD },
    ],
    ...vendas.map((v) => [
      date(v.data),
      text(v.cliente ?? "—"),
      text(v.produto),
      num(v.qtd),
      money(v.valor_unitario),
      money(v.valor_total),
      text(v.forma_pagamento ?? "Não informado"),
      text(v.tipo_venda),
      text(v.origem === "crm" ? "CRM" : "Manual"),
    ]),
    [],
    [strong("Total vendido"), money(totais.totalEntradas)],
    [strong("Quantidade de vendas"), int(totais.qtdVendas)],
    [strong("Ticket médio"), money(totais.ticketMedio)],
  ]

  // ── Aba 3: Gastos ────────────────────────────────────────────────────────
  const gastosSheet: SheetData = [
    [
      { ...text("Data"), ...HEAD },
      { ...text("Descrição"), ...HEAD },
      { ...text("Categoria"), ...HEAD },
      { ...text("Fornecedor"), ...HEAD },
      { ...text("Forma de pagamento"), ...HEAD },
      { ...text("Valor"), ...HEAD },
    ],
    ...gastos.map((g) => [
      date(g.data),
      text(g.descricao),
      text(g.categoria),
      text(g.fornecedor ?? "—"),
      text(g.forma_pagamento ?? "—"),
      money(g.valor),
    ]),
    [],
    [strong("Total de gastos"), money(totais.totalSaidas)],
    [strong("Quantidade de gastos"), int(totais.qtdGastos)],
  ]

  // ── Aba 4: Gastos por categoria ──────────────────────────────────────────
  const categoriaSheet: SheetData = [
    [
      { ...text("Categoria"), ...HEAD },
      { ...text("Quantidade"), ...HEAD },
      { ...text("Valor total"), ...HEAD },
      { ...text("Percentual"), ...HEAD },
    ],
    ...categorias.map((c) => [
      text(c.categoria),
      int(c.count),
      money(c.valor),
      perc(saidas > 0 ? c.valor / saidas : 0),
    ]),
    [
      strong("TOTAL"),
      int(totais.qtdGastos),
      money(totais.totalSaidas),
      perc(saidas > 0 ? 1 : 0),
    ],
  ]

  // ── Aba 5: Análise (vendas x gastos) ─────────────────────────────────────
  const analiseSheet: SheetData = [
    [
      { ...text("Período"), ...HEAD },
      { ...text("Vendas"), ...HEAD },
      { ...text("Gastos"), ...HEAD },
      { ...text("Lucro"), ...HEAD },
    ],
    ...serie.map((p) => [
      text(p.label),
      money(p.entradas),
      money(p.saidas),
      money(p.entradas - p.saidas),
    ]),
    [
      strong("TOTAL"),
      money(totais.totalEntradas),
      money(totais.totalSaidas),
      money(totais.lucro),
    ],
  ]

  const workbook = writeXlsxFile([
    {
      sheet: "Resumo",
      data: resumo,
      columns: [{ width: 26 }, { width: 26 }],
    },
    {
      sheet: "Vendas",
      data: vendasSheet,
      columns: [
        { width: 12 },
        { width: 26 },
        { width: 22 },
        { width: 12 },
        { width: 14 },
        { width: 14 },
        { width: 20 },
        { width: 18 },
        { width: 10 },
      ],
    },
    {
      sheet: "Gastos",
      data: gastosSheet,
      columns: [
        { width: 12 },
        { width: 32 },
        { width: 22 },
        { width: 22 },
        { width: 20 },
        { width: 14 },
      ],
    },
    {
      sheet: "Gastos por categoria",
      data: categoriaSheet,
      columns: [{ width: 26 }, { width: 12 }, { width: 16 }, { width: 12 }],
    },
    {
      sheet: "Análise",
      data: analiseSheet,
      columns: [{ width: 20 }, { width: 16 }, { width: 16 }, { width: 16 }],
    },
  ])
  return workbook.toBuffer()
}
