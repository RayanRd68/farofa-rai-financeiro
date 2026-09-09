import "server-only"

import writeXlsxFile from "write-excel-file/node"

import { toNumber } from "@/lib/format"
import type { FinanceReportData } from "@/lib/reports/build"

/**
 * .xlsx do relatório do Controle Financeiro — uma aba por recorte + as listas
 * completas de vendas e gastos. Espelha `CRM/lib/reports/xlsx.ts` (ADR-023).
 */

const MONEY = '"R$" #,##0.00'
const HEAD = { fontWeight: "bold" as const, backgroundColor: "#f7efdc" }

const money = (v: string | number) => ({
  type: Number as NumberConstructor,
  value: toNumber(v),
  format: MONEY,
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
const date = (iso: string) => ({
  type: Date as DateConstructor,
  value: new Date(`${iso.slice(0, 10)}T12:00:00Z`),
  format: "dd/mm/yyyy",
})

export async function buildFinanceReportXlsx(
  data: FinanceReportData
): Promise<Buffer> {
  const { cabecalho, totais, categorias, formaPagamento, tipoVenda, serie, vendas, gastos } =
    data
  const receita = totais.totalEntradas

  const resumo = [
    [{ ...text("Relatório financeiro — Farofa da Rai"), fontWeight: "bold" as const }],
    [text("Período"), text(cabecalho)],
    [],
    [
      { ...text("Indicador"), ...HEAD },
      { ...text("Valor"), ...HEAD },
    ],
    [text("Vendas"), int(totais.qtdVendas)],
    [text("Total de vendas"), money(totais.totalEntradas)],
    [text("Gastos"), int(totais.qtdGastos)],
    [text("Total de gastos"), money(totais.totalSaidas)],
    [
      text(totais.lucro < 0 ? "Prejuízo" : "Lucro"),
      money(totais.lucro),
    ],
    [
      text("Margem"),
      { type: Number as NumberConstructor, value: totais.margem, format: "0.0%" },
    ],
  ]

  const pagamento = [
    [
      { ...text("Forma de pagamento"), ...HEAD },
      { ...text("Vendas"), ...HEAD },
      { ...text("Valor"), ...HEAD },
      { ...text("% do total"), ...HEAD },
    ],
    ...formaPagamento.map((r) => [
      text(r.chave),
      int(r.count),
      money(r.valor),
      {
        type: Number as NumberConstructor,
        value: receita > 0 ? r.valor / receita : 0,
        format: "0.0%",
      },
    ]),
  ]

  const tipo = [
    [
      { ...text("Tipo de venda"), ...HEAD },
      { ...text("Vendas"), ...HEAD },
      { ...text("Valor"), ...HEAD },
    ],
    ...tipoVenda.map((r) => [text(r.chave), int(r.count), money(r.valor)]),
  ]

  const categoriasSheet = [
    [
      { ...text("Categoria"), ...HEAD },
      { ...text("Valor"), ...HEAD },
    ],
    ...categorias.map((c) => [text(c.categoria), money(c.valor)]),
  ]

  const porPeriodo = [
    [
      { ...text("Período"), ...HEAD },
      { ...text("Vendas"), ...HEAD },
      { ...text("Gastos"), ...HEAD },
      { ...text("Resultado"), ...HEAD },
    ],
    ...serie.map((p) => [
      text(p.label),
      money(p.entradas),
      money(p.saidas),
      money(p.entradas - p.saidas),
    ]),
  ]

  const vendasSheet = [
    [
      { ...text("Data"), ...HEAD },
      { ...text("Cliente"), ...HEAD },
      { ...text("Produto"), ...HEAD },
      { ...text("Qtde"), ...HEAD },
      { ...text("Valor unit."), ...HEAD },
      { ...text("Total"), ...HEAD },
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
      text(v.forma_pagamento ?? "—"),
      text(v.tipo_venda),
      text(v.origem === "crm" ? "CRM" : "Manual"),
    ]),
  ]

  const gastosSheet = [
    [
      { ...text("Data"), ...HEAD },
      { ...text("Categoria"), ...HEAD },
      { ...text("Descrição"), ...HEAD },
      { ...text("Fornecedor"), ...HEAD },
      { ...text("Valor"), ...HEAD },
      { ...text("Forma de pagamento"), ...HEAD },
    ],
    ...gastos.map((g) => [
      date(g.data),
      text(g.categoria),
      text(g.descricao),
      text(g.fornecedor ?? "—"),
      money(g.valor),
      text(g.forma_pagamento ?? "—"),
    ]),
  ]

  const workbook = writeXlsxFile([
    { sheet: "Resumo", data: resumo, columns: [{ width: 24 }, { width: 18 }] },
    {
      sheet: "Vendas por pagamento",
      data: pagamento,
      columns: [{ width: 22 }, { width: 10 }, { width: 14 }, { width: 12 }],
    },
    {
      sheet: "Vendas por tipo",
      data: tipo,
      columns: [{ width: 22 }, { width: 10 }, { width: 14 }],
    },
    {
      sheet: "Gastos por categoria",
      data: categoriasSheet,
      columns: [{ width: 26 }, { width: 14 }],
    },
    {
      sheet: "Por período",
      data: porPeriodo,
      columns: [{ width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }],
    },
    {
      sheet: "Vendas",
      data: vendasSheet,
      columns: [
        { width: 12 },
        { width: 28 },
        { width: 22 },
        { width: 8 },
        { width: 12 },
        { width: 12 },
        { width: 20 },
        { width: 20 },
        { width: 10 },
      ],
    },
    {
      sheet: "Gastos",
      data: gastosSheet,
      columns: [
        { width: 12 },
        { width: 22 },
        { width: 32 },
        { width: 22 },
        { width: 12 },
        { width: 20 },
      ],
    },
  ])
  return workbook.toBuffer()
}
