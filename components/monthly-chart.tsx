import { MESES } from "@/lib/constants"
import type { LinhaMensal } from "@/lib/finance"
import { fmtBRL } from "@/lib/format"

export function MonthlyChart({ rows }: { rows: LinhaMensal[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.entradas, r.saidas)))
  return (
    <>
      <div className="chart-scroll">
        <div className="chart">
          {rows.map((m, i) => (
            <div className="chart-col" key={i}>
              <div className="chart-bars">
                <div
                  className="bar in"
                  style={{ height: `${Math.round((m.entradas / max) * 118)}px` }}
                  title={`Entradas ${MESES[i]}: ${fmtBRL(m.entradas)}`}
                />
                <div
                  className="bar out"
                  style={{ height: `${Math.round((m.saidas / max) * 118)}px` }}
                  title={`Saídas ${MESES[i]}: ${fmtBRL(m.saidas)}`}
                />
              </div>
              <div className="m">{MESES[i]}</div>
            </div>
          ))}
        </div>
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
    </>
  )
}
