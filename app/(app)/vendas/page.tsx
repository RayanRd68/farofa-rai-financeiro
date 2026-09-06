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

  const total = list.reduce((s, v) => s + Number(v.valor_total), 0)

  return (
    <>
      <div className="page-head">
        <h2>Vendas</h2>
        <p>
          {list.length} {list.length === 1 ? "venda" : "vendas"} · {fmtBRL(total)}
        </p>
      </div>

      <div className="list-toolbar">
        <Link className="btn sun" href="/vendas/nova">
          + Nova venda
        </Link>
        <SearchBar placeholder="Buscar cliente ou produto…" />
      </div>
      <FilterChips param="tipo" options={TIPOS_VENDA} />

      {list.length === 0 ? (
        <div className="list-empty">
          <IconVendas />
          <div>Nenhuma venda encontrada.</div>
        </div>
      ) : (
        <div className="list">
          {list.map((v) => (
            <div className="row-item" key={v.id}>
              <div className="row-main">
                <div className="row-title">
                  {v.cliente || "Sem nome"}
                  <span className="row-tag">{v.tipo_venda}</span>
                  {v.origem === "crm" && (
                    <span
                      className="row-tag crm"
                      title="Importado do CRM (pedido entregue e pago)"
                    >
                      ↩ CRM
                    </span>
                  )}
                </div>
                <div className="row-sub">
                  {fmtDateBR(v.data)} · {v.produto} ×{v.qtd}
                  {v.forma_pagamento ? ` · ${v.forma_pagamento}` : ""}
                  {v.obs ? ` · ${v.obs}` : ""}
                </div>
              </div>
              <div className="row-right">
                <span className="row-val pos">{fmtBRL(v.valor_total)}</span>
                <span className="row-actions">
                  <Link href={`/vendas/${v.id}`} aria-label="Editar">
                    <IconEdit />
                  </Link>
                  <DeleteButton
                    id={v.id}
                    onDelete={deleteVenda}
                    message="Excluir esta venda?"
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
