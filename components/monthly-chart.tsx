import { MESES } from "@/lib/constants"
import type { LinhaMensal } from "@/lib/finance"
import { fmtBRL } from "@/lib/format"

/** Só os meses com algum movimento (evita 12 colunas quase vazias). */
export function MonthlyChart({ rows }: { rows: LinhaMensal[] }) {
  const ativos = rows.filter((r) => r.entradas > 0 || r.saidas > 0)
  const show = ativos.length > 0 ? ativos : rows
  const max = Math.max(1, ...show.map((r) => Math.max(r.entradas, r.saidas)))

  return (
    <div className="card">
      <div className="chart">
        {show.map((m) => (
          <div className="chart-col" key={m.idx}>
            <div className="chart-bars">
              <div
                className="bar in"
                style={{ height: `${Math.round((m.entradas / max) * 132)}px` }}
                title={`Entradas ${MESES[m.idx]}: ${fmtBRL(m.entradas)}`}
              />
              <div
                className="bar out"
                style={{ height: `${Math.round((m.saidas / max) * 132)}px` }}
                title={`Saídas ${MESES[m.idx]}: ${fmtBRL(m.saidas)}`}
              />
            </div>
            <div className="m">{MESES[m.idx]}</div>
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
