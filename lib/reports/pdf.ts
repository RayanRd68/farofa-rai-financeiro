import "server-only"

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib"

import { fmtBRL, fmtDate, fmtNum, fmtPct } from "@/lib/format"
import type { FinanceReportData } from "@/lib/reports/build"

/**
 * PDF do relatório do Controle Financeiro. A classe `Doc` (layout paginado +
 * sanitização WinAnsi) é portada de `CRM/lib/reports/pdf.ts` (ADR-023).
 */

const PAGE = { w: 595.28, h: 841.89 }
const MARGIN = 40
const INK = rgb(0.13, 0.12, 0.1)
const MUTED = rgb(0.42, 0.4, 0.36)
const HEAD_BG = rgb(0.97, 0.94, 0.86)
const LINE = rgb(0.85, 0.83, 0.79)

const REMAP: Record<string, string> = {
  "—": "-",
  "–": "-",
  "…": "...",
  "→": "->",
  "↩": "<-",
  "•": "-",
  "·": "-",
  "’": "'",
  "‘": "'",
  "“": '"',
  "”": '"',
  " ": " ",
}
const UNDEFINED_WINANSI = new Set([0x81, 0x8d, 0x8f, 0x90, 0x9d])

/** Deixa a string segura para a fonte padrão (WinAnsi) do pdf-lib. */
function wa(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value)
  let out = ""
  for (const ch of s) {
    if (ch === "\n" || ch === "\r" || ch === "\t") {
      out += " "
      continue
    }
    const mapped = REMAP[ch]
    if (mapped != null) {
      out += mapped
      continue
    }
    const code = ch.codePointAt(0) ?? 0
    out += code <= 0xff && !UNDEFINED_WINANSI.has(code) ? ch : "?"
  }
  return out
}

type Col = { header: string; width: number; align?: "left" | "right" }

class Doc {
  private page!: PDFPage
  private y = 0
  constructor(
    private readonly pdf: PDFDocument,
    private readonly font: PDFFont,
    private readonly bold: PDFFont
  ) {
    this.newPage()
  }

  private newPage() {
    this.page = this.pdf.addPage([PAGE.w, PAGE.h])
    this.y = PAGE.h - MARGIN
  }

  private clip(s: string, size: number, width: number, f = this.font) {
    const t = wa(s)
    if (f.widthOfTextAtSize(t, size) <= width) return t
    let cut = t
    while (cut.length > 1 && f.widthOfTextAtSize(cut + "...", size) > width) {
      cut = cut.slice(0, -1)
    }
    return cut.trimEnd() + "..."
  }

  private ensure(space: number) {
    if (this.y - space < MARGIN) this.newPage()
  }

  gap(h = 10) {
    this.y -= h
  }

  title(t: string) {
    this.ensure(24)
    this.page.drawText(wa(t), {
      x: MARGIN,
      y: this.y - 16,
      size: 16,
      font: this.bold,
      color: INK,
    })
    this.y -= 22
  }

  subtitle(t: string) {
    this.ensure(16)
    this.page.drawText(wa(t), {
      x: MARGIN,
      y: this.y - 11,
      size: 10,
      font: this.font,
      color: MUTED,
    })
    this.y -= 16
  }

  section(t: string) {
    this.ensure(20)
    this.gap(6)
    this.page.drawText(wa(t), {
      x: MARGIN,
      y: this.y - 11,
      size: 11,
      font: this.bold,
      color: INK,
    })
    this.y -= 15
  }

  keyValues(rows: [string, string][]) {
    const size = 9.5
    const labelW = 150
    for (const [k, v] of rows) {
      this.ensure(15)
      this.page.drawText(wa(k), {
        x: MARGIN,
        y: this.y - 10,
        size,
        font: this.font,
        color: MUTED,
      })
      this.page.drawText(wa(v), {
        x: MARGIN + labelW,
        y: this.y - 10,
        size,
        font: this.bold,
        color: INK,
      })
      this.y -= 14
    }
  }

  table(cols: Col[], rows: string[][], opts?: { emptyText?: string }) {
    const size = 8.5
    const rowH = 15
    const xs: number[] = []
    let acc = MARGIN
    for (const c of cols) {
      xs.push(acc)
      acc += c.width
    }
    const totalW = acc - MARGIN

    const drawHeader = () => {
      this.ensure(rowH + 4)
      this.page.drawRectangle({
        x: MARGIN,
        y: this.y - rowH + 3,
        width: totalW,
        height: rowH,
        color: HEAD_BG,
      })
      cols.forEach((c, i) => {
        const label = this.clip(c.header, size, c.width - 6, this.bold)
        const w = this.bold.widthOfTextAtSize(label, size)
        this.page.drawText(label, {
          x: c.align === "right" ? xs[i] + c.width - 4 - w : xs[i] + 3,
          y: this.y - rowH + 8,
          size,
          font: this.bold,
          color: INK,
        })
      })
      this.y -= rowH
    }

    drawHeader()

    if (rows.length === 0) {
      this.ensure(rowH)
      this.page.drawText(wa(opts?.emptyText ?? "Sem dados no período."), {
        x: MARGIN + 3,
        y: this.y - 10,
        size,
        font: this.font,
        color: MUTED,
      })
      this.y -= rowH
      return
    }

    rows.forEach((r) => {
      if (this.y - rowH < MARGIN) {
        this.newPage()
        drawHeader()
      }
      cols.forEach((c, i) => {
        const val = this.clip(r[i] ?? "", size, c.width - 6)
        const w = this.font.widthOfTextAtSize(val, size)
        this.page.drawText(val, {
          x: c.align === "right" ? xs[i] + c.width - 4 - w : xs[i] + 3,
          y: this.y - 10,
          size,
          font: this.font,
          color: INK,
        })
      })
      this.page.drawLine({
        start: { x: MARGIN, y: this.y - rowH + 2 },
        end: { x: MARGIN + totalW, y: this.y - rowH + 2 },
        thickness: 0.5,
        color: LINE,
      })
      this.y -= rowH
    })
  }

  footer(t: string) {
    for (const p of this.pdf.getPages()) {
      p.drawText(wa(t), {
        x: MARGIN,
        y: MARGIN - 14,
        size: 7.5,
        font: this.font,
        color: MUTED,
      })
    }
  }

  save() {
    return this.pdf.save()
  }
}

export async function buildFinanceReportPdf(
  data: FinanceReportData
): Promise<Uint8Array> {
  const { cabecalho, totais, categorias, formaPagamento, tipoVenda, serie, vendas, gastos } =
    data
  const receita = totais.totalEntradas

  const pdf = await PDFDocument.create()
  pdf.setTitle(`Relatório financeiro — ${cabecalho}`)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const doc = new Doc(pdf, font, bold)

  doc.title("Relatório financeiro")
  doc.subtitle(`Farofa da Rai - Controle financeiro | ${cabecalho}`)
  doc.gap(6)

  doc.section("Resumo do período")
  doc.keyValues([
    ["Vendas", fmtNum(totais.qtdVendas)],
    ["Total de vendas", fmtBRL(totais.totalEntradas)],
    ["Gastos", fmtNum(totais.qtdGastos)],
    ["Total de gastos", fmtBRL(totais.totalSaidas)],
    [totais.lucro < 0 ? "Prejuízo" : "Lucro", fmtBRL(totais.lucro)],
    ["Margem", fmtPct(totais.margem)],
  ])

  doc.section("Vendas por forma de pagamento")
  doc.table(
    [
      { header: "Forma de pagamento", width: 200 },
      { header: "Vendas", width: 80, align: "right" },
      { header: "Valor", width: 120, align: "right" },
      { header: "%", width: 85, align: "right" },
    ],
    formaPagamento.map((r) => [
      r.chave,
      fmtNum(r.count),
      fmtBRL(r.valor),
      receita > 0 ? `${((r.valor / receita) * 100).toFixed(1)}%` : "-",
    ])
  )

  doc.section("Vendas por tipo")
  doc.table(
    [
      { header: "Tipo de venda", width: 260 },
      { header: "Vendas", width: 110, align: "right" },
      { header: "Valor", width: 145, align: "right" },
    ],
    tipoVenda.map((r) => [r.chave, fmtNum(r.count), fmtBRL(r.valor)])
  )

  doc.section("Gastos por categoria")
  doc.table(
    [
      { header: "Categoria", width: 320 },
      { header: "Valor", width: 195, align: "right" },
    ],
    categorias.map((c) => [c.categoria, fmtBRL(c.valor)])
  )

  doc.section("Movimento por período")
  doc.table(
    [
      { header: "Período", width: 160 },
      { header: "Vendas", width: 120, align: "right" },
      { header: "Gastos", width: 120, align: "right" },
      { header: "Resultado", width: 115, align: "right" },
    ],
    serie.map((p) => [
      p.label,
      fmtBRL(p.entradas),
      fmtBRL(p.saidas),
      fmtBRL(p.entradas - p.saidas),
    ])
  )

  doc.section(`Vendas (${vendas.length})`)
  doc.table(
    [
      { header: "Data", width: 58 },
      { header: "Cliente", width: 135 },
      { header: "Produto", width: 95 },
      { header: "Qtde", width: 38, align: "right" },
      { header: "Total", width: 62, align: "right" },
      { header: "Pgto", width: 70 },
      { header: "Origem", width: 57 },
    ],
    vendas.map((v) => [
      fmtDate(v.data),
      v.cliente ?? "-",
      v.produto,
      fmtNum(v.qtd),
      fmtBRL(v.valor_total),
      v.forma_pagamento ?? "-",
      v.origem === "crm" ? "CRM" : "Manual",
    ])
  )

  doc.section(`Gastos (${gastos.length})`)
  doc.table(
    [
      { header: "Data", width: 58 },
      { header: "Categoria", width: 110 },
      { header: "Descrição", width: 150 },
      { header: "Fornecedor", width: 105 },
      { header: "Valor", width: 92, align: "right" },
    ],
    gastos.map((g) => [
      fmtDate(g.data),
      g.categoria,
      g.descricao,
      g.fornecedor ?? "-",
      fmtBRL(g.valor),
    ])
  )

  doc.footer(
    `Gerado em ${fmtDate(new Date())} - Farofa da Rai - Controle financeiro`
  )
  return doc.save()
}
