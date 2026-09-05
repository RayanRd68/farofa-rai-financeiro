"use client"

import { useActionState, useMemo, useState } from "react"
import Link from "next/link"
import { useFormStatus } from "react-dom"

import { FORMAS_PAGAMENTO, TIPOS_VENDA } from "@/lib/constants"
import { fmtBRL, toNumber, todayISO } from "@/lib/format"
import { initialFormState } from "@/lib/form"
import type { Entrada, Produto } from "@/lib/types"
import { createVenda, updateVenda } from "./actions"

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Salvando…" : label}
    </button>
  )
}

export function VendaForm({
  produtos,
  venda,
}: {
  produtos: Produto[]
  venda?: Entrada
}) {
  const isEdit = Boolean(venda)
  const [state, formAction] = useActionState(
    isEdit ? updateVenda : createVenda,
    initialFormState
  )
  const e = state.fieldErrors ?? {}

  const nomes = produtos.map((p) => p.produto)
  const [produto, setProduto] = useState(
    venda?.produto ?? nomes[0] ?? "Farofa Tradicional"
  )
  const [tipo, setTipo] = useState<string>(venda?.tipo_venda ?? "Cliente Final")
  const [qtd, setQtd] = useState(venda ? String(venda.qtd) : "1")
  const [unit, setUnit] = useState(
    venda ? String(venda.valor_unitario) : ""
  )
  const [touchedUnit, setTouchedUnit] = useState(Boolean(venda))

  const precoSugerido = useMemo(() => {
    const p = produtos.find((x) => x.produto === produto)
    if (!p) return 0
    return tipo === "Fornecedor (Atacado)"
      ? toNumber(p.preco_revenda)
      : toNumber(p.preco_cliente_final)
  }, [produtos, produto, tipo])

  const unitVal = touchedUnit && unit !== "" ? toNumber(unit) : precoSugerido
  const total = toNumber(qtd) * unitVal

  return (
    <div className="form-card">
      <h3>{isEdit ? "Editar venda" : "Nova venda"}</h3>
      {state.formError && <div className="form-error">{state.formError}</div>}

      <form action={formAction}>
        {venda && <input type="hidden" name="id" value={venda.id} />}

        <div className="field-row">
          <div className="field">
            <label htmlFor="data">Data</label>
            <input
              id="data"
              name="data"
              type="date"
              defaultValue={venda?.data ?? todayISO()}
              required
            />
            {e.data && <div className="err">{e.data[0]}</div>}
          </div>
          <div className="field">
            <label htmlFor="cliente">Cliente</label>
            <input
              id="cliente"
              name="cliente"
              defaultValue={venda?.cliente ?? ""}
              placeholder="Nome do cliente"
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="produto">Produto</label>
            {nomes.length > 0 ? (
              <select
                id="produto"
                name="produto"
                value={produto}
                onChange={(ev) => setProduto(ev.target.value)}
              >
                {nomes.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="produto"
                name="produto"
                value={produto}
                onChange={(ev) => setProduto(ev.target.value)}
              />
            )}
            {e.produto && <div className="err">{e.produto[0]}</div>}
          </div>
          <div className="field">
            <label htmlFor="tipo_venda">Tipo de venda</label>
            <select
              id="tipo_venda"
              name="tipo_venda"
              value={tipo}
              onChange={(ev) => setTipo(ev.target.value)}
            >
              {TIPOS_VENDA.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="qtd">Quantidade</label>
            <input
              id="qtd"
              name="qtd"
              type="number"
              min="0"
              step="1"
              value={qtd}
              onChange={(ev) => setQtd(ev.target.value)}
              required
            />
            {e.qtd && <div className="err">{e.qtd[0]}</div>}
          </div>
          <div className="field">
            <label htmlFor="valor_unitario">Valor unitário (R$)</label>
            <input
              id="valor_unitario"
              name="valor_unitario"
              type="number"
              min="0"
              step="0.01"
              value={touchedUnit ? unit : String(precoSugerido)}
              onChange={(ev) => {
                setTouchedUnit(true)
                setUnit(ev.target.value)
              }}
            />
            {e.valor_unitario && (
              <div className="err">{e.valor_unitario[0]}</div>
            )}
          </div>
        </div>

        <div className="field readout">
          <label>Valor total</label>
          <input value={fmtBRL(total)} readOnly tabIndex={-1} />
          <input type="hidden" name="valor_total" value={total.toFixed(2)} />
          {e.valor_total && <div className="err">{e.valor_total[0]}</div>}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="forma_pagamento">Forma de pagamento</label>
            <select
              id="forma_pagamento"
              name="forma_pagamento"
              defaultValue={venda?.forma_pagamento ?? "PIX"}
            >
              <option value="">—</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="obs">Observações</label>
            <input
              id="obs"
              name="obs"
              defaultValue={venda?.obs ?? ""}
              placeholder="opcional"
            />
          </div>
        </div>

        <div className="form-actions">
          <Link className="btn ghost" href="/vendas">
            Cancelar
          </Link>
          <Submit label={isEdit ? "Salvar" : "Registrar venda"} />
        </div>
      </form>
    </div>
  )
}
