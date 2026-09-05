"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"

import { fmtBRL, fmtPct, toNumber } from "@/lib/format"
import { initialFormState } from "@/lib/form"
import type { Produto } from "@/lib/types"
import { DeleteButton } from "@/components/delete-button"
import { createProduto, deleteProduto, updateProduto } from "./actions"

function Save() {
  const { pending } = useFormStatus()
  return (
    <button className="btn small" type="submit" disabled={pending}>
      {pending ? "Salvando…" : "Salvar"}
    </button>
  )
}

function Box({
  label,
  valor,
  bad,
}: {
  label: string
  valor: string
  bad?: boolean
}) {
  return (
    <div className="margin-box">
      <div className="l">{label}</div>
      <div className={`v${bad ? " bad" : ""}`}>{valor}</div>
    </div>
  )
}

export function ProdutoCard({ produto }: { produto?: Produto }) {
  const isEdit = Boolean(produto)
  const [state, formAction] = useActionState(
    isEdit ? updateProduto : createProduto,
    initialFormState
  )
  const e = state.fieldErrors ?? {}

  const [custo, setCusto] = useState(produto ? String(produto.custo_producao) : "")
  const [pcf, setPcf] = useState(
    produto ? String(produto.preco_cliente_final) : ""
  )
  const [prv, setPrv] = useState(produto ? String(produto.preco_revenda) : "")

  const c = toNumber(custo)
  const f = toNumber(pcf)
  const r = toNumber(prv)
  const lucroFinal = f - c
  const lucroRevenda = r - c

  return (
    <div className="product-card">
      <h3>{produto?.produto ?? "Novo produto"}</h3>
      {state.formError && <div className="form-error">{state.formError}</div>}

      <form action={formAction}>
        {produto && <input type="hidden" name="id" value={produto.id} />}

        <div className="field">
          <label htmlFor={`nome-${produto?.id ?? "novo"}`}>
            Nome do produto
          </label>
          <input
            id={`nome-${produto?.id ?? "novo"}`}
            name="produto"
            defaultValue={produto?.produto ?? ""}
            required
          />
          {e.produto && <div className="err">{e.produto[0]}</div>}
        </div>

        <div className="field-row">
          <div className="field">
            <label>Custo de produção (R$)</label>
            <input
              name="custo_producao"
              type="number"
              min="0"
              step="0.01"
              value={custo}
              onChange={(ev) => setCusto(ev.target.value)}
            />
            {e.custo_producao && (
              <div className="err">{e.custo_producao[0]}</div>
            )}
          </div>
          <div className="field">
            <label>Preço cliente final (R$)</label>
            <input
              name="preco_cliente_final"
              type="number"
              min="0"
              step="0.01"
              value={pcf}
              onChange={(ev) => setPcf(ev.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Preço revenda / atacado (R$)</label>
          <input
            name="preco_revenda"
            type="number"
            min="0"
            step="0.01"
            value={prv}
            onChange={(ev) => setPrv(ev.target.value)}
          />
        </div>

        <div className="margin-grid">
          <Box
            label="Lucro cliente final"
            valor={fmtBRL(lucroFinal)}
            bad={lucroFinal < 0}
          />
          <Box
            label="Margem final"
            valor={fmtPct(f > 0 ? lucroFinal / f : 0)}
            bad={lucroFinal < 0}
          />
        </div>
        <div className="margin-grid">
          <Box
            label="Lucro revenda"
            valor={fmtBRL(lucroRevenda)}
            bad={lucroRevenda < 0}
          />
          <Box
            label="Margem revenda"
            valor={fmtPct(r > 0 ? lucroRevenda / r : 0)}
            bad={lucroRevenda < 0}
          />
        </div>

        <div className="form-actions" style={{ alignItems: "center" }}>
          <Save />
          {state.ok && state.message && (
            <span className="muted">{state.message}</span>
          )}
          {produto && (
            <span style={{ marginLeft: "auto" }}>
              <DeleteButton
                id={produto.id}
                onDelete={deleteProduto}
                message="Remover este produto? As vendas já registradas continuam."
              />
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
