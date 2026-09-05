import Link from "next/link"

import { getEntradas } from "@/lib/queries"
import { TIPOS_VENDA } from "@/lib/constants"
import { fmtBRL, fmtDateBR } from "@/lib/format"
import { IconEdit, IconVendas } from "@/components/icons"
import { SearchBar } from "@/components/search-bar"
import { FilterChips } from "@/components/filter-chips"
import { DeleteButton } from "@/components/delete-button"
import { deleteVenda } from "./actions"

export const metadata = { title: "Vendas — Farofa da Rai" }

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const q = (typeof sp.q === "string" ? sp.q : "").trim().toLowerCase()
  const tipo = typeof sp.tipo === "string" ? sp.tipo : "Todos"

  let list = await getEntradas()
  if (tipo !== "Todos") list = list.filter((e) => e.tipo_venda === tipo)
  if (q)
    list = list.filter(
      (e) =>
        (e.cliente ?? "").toLowerCase().includes(q) ||
        e.produto.toLowerCase().includes(q)
    )

  return (
    <>
      <Link className="btn block sun" href="/vendas/nova">
        + Nova venda
      </Link>

      <div className="toolbar" style={{ marginTop: 16 }}>
        <SearchBar placeholder="Buscar cliente ou produto…" />
      </div>
      <FilterChips param="tipo" options={TIPOS_VENDA} />

      {list.length === 0 ? (
        <div className="list-empty">
          <IconVendas />
          <div>Nenhuma venda encontrada.</div>
        </div>
      ) : (
        list.map((v) => (
          <div className="row-item" key={v.id}>
            <div className="row-main">
              <div className="row-title">{v.cliente || "Sem nome"}</div>
              <div className="row-sub">
                {fmtDateBR(v.data)} · {v.produto} ×{v.qtd}
                {v.forma_pagamento ? ` · ${v.forma_pagamento}` : ""}
              </div>
              <span className="row-tag">{v.tipo_venda}</span>
            </div>
            <div className="row-right">
              <div className="row-val pos">{fmtBRL(v.valor_total)}</div>
              <div className="row-actions">
                <Link href={`/vendas/${v.id}`} aria-label="Editar">
                  <IconEdit />
                </Link>
                <DeleteButton
                  id={v.id}
                  onDelete={deleteVenda}
                  message="Excluir esta venda?"
                />
              </div>
            </div>
          </div>
        ))
      )}
    </>
  )
}
