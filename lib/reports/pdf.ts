import "server-only"

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib"

import { fmtBRL, fmtDate, fmtDateBR, fmtNum, fmtPct } from "@/lib/format"
import type { FinanceReportData } from "@/lib/reports/build"

/**
 * PDF do "Relatório financeiro" da Farofa da Rai. Documento paginado, capa +
 * 7 seções, feito só com `pdf-lib` (JS puro). A sanitização WinAnsi (`wa`) e a
 * classe `Doc` são portadas de `CRM/lib/reports/pdf.ts` (ADR-023) e ampliadas
 * aqui (capa, cards de destaque, subtotais, gráfico de barras).
 */

const PAGE = { w: 595.28, h: 841.89 }
const MARGIN = 40
const CONTENT_W = PAGE.w - MARGIN * 2

const INK = rgb(0.14, 0.12, 0.1)
const MUTED = rgb(0.42, 0.4, 0.36)
const LINE = rgb(0.83, 0.81, 0.77)
const HEAD_BG = rgb(0.97, 0.94, 0.86)
const CARD_BG = rgb(0.98, 0.96, 0.9)
const TERRACOTTA = rgb(0.757, 0.314, 0.18)
const BROWN_SOFT = rgb(0.663, 0.514, 0.353)
const NEG = rgb(0.7, 0.16, 0.12)

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
type KV = [label: string, value: string, neg?: boolean]

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

  private ensure(space: number) {
    if (this.y - space < MARGIN + 24) this.newPage()
  }

  private text(
    s: string,
    x: number,
    y: number,
    size: number,
    font = this.font,
    color = INK
  ) {
    this.page.drawText(wa(s), { x, y, size, font, color })
  }

  private textRight(
    s: string,
    xRight: number,
    y: number,
    size: number,
    font = this.font,
    color = INK
  ) {
    const t = wa(s)
    this.text(t, xRight - font.widthOfTextAtSize(t, size), y, size, font, color)
  }

  private textCenter(
    s: string,
    cx: number,
    y: number,
    size: number,
    font = this.font,
    color = INK
  ) {
    const t = wa(s)
    this.text(t, cx - font.widthOfTextAtSize(t, size) / 2, y, size, font, color)
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

  gap(h = 10) {
    this.y -= h
  }

  /** Página de rosto: identidade + período analisado + data de geração. */
  cover(org: string, titulo: string, periodo: string, geradoEm: string) {
    const cx = PAGE.w / 2
    this.textCenter(org.toUpperCase(), cx, PAGE.h - 250, 30, this.bold, INK)
    this.textCenter(titulo, cx, PAGE.h - 280, 14, this.font, MUTED)
    this.page.drawLine({
      start: { x: cx - 70, y: PAGE.h - 300 },
      end: { x: cx + 70, y: PAGE.h - 300 },
      thickness: 2,
      color: TERRACOTTA,
    })

    const boxW = 320
    const boxH = 110
    const boxX = cx - boxW / 2
    const boxY = PAGE.h - 300 - 60 - boxH
    this.page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxW,
      height: boxH,
      color: CARD_BG,
      borderColor: LINE,
      borderWidth: 1,
    })
    this.textCenter("PERÍODO ANALISADO", cx, boxY + boxH - 26, 9, this.bold, MUTED)
    this.textCenter(periodo, cx, boxY + boxH - 50, 14, this.bold, INK)
    this.textCenter("Data de geração", cx, boxY + 34, 9, this.font, MUTED)
    this.textCenter(geradoEm, cx, boxY + 16, 11, this.bold, INK)

    this.newPage()
  }

  /** Título de seção (evita órfão no rodapé da página). */
  h1(t: string) {
    this.ensure(80)
    this.gap(14)
    this.text(t, MARGIN, this.y - 13, 13, this.bold, INK)
    this.page.drawLine({
      start: { x: MARGIN, y: this.y - 19 },
      end: { x: PAGE.w - MARGIN, y: this.y - 19 },
      thickness: 0.75,
      color: LINE,
    })
    this.y -= 30
  }

  h2(t: string) {
    this.ensure(28)
    this.text(t, MARGIN, this.y - 11, 9.5, this.bold, MUTED)
    this.y -= 16
  }

  /** Parágrafo de aviso (período sem dados). */
  aviso(t: string) {
    this.ensure(30)
    this.gap(6)
    this.textCenter(t, PAGE.w / 2, this.y - 12, 10, this.font, MUTED)
    this.y -= 24
  }

  /** 4 cards de destaque (Entradas / Saídas / Lucro / Margem). */
  destaques(cells: { label: string; value: string; neg?: boolean }[]) {
    const gap = 10
    const w = (CONTENT_W - gap) / 2
    const h = 46
    this.ensure(h * 2 + gap + 10)
    cells.forEach((c, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = MARGIN + col * (w + gap)
      const top = this.y - row * (h + gap)
      this.page.drawRectangle({
        x,
        y: top - h,
        width: w,
        height: h,
        color: CARD_BG,
        borderColor: LINE,
        borderWidth: 1,
      })
      this.text(c.label.toUpperCase(), x + 12, top - 17, 8, this.bold, MUTED)
      this.text(c.value, x + 12, top - 36, 15, this.bold, c.neg ? NEG : INK)
    })
    const rows = Math.ceil(cells.length / 2)
    this.y -= rows * h + (rows - 1) * gap + 10
  }

  /** Pares rótulo → valor. `strong` deixa tudo em negrito com filete em cima. */
  linhasChave(rows: KV[], opts: { strong?: boolean; labelW?: number } = {}) {
    const size = 9.5
    const labelW = opts.labelW ?? 170
    if (opts.strong) {
      this.gap(4)
      this.page.drawLine({
        start: { x: MARGIN, y: this.y + 2 },
        end: { x: PAGE.w - MARGIN, y: this.y + 2 },
        thickness: 0.75,
        color: LINE,
      })
      this.gap(4)
    }
    for (const [k, v, neg] of rows) {
      this.ensure(16)
      this.text(k, MARGIN, this.y - 10, size, opts.strong ? this.bold : this.font, MUTED)
      this.text(
        v,
        MARGIN + labelW,
        this.y - 10,
        size,
        this.bold,
        neg ? NEG : INK
      )
      this.y -= 14
    }
  }

  /** Tabela paginada: repete o cabeçalho e nunca corta uma linha ao meio. */
  tabela(
    cols: Col[],
    rows: string[][],
    opts: { emptyText?: string; foot?: string[] } = {}
  ) {
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
      this.ensure(rowH * 2)
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
        this.text(
          label,
          c.align === "right" ? xs[i] + c.width - 4 - w : xs[i] + 3,
          this.y - rowH + 8,
          size,
          this.bold,
          INK
        )
      })
      this.y -= rowH
    }

    drawHeader()

    if (rows.length === 0) {
      this.ensure(rowH)
      this.text(
        opts.emptyText ?? "Sem lançamentos no período.",
        MARGIN + 3,
        this.y - 10,
        size,
        this.font,
        MUTED
      )
      this.y -= rowH
      return
    }

    const drawRow = (r: string[], strong = false) => {
      if (this.y - rowH < MARGIN + 24) {
        this.newPage()
        drawHeader()
      }
      const f = strong ? this.bold : this.font
      if (strong) {
        this.page.drawRectangle({
          x: MARGIN,
          y: this.y - rowH + 3,
          width: totalW,
          height: rowH,
          color: HEAD_BG,
        })
      }
      cols.forEach((c, i) => {
        const val = this.clip(r[i] ?? "", size, c.width - 6, f)
        const w = f.widthOfTextAtSize(val, size)
        this.text(
          val,
          c.align === "right" ? xs[i] + c.width - 4 - w : xs[i] + 3,
          this.y - 10,
          size,
          f,
          INK
        )
      })
      if (!strong) {
        this.page.drawLine({
          start: { x: MARGIN, y: this.y - rowH + 2 },
          end: { x: MARGIN + totalW, y: this.y - rowH + 2 },
          thickness: 0.5,
          color: LINE,
        })
      }
      this.y -= rowH
    }

    rows.forEach((r) => drawRow(r))
    if (opts.foot) drawRow(opts.foot, true)
  }

  /** Gráfico de barras agrupadas: Vendas x Gastos por ponto da série. */
  grafico(
    pontos: { label: string; entradas: number; saidas: number }[],
    unidade: string
  ) {
    if (pontos.length === 0) return
    const H = 120
    this.ensure(H + 58)
    this.gap(12)
    const max = Math.max(1, ...pontos.flatMap((p) => [p.entradas, p.saidas]))
    this.text(
      `Vendas x gastos por ${unidade} — pico ${fmtBRL(max)}`,
      MARGIN,
      this.y - 9,
      7.5,
      this.font,
      MUTED
    )
    this.y -= 15
    const top = this.y
    const base = top - H
    this.page.drawLine({
      start: { x: MARGIN, y: base },
      end: { x: PAGE.w - MARGIN, y: base },
      thickness: 0.75,
      color: LINE,
    })

    const slot = CONTENT_W / pontos.length
    const barW = Math.max(2, Math.min(9, slot * 0.34))
    const labelStep = Math.ceil(pontos.length / 13)
    pontos.forEach((p, i) => {
      const cx = MARGIN + slot * i + slot / 2
      const hv = (p.entradas / max) * (H - 6)
      const hg = (p.saidas / max) * (H - 6)
      this.page.drawRectangle({
        x: cx - barW - 0.5,
        y: base,
        width: barW,
        height: hv,
        color: TERRACOTTA,
      })
      this.page.drawRectangle({
        x: cx + 0.5,
        y: base,
        width: barW,
        height: hg,
        color: BROWN_SOFT,
      })
      if (i % labelStep === 0) {
        this.textCenter(p.label, cx, base - 10, 6.5, this.font, MUTED)
      }
    })

    this.y = base - 24
    const lx = MARGIN
    this.page.drawRectangle({ x: lx, y: this.y - 1, width: 8, height: 8, color: TERRACOTTA })
    this.text("Vendas / entradas", lx + 12, this.y, 8, this.font, INK)
    this.page.drawRectangle({ x: lx + 130, y: this.y - 1, width: 8, height: 8, color: BROWN_SOFT })
    this.text("Gastos / saídas", lx + 142, this.y, 8, this.font, INK)
    this.y -= 20
  }

  /** Rodapé em todas as páginas: identidade + data + paginação. */
  footer(esquerda: string, geradoEm: string) {
    const pages = this.pdf.getPages()
    pages.forEach((p, i) => {
      p.drawText(wa(esquerda), {
        x: MARGIN,
        y: MARGIN - 16,
        size: 7.5,
        font: this.font,
        color: MUTED,
      })
      const mid = wa(`Gerado em ${geradoEm}`)
      p.drawText(mid, {
        x: PAGE.w / 2 - this.font.widthOfTextAtSize(mid, 7.5) / 2,
        y: MARGIN - 16,
        size: 7.5,
        font: this.font,
        color: MUTED,
      })
      const pg = wa(`Página ${i + 1} de ${pages.length}`)
      p.drawText(pg, {
        x: PAGE.w - MARGIN - this.font.widthOfTextAtSize(pg, 7.5),
        y: MARGIN - 16,
        size: 7.5,
        font: this.font,
        color: MUTED,
      })
    })
  }

  save() {
    return this.pdf.save()
  }
}

const pct = (v: number, total: number) => (total > 0 ? v / total : 0)

/** Encurta formas de pagamento longas pra caber nas colunas estreitas. */
const abrevPgto = (s: string | null): string =>
  s == null || s === ""
    ? "-"
    : s
        .replace("Cartão de Crédito", "Cartão créd.")
        .replace("Boleto/Transferência", "Boleto/transf.")

export async function buildFinanceReportPdf(
  data: FinanceReportData
): Promise<Uint8Array> {
  const { totais, categorias, serie, serieUnidade, vendas, gastos, periodo } = data
  const receita = totais.totalEntradas
  const prejuizo = totais.lucro < 0

  const pdf = await PDFDocument.create()
  pdf.setTitle(`Relatório financeiro — ${data.cabecalho}`)
  pdf.setAuthor("Farofa da Rai")
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const doc = new Doc(pdf, font, bold)

  // 1. Capa / cabeçalho
  doc.cover(
    "Farofa da Rai",
    "Relatório Financeiro",
    `${periodo.de} até ${periodo.ate}`,
    fmtDateBR(data.geradoEm)
  )

  // 2. Resumo financeiro
  doc.h1("Resumo financeiro")
  doc.destaques([
    { label: "Entradas", value: fmtBRL(totais.totalEntradas) },
    { label: "Saídas", value: fmtBRL(totais.totalSaidas) },
    {
      label: prejuizo ? "Prejuízo do período" : "Lucro do período",
      value: fmtBRL(totais.lucro),
      neg: prejuizo,
    },
    { label: "Margem", value: fmtPct(totais.margem), neg: prejuizo },
  ])
  doc.linhasChave([
    ["Total de vendas", fmtBRL(totais.totalEntradas)],
    ["Quantidade de vendas", fmtNum(totais.qtdVendas)],
    ["Ticket médio", fmtBRL(totais.ticketMedio)],
    ["Total de gastos", fmtBRL(totais.totalSaidas)],
    ["Quantidade de gastos", fmtNum(totais.qtdGastos)],
  ])

  if (!data.temMovimento) {
    doc.aviso("Nenhuma movimentação encontrada no período selecionado.")
    doc.h1("Resultado financeiro")
    doc.linhasChave(
      [
        ["Total de entradas", fmtBRL(0)],
        ["Total de saídas", fmtBRL(0)],
        ["Lucro do período", fmtBRL(0)],
        ["Margem de lucro", fmtPct(0)],
      ],
      { strong: true }
    )
    doc.footer("Farofa da Rai · Relatório financeiro", fmtDateBR(data.geradoEm))
    return doc.save()
  }

  // 3. Vendas do período
  doc.h1(`Vendas do período (${totais.qtdVendas})`)
  doc.tabela(
    [
      { header: "Data", width: 52 },
      { header: "Cliente", width: 116 },
      { header: "Produto", width: 92 },
      { header: "Qtd", width: 28, align: "right" },
      { header: "Vlr. unit.", width: 56, align: "right" },
      { header: "Total", width: 60, align: "right" },
      { header: "Forma pgto.", width: 80 },
    ],
    vendas.map((v) => [
      fmtDate(v.data),
      v.cliente ?? "-",
      v.produto,
      fmtNum(v.qtd),
      fmtBRL(v.valor_unitario),
      fmtBRL(v.valor_total),
      v.forma_pagamento ? abrevPgto(v.forma_pagamento) : "Não informado",
    ]),
    { emptyText: "Nenhuma venda no período." }
  )
  doc.linhasChave(
    [
      ["Total vendido", fmtBRL(totais.totalEntradas)],
      ["Quantidade de vendas", fmtNum(totais.qtdVendas)],
      ["Ticket médio", fmtBRL(totais.ticketMedio)],
    ],
    { strong: true }
  )

  // 4. Gastos do período
  doc.h1(`Gastos do período (${totais.qtdGastos})`)
  doc.tabela(
    [
      { header: "Data", width: 52 },
      { header: "Descrição", width: 120 },
      { header: "Categoria", width: 104 },
      { header: "Fornecedor", width: 84 },
      { header: "Pgto.", width: 68 },
      { header: "Valor", width: 67, align: "right" },
    ],
    gastos.map((g) => [
      fmtDate(g.data),
      g.descricao,
      g.categoria,
      g.fornecedor ?? "-",
      abrevPgto(g.forma_pagamento),
      fmtBRL(g.valor),
    ]),
    { emptyText: "Nenhum gasto no período." }
  )
  doc.linhasChave(
    [
      ["Total de gastos", fmtBRL(totais.totalSaidas)],
      ["Quantidade de gastos", fmtNum(totais.qtdGastos)],
    ],
    { strong: true }
  )

  // 5. Gastos por categoria
  doc.h1("Gastos por categoria")
  doc.tabela(
    [
      { header: "Categoria", width: 220 },
      { header: "Qtde", width: 90, align: "right" },
      { header: "Valor", width: 110, align: "right" },
      { header: "% do total", width: 95, align: "right" },
    ],
    categorias.map((c) => [
      c.categoria,
      fmtNum(c.count),
      fmtBRL(c.valor),
      fmtPct(pct(c.valor, totais.totalSaidas)),
    ]),
    {
      emptyText: "Nenhum gasto no período.",
      foot: categorias.length
        ? [
            "TOTAL",
            fmtNum(totais.qtdGastos),
            fmtBRL(totais.totalSaidas),
            fmtPct(totais.totalSaidas > 0 ? 1 : 0),
          ]
        : undefined,
    }
  )

  // 6. Análise de vendas x gastos
  doc.h1("Análise de vendas x gastos")
  doc.tabela(
    [
      { header: "Período", width: 150 },
      { header: "Vendas", width: 125, align: "right" },
      { header: "Gastos", width: 120, align: "right" },
      { header: "Resultado", width: 120, align: "right" },
    ],
    serie.map((p) => [
      p.label,
      fmtBRL(p.entradas),
      fmtBRL(p.saidas),
      fmtBRL(p.entradas - p.saidas),
    ]),
    {
      emptyText: "Sem movimento no período.",
      foot: serie.length
        ? [
            "TOTAL",
            fmtBRL(totais.totalEntradas),
            fmtBRL(totais.totalSaidas),
            fmtBRL(totais.lucro),
          ]
        : undefined,
    }
  )
  doc.gap(6)
  doc.grafico(serie, serieUnidade)

  // 7. Resultado financeiro
  doc.h1("Resultado financeiro")
  doc.linhasChave(
    [
      ["Total de entradas", fmtBRL(totais.totalEntradas)],
      ["Total de saídas", fmtBRL(totais.totalSaidas)],
      [
        prejuizo ? "Prejuízo do período" : "Lucro do período",
        fmtBRL(totais.lucro),
        prejuizo,
      ],
      ["Margem de lucro", fmtPct(totais.margem), prejuizo],
    ],
    { strong: true }
  )
  doc.gap(4)
  doc.linhasChave([
    ["Fórmula", "Lucro = Entradas - Saídas"],
    ["", `Margem = ${receita > 0 ? "(Lucro / Entradas) x 100" : "0% (sem entradas)"}`],
  ])

  doc.footer("Farofa da Rai · Relatório financeiro", fmtDateBR(data.geradoEm))
  return doc.save()
}
