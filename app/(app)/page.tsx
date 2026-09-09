import Link from "next/link"

import { fmtBRL, fmtPct } from "@/lib/format"
import { getFinanceReport } from "@/lib/reports/data"
import { reportRangeSchema } from "@/lib/validations"
import { PeriodChart } from "@/components/period-chart"
import { ReportControls } from "@/components/report-controls"

export const metadata = { title: "Resumo — Farofa da Rai" }

function Breakdown({
  rows,
  emptyText,
}: {
  rows: { chave: string; count: number; valor: number }[]
  emptyText: string
}) {
  if (rows.length === 0) return <p className="muted">{emptyText}</p>
  const max = Math.max(1, ...rows.map((r) => r.valor))
  return (
    <>
      {rows.map((r) => (
        <div className="cat-row" key={r.chave}>
          <div className="top">
            <span>
              {r.chave}{" "}
              <span className="muted" style={{ fontSize: 11 }}>
                · {r.count} {r.count === 1 ? "venda" : "vendas"}
              </span>
            </span>
            <span className="v">{fmtBRL(r.valor)}</span>
          </div>
          <div className="cat-track">
            <div
              className="cat-fill"
              style={{ width: `${Math.round((r.valor / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </>
  )
}

export default async function ResumoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const parsed = reportRangeSchema.safeParse({
    from: typeof sp.from === "string" ? sp.from : undefined,
    to: typeof sp.to === "string" ? sp.to : undefined,
    preset: typeof sp.preset === "string" ? sp.preset : undefined,
  })

  const report = await getFinanceReport(parsed.success ? parsed.data : {})
  const { range, totais, categorias, formaPagamento, tipoVenda, topClientes, serie } =
    report
  const hasData = report.vendas.length > 0 || report.gastos.length > 0
  const isNeg = totais.lucro < 0
  const maxCat = Math.max(1, ...categorias.map((c) => c.valor))

  // Conta nova, sem nenhum lançamento: CTA em vez dos controles.
  if (!hasData && range.preset === "tudo") {
    return (
      <div className="list-empty">
        <p style={{ fontWeight: 700, fontSize: 16, color: "var(--brown)" }}>
          Ainda não há movimento
        </p>
        <p className="muted" style={{ margin: "6px 0 18px" }}>
          Registre sua primeira venda ou gasto para ver o resumo aqui.
        </p>
        <Link className="btn sun" href="/vendas/nova">
          + Registrar venda
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="page-head">
        <h2>Resumo</h2>
        <p>
          {range.label} · {totais.qtdVendas} vendas · {totais.qtdGastos} gastos
        </p>
      </div>

      <ReportControls preset={range.preset} from={range.from} to={range.to} />

      {!hasData ? (
        <div className="list-empty">
          <p style={{ fontWeight: 700, color: "var(--brown)" }}>
            Sem movimento nesse período
          </p>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Escolha outro período ou <Link href="/">veja tudo</Link>.
          </p>
        </div>
      ) : (
        <>
          <div className="resumo-top">
            <div className="stat-row">
              <div className="stat-card in">
                <div className="label">Entradas</div>
                <div className="value">{fmtBRL(totais.totalEntradas)}</div>
              </div>
              <div className="stat-card out">
                <div className="label">Saídas</div>
                <div className="value">{fmtBRL(totais.totalSaidas)}</div>
              </div>
            </div>
            <div className="stamp-wrap">
              <div className={`stamp${isNeg ? " neg" : ""}`}>
                <div className="k1">
                  {isNeg ? "Prejuízo" : "Lucro"} do período
                </div>
                <div className="k2">{fmtBRL(totais.lucro)}</div>
                <div className="k3">margem {fmtPct(totais.margem)}</div>
              </div>
            </div>
          </div>

          <div className="section-title">Movimento no período</div>
          <PeriodChart serie={serie} />

          <div className="resumo-cols" style={{ marginTop: 28 }}>
            <div>
              <div className="section-title">Gastos por categoria</div>
              <div className="card">
                {categorias.length > 0 ? (
                  categorias.map((c) => (
                    <div className="cat-row" key={c.categoria}>
                      <div className="top">
                        <span>{c.categoria}</span>
                        <span className="v">{fmtBRL(c.valor)}</span>
                      </div>
                      <div className="cat-track">
                        <div
                          className="cat-fill"
                          style={{
                            width: `${Math.round((c.valor / maxCat) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">Nenhum gasto no período.</p>
                )}
              </div>
            </div>

            <div>
              <div className="section-title">Clientes que mais compram</div>
              <div className="card">
                {topClientes.length > 0 ? (
                  topClientes.map((c, i) => (
                    <div className="client-item" key={c.cliente}>
                      <div>
                        <div className="client-name">
                          {i + 1}. {c.cliente}
                        </div>
                        <div className="client-sub">
                          {c.pedidos} {c.pedidos > 1 ? "pedidos" : "pedido"}
                        </div>
                      </div>
                      <div className="client-val">{fmtBRL(c.total)}</div>
                    </div>
                  ))
                ) : (
                  <p className="muted">Nenhuma venda no período.</p>
                )}
              </div>
            </div>
          </div>

          <div className="resumo-cols" style={{ marginTop: 28 }}>
            <div>
              <div className="section-title">Vendas por forma de pagamento</div>
              <div className="card">
                <Breakdown
                  rows={formaPagamento}
                  emptyText="Nenhuma venda no período."
                />
              </div>
            </div>
            <div>
              <div className="section-title">Vendas por tipo</div>
              <div className="card">
                <Breakdown
                  rows={tipoVenda}
                  emptyText="Nenhuma venda no período."
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
