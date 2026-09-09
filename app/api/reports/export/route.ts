import { NextResponse, type NextRequest } from "next/server"

import { getUser } from "@/lib/auth"
import { getFinanceReport } from "@/lib/reports/data"
import { buildFinanceReportPdf } from "@/lib/reports/pdf"
import { buildFinanceReportXlsx } from "@/lib/reports/xlsx"
import { reportExportQuerySchema } from "@/lib/validations"

export const runtime = "nodejs"

/**
 * Exportação do relatório do Resumo (vendas + gastos do período). GET para
 * baixar por link simples. Autentica sozinho (a rota está isenta do redirect
 * de login pelo `/api` em PUBLIC_PREFIXES) e responde JSON no erro.
 *
 *   /api/reports/export?format=xlsx|pdf&preset=este_mes
 *   /api/reports/export?format=pdf&from=2026-08-01&to=2026-08-31
 */
export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const parsed = reportExportQuerySchema.safeParse({
    format: sp.get("format"),
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    preset: sp.get("preset") ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { format, ...range } = parsed.data

  try {
    const data = await getFinanceReport(range)
    const base = `relatorio-financeiro_${data.periodoISO.de}_a_${data.periodoISO.ate}`

    if (format === "xlsx") {
      const body = await buildFinanceReportXlsx(data)
      return new NextResponse(body as unknown as BodyInit, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${base}.xlsx"`,
          "Content-Length": String(body.length),
          "Cache-Control": "no-store",
        },
      })
    }

    const bytes = await buildFinanceReportPdf(data)
    const body = Buffer.from(bytes)
    return new NextResponse(body as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${base}.pdf"`,
        "Content-Length": String(body.length),
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    console.error("[reports/export]", e)
    return NextResponse.json(
      { error: "Não foi possível gerar o relatório." },
      { status: 500 }
    )
  }
}
