import {
  endOfMonth,
  format,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns"
import { ptBR } from "date-fns/locale"

import { todayISO } from "@/lib/format"

/**
 * Resolução de período do relatório do Resumo. Puro / testável.
 * Espelha `CRM/lib/reports/sales.ts#resolveRange` (ADR-023), adaptado pro
 * Controle Financeiro (presets em pt-BR, opção "Tudo").
 */

export const REPORT_PRESETS = [
  "tudo",
  "este_mes",
  "mes_passado",
  "30d",
  "90d",
  "este_ano",
] as const
export type ReportPreset = (typeof REPORT_PRESETS)[number]

export const PRESET_LABELS: Record<ReportPreset, string> = {
  tudo: "Tudo",
  este_mes: "Este mês",
  mes_passado: "Mês passado",
  "30d": "30 dias",
  "90d": "90 dias",
  este_ano: "Este ano",
}

export type ReportRange = {
  from?: string
  to?: string
  preset?: ReportPreset
}

export type ResolvedRange = {
  from: string
  to: string
  preset: ReportPreset | null
  label: string
}

const ymd = (d: Date) => format(d, "yyyy-MM-dd")
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Preset ou `from`/`to` explícitos -> datas concretas + rótulo pt-BR. */
export function resolveRange(range: ReportRange): ResolvedRange {
  const today = new Date()

  if (range.from && range.to) {
    const [from, to] =
      range.from <= range.to
        ? [range.from, range.to]
        : [range.to, range.from]
    return {
      from,
      to,
      preset: null,
      label: `${fmtBr(from)} a ${fmtBr(to)}`,
    }
  }

  const preset = range.preset ?? "tudo"
  switch (preset) {
    case "este_mes":
      return {
        from: ymd(startOfMonth(today)),
        to: todayISO(),
        preset,
        label: capitalize(format(today, "MMMM 'de' yyyy", { locale: ptBR })),
      }
    case "mes_passado": {
      const ref = subMonths(today, 1)
      return {
        from: ymd(startOfMonth(ref)),
        to: ymd(endOfMonth(ref)),
        preset,
        label: capitalize(format(ref, "MMMM 'de' yyyy", { locale: ptBR })),
      }
    }
    case "30d":
      return {
        from: ymd(subDays(today, 29)),
        to: todayISO(),
        preset,
        label: "Últimos 30 dias",
      }
    case "90d":
      return {
        from: ymd(subDays(today, 89)),
        to: todayISO(),
        preset,
        label: "Últimos 90 dias",
      }
    case "este_ano":
      return {
        from: ymd(startOfYear(today)),
        to: todayISO(),
        preset,
        label: `Ano de ${format(today, "yyyy")}`,
      }
    case "tudo":
    default:
      return {
        from: "2000-01-01",
        to: todayISO(),
        preset: "tudo",
        label: "Todo o período",
      }
  }
}

/** "2026-09-01" -> "01/09/2026" (sem depender de Date pra não pegar fuso). */
function fmtBr(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}
