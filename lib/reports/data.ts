import "server-only"

import { getEntradas, getSaidas } from "@/lib/queries"
import { buildFinanceReport, type FinanceReportData } from "@/lib/reports/build"
import { resolveRange, type ReportRange } from "@/lib/reports/period"

/**
 * Relatório do período: resolve o intervalo, busca vendas e gastos da janela
 * (sob RLS — escopado por `user_id`) e monta os agregados. Usado pela página
 * Resumo e pela rota de exportação.
 */
export async function getFinanceReport(
  range: ReportRange
): Promise<FinanceReportData> {
  const resolved = resolveRange(range)
  const periodo = { from: resolved.from, to: resolved.to }
  const [entradas, saidas] = await Promise.all([
    getEntradas(periodo),
    getSaidas(periodo),
  ])
  return buildFinanceReport(entradas, saidas, resolved)
}
