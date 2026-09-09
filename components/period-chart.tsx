import { fmtBRL } from "@/lib/format"
import type { PontoSerie } from "@/lib/reports/build"

/**
 * Barras Entradas x Saídas por ponto da série (dia ou mês). Rola na horizontal
 * quando o período tem muitos dias; centraliza quando são poucas colunas.
 */
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

  const max = Math.max(1, ...serie.map((p) => Math.max(p.entradas, p.saidas)))

  return (
    <div className="card">
      <div className="pchart">
        {serie.map((p) => (
          <div className="pcol" key={p.label}>
            <div className="pcol-bars">
              <div
                className="pbar in"
                style={{ height: `${Math.round((p.entradas / max) * 132)}px` }}
                title={`Entradas ${p.label}: ${fmtBRL(p.entradas)}`}
              />
              <div
                className="pbar out"
                style={{ height: `${Math.round((p.saidas / max) * 132)}px` }}
                title={`Saídas ${p.label}: ${fmtBRL(p.saidas)}`}
              />
            </div>
            <div className="pcol-label">{p.label}</div>
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
