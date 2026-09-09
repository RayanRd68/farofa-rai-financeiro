import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  computeCategorias,
  computeTopClientes,
  computeTotais,
  margemProduto,
} from "@/lib/finance"
import { buildFinanceReport } from "@/lib/reports/build"
import { resolveRange } from "@/lib/reports/period"
import type { Entrada, Produto, Saida } from "@/lib/types"

type Raw = {
  entradas: {
    data: string
    cliente: string
    produto: string
    tipoVenda: string
    qtd: number
    valorUnitario: number
    valorTotal: number
    formaPagamento: string
    obs: string
  }[]
  saidas: {
    data: string
    categoria: string
    descricao: string
    fornecedor: string
    valor: number
    formaPagamento: string
    obs: string
  }[]
  produtos: {
    produto: string
    custoProducao: number
    precoClienteFinal: number
    precoRevenda: number
  }[]
}

const raw = JSON.parse(
  readFileSync(join(__dirname, "../scripts/planilha3-clean.json"), "utf8")
) as Raw

const entradas: Entrada[] = raw.entradas.map((e, i) => ({
  id: `e${i}`,
  user_id: "u",
  data: e.data,
  cliente: e.cliente || null,
  produto: e.produto,
  tipo_venda: e.tipoVenda as Entrada["tipo_venda"],
  qtd: String(e.qtd),
  valor_unitario: e.valorUnitario.toFixed(2),
  valor_total: e.valorTotal.toFixed(2),
  forma_pagamento: e.formaPagamento || null,
  obs: e.obs || null,
  origem: "manual",
  origem_id: null,
  created_at: "",
}))

const saidas: Saida[] = raw.saidas.map((s, i) => ({
  id: `s${i}`,
  user_id: "u",
  data: s.data,
  categoria: s.categoria,
  descricao: s.descricao,
  fornecedor: s.fornecedor || null,
  valor: s.valor.toFixed(2),
  forma_pagamento: s.formaPagamento || null,
  obs: s.obs || null,
  created_at: "",
}))

const produto: Produto = {
  id: "p",
  user_id: "u",
  produto: raw.produtos[0].produto,
  custo_producao: raw.produtos[0].custoProducao.toFixed(2),
  preco_cliente_final: raw.produtos[0].precoClienteFinal.toFixed(2),
  preco_revenda: raw.produtos[0].precoRevenda.toFixed(2),
  created_at: "",
}

describe("planilha real (jun–ago/2026) — bate com a aba Resumo", () => {
  it("204 entradas e 65 saídas carregadas", () => {
    expect(entradas).toHaveLength(204)
    expect(saidas).toHaveLength(65)
  })

  it("totais: entradas 7763,90 · saídas ~4706,37 · lucro ~3057,53 · margem 39,4%", () => {
    const t = computeTotais(entradas, saidas)
    expect(t.totalEntradas).toBeCloseTo(7763.9, 2)
    expect(t.totalSaidas).toBeCloseTo(4706.37, 2)
    expect(t.lucro).toBeCloseTo(3057.53, 2)
    expect(t.margem).toBeCloseTo(0.3938, 4)
  })

  it("série mensal (ano inteiro) bate com a planilha", () => {
    // Intervalo > 6 meses -> buckets mensais.
    const range = resolveRange({ from: "2026-01-01", to: "2026-12-31" })
    const { serie } = buildFinanceReport(entradas, saidas, range)
    const m = Object.fromEntries(serie.map((p) => [p.label, p]))
    expect(serie.map((p) => p.label)).toEqual(["Jun/26", "Jul/26", "Ago/26"])
    expect(m["Jun/26"].entradas).toBeCloseTo(2745, 2)
    expect(m["Jun/26"].saidas).toBeCloseTo(1258.08, 2)
    expect(m["Jul/26"].entradas).toBeCloseTo(2732.9, 2)
    expect(m["Ago/26"].entradas).toBeCloseTo(2286, 2)
    expect(m["Ago/26"].saidas).toBeCloseTo(1964.38, 2)
  })

  it("recorte de agosto/2026 bate com a planilha", () => {
    const range = resolveRange({ from: "2026-08-01", to: "2026-08-31" })
    const { totais } = buildFinanceReport(entradas, saidas, range)
    expect(totais.totalEntradas).toBeCloseTo(2286, 2)
    expect(totais.totalSaidas).toBeCloseTo(1964.38, 2)
    expect(totais.lucro).toBeCloseTo(321.62, 2)
    // agosto inteiro tem 31 dias -> série diária
    const { serie } = buildFinanceReport(entradas, saidas, range)
    expect(serie.every((p) => /^\d{2}\/\d{2}$/.test(p.label))).toBe(true)
  })

  it("gastos por categoria somam o total de saídas + contam as linhas", () => {
    const cats = computeCategorias(saidas)
    const soma = cats.reduce((s, c) => s + c.valor, 0)
    expect(soma).toBeCloseTo(4706.37, 2)
    // maior categoria = Ingredientes
    expect(cats[0].categoria).toBe("Ingredientes")
    expect(cats.every((c, i) => i === 0 || c.valor <= cats[i - 1].valor)).toBe(
      true
    )
    // a soma das quantidades por categoria = total de gastos
    expect(cats.reduce((s, c) => s + c.count, 0)).toBe(saidas.length)
    expect(cats.every((c) => c.count >= 1)).toBe(true)
  })

  it("top clientes: ordenado por total, no máx. 5", () => {
    const top = computeTopClientes(entradas)
    expect(top.length).toBeLessThanOrEqual(5)
    expect(
      top.every((c, i) => i === 0 || c.total <= top[i - 1].total)
    ).toBe(true)
    expect(top[0].pedidos).toBeGreaterThan(0)
  })

  it("margem do produto: 60,1% cliente final · 43,6% revenda", () => {
    const mp = margemProduto(produto)
    expect(mp.lucroFinal).toBeCloseTo(8.42, 2)
    expect(mp.margemFinal).toBeCloseTo(0.6014, 4)
    expect(mp.lucroRevenda).toBeCloseTo(4.32, 2)
    expect(mp.margemRevenda).toBeCloseTo(0.4364, 4)
  })
})

describe("casos de borda", () => {
  it("sem dados: totais zerados, margem 0", () => {
    const t = computeTotais([], [])
    expect(t).toEqual({
      totalEntradas: 0,
      totalSaidas: 0,
      lucro: 0,
      margem: 0,
    })
  })

  it("prejuízo: lucro negativo, margem negativa", () => {
    const t = computeTotais(
      [{ ...entradas[0], valor_total: "10.00" }],
      [{ ...saidas[0], valor: "30.00" }]
    )
    expect(t.lucro).toBe(-20)
    expect(t.margem).toBeCloseTo(-2, 4)
  })

  it("cliente vazio cai em 'Não identificado'", () => {
    const top = computeTopClientes([
      { ...entradas[0], cliente: null, valor_total: "50.00" },
    ])
    expect(top[0].cliente).toBe("Não identificado")
  })
})
