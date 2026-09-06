import Link from "next/link"

import { getSaidas } from "@/lib/queries"
import { CATEGORIAS_GASTO } from "@/lib/constants"
import { fmtBRL, fmtDateBR } from "@/lib/format"
import { IconEdit, IconGastos } from "@/components/icons"
import { SearchBar } from "@/components/search-bar"
import { FilterChips } from "@/components/filter-chips"
import { DeleteButton } from "@/components/delete-button"
import { deleteGasto } from "./actions"

export const metadata = { title: "Gastos — Farofa da Rai" }

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const q = (typeof sp.q === "string" ? sp.q : "").trim().toLowerCase()
  const cat = typeof sp.categoria === "string" ? sp.categoria : "Todas"

  let list = await getSaidas()
  if (cat !== "Todas") list = list.filter((s) => s.categoria === cat)
  if (q)
    list = list.filter(
      (s) =>
        s.descricao.toLowerCase().includes(q) ||
        (s.fornecedor ?? "").toLowerCase().includes(q)
    )

  const total = list.reduce((s, g) => s + Number(g.valor), 0)

  return (
    <>
      <div className="page-head">
        <h2>Gastos</h2>
        <p>
          {list.length} {list.length === 1 ? "gasto" : "gastos"} · {fmtBRL(total)}
        </p>
      </div>

      <div className="list-toolbar">
        <Link className="btn sun" href="/gastos/novo">
          + Novo gasto
        </Link>
        <SearchBar placeholder="Buscar descrição ou fornecedor…" />
      </div>
      <FilterChips param="categoria" options={CATEGORIAS_GASTO} allLabel="Todas" />

      {list.length === 0 ? (
        <div className="list-empty">
          <IconGastos />
          <div>Nenhum gasto encontrado.</div>
        </div>
      ) : (
        <div className="list">
          {list.map((s) => (
            <div className="row-item" key={s.id}>
              <div className="row-main">
                <div className="row-title">
                  {s.descricao}
                  <span className="row-tag">{s.categoria}</span>
                </div>
                <div className="row-sub">
                  {fmtDateBR(s.data)}
                  {s.fornecedor ? ` · ${s.fornecedor}` : ""}
                  {s.forma_pagamento ? ` · ${s.forma_pagamento}` : ""}
                  {s.obs ? ` · ${s.obs}` : ""}
                </div>
              </div>
              <div className="row-right">
                <span className="row-val neg">{fmtBRL(s.valor)}</span>
                <span className="row-actions">
                  <Link href={`/gastos/${s.id}`} aria-label="Editar">
                    <IconEdit />
                  </Link>
                  <DeleteButton
                    id={s.id}
                    onDelete={deleteGasto}
                    message="Excluir este gasto?"
                  />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
