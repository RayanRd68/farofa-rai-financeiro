import { fmtBRL } from "@/lib/format"
import type { PontoSerie } from "@/lib/reports/build"

/** Barras Entradas x Saídas por ponto da série (dia ou mês). */
export function PeriodChart({ serie }: { serie: PontoSerie[] }) {
  if (serie.length === 0) {
    return (
      <div className="card">
        <p className="muted" style={{ textAlign: "center", padding: "24px 0" }}>
          Sem movimento no período.
        </p>
      </div>
    )
  }

  const max = Math.max(
    1,
    ...serie.map((p) => Math.max(p.entradas, p.saidas))
  )

  return (
    <div className="card">
      <div className="chart">
        {serie.map((p) => (
          <div className="chart-col" key={p.label}>
            <div className="chart-bars">
              <div
                className="bar in"
                style={{ height: `${Math.round((p.entradas / max) * 132)}px` }}
                title={`Entradas ${p.label}: ${fmtBRL(p.entradas)}`}
              />
              <div
                className="bar out"
                style={{ height: `${Math.round((p.saidas / max) * 132)}px` }}
                title={`Saídas ${p.label}: ${fmtBRL(p.saidas)}`}
              />
            </div>
            <div className="m">{p.label}</div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <div className="li">
          <span className="sw" style={{ background: "var(--terracotta)" }} />
          Entradas
        </div>
        <div className="li">
          <span className="sw" style={{ background: "var(--brown-soft)" }} />
          Saídas
        </div>
      </div>
    </div>
  )
}
