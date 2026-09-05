import Link from "next/link"

import { getEntradas, getSaidas } from "@/lib/queries"
import {
  anosPresentes,
  computeCategorias,
  computeMensal,
  computeTopClientes,
  computeTotais,
} from "@/lib/finance"
import { fmtBRL, fmtPct } from "@/lib/format"
import { MonthlyChart } from "@/components/monthly-chart"

export const metadata = { title: "Resumo — Farofa da Rai" }

export default async function ResumoPage() {
  const [entradas, saidas] = await Promise.all([getEntradas(), getSaidas()])

  if (entradas.length === 0 && saidas.length === 0) {
    return (
      <div className="list-empty">
        <p style={{ fontWeight: 700, fontSize: 15, color: "var(--brown)" }}>
          Ainda não há movimento
        </p>
        <p className="muted" style={{ marginBottom: 16 }}>
          Registre sua primeira venda ou gasto para ver o resumo aqui.
        </p>
        <Link className="btn sun" href="/vendas/nova">
          + Registrar venda
        </Link>
      </div>
    )
  }

  const { totalEntradas, totalSaidas, lucro, margem } = computeTotais(
    entradas,
    saidas
  )
  const mensal = computeMensal(entradas, saidas)
  const cats = computeCategorias(saidas)
  const clientes = computeTopClientes(entradas)
  const anos = anosPresentes(entradas, saidas)
  const isNeg = lucro < 0
  const maxCat = Math.max(1, ...cats.map((c) => c.valor))

  return (
    <>
      <div className="stat-row">
        <div className="stat-card in">
          <div className="label">
            Entradas{anos.length ? ` · ${anos.join("–")}` : ""}
          </div>
          <div className="value">{fmtBRL(totalEntradas)}</div>
        </div>
        <div className="stat-card out">
          <div className="label">Saídas</div>
          <div className="value">{fmtBRL(totalSaidas)}</div>
        </div>
      </div>

      <div className="stamp-wrap">
        <div className={`stamp${isNeg ? " neg" : ""}`}>
          <div className="k1">{isNeg ? "Prejuízo" : "Lucro"} do período</div>
          <div className="k2">{fmtBRL(lucro)}</div>
          <div className="k3">margem {fmtPct(margem)}</div>
        </div>
      </div>

      <div className="section-title">Movimento mensal</div>
      <MonthlyChart rows={mensal} />

      <div className="section-title">Gastos por categoria</div>
      {cats.length > 0 ? (
        cats.map((c) => (
          <div className="cat-row" key={c.categoria}>
            <div className="top">
              <span>{c.categoria}</span>
              <span className="v">{fmtBRL(c.valor)}</span>
            </div>
            <div className="cat-track">
              <div
                className="cat-fill"
                style={{ width: `${Math.round((c.valor / maxCat) * 100)}%` }}
              />
            </div>
          </div>
        ))
      ) : (
        <p className="muted">Nenhum gasto registrado ainda.</p>
      )}

      <div className="section-title">Clientes que mais compram</div>
      {clientes.length > 0 ? (
        clientes.map((c, i) => (
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
        <p className="muted">Nenhuma venda registrada ainda.</p>
      )}
    </>
  )
}
