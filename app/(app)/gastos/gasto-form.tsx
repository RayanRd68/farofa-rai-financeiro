"use client"

import { useActionState } from "react"
import Link from "next/link"
import { useFormStatus } from "react-dom"

import { CATEGORIAS_GASTO, FORMAS_PAGAMENTO } from "@/lib/constants"
import { todayISO } from "@/lib/format"
import { initialFormState } from "@/lib/form"
import type { Saida } from "@/lib/types"
import { createGasto, updateGasto } from "./actions"

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Salvando…" : label}
    </button>
  )
}

export function GastoForm({ gasto }: { gasto?: Saida }) {
  const isEdit = Boolean(gasto)
  const [state, formAction] = useActionState(
    isEdit ? updateGasto : createGasto,
    initialFormState
  )
  const e = state.fieldErrors ?? {}

  return (
    <div className="form-card">
      <h3>{isEdit ? "Editar gasto" : "Novo gasto"}</h3>
      {state.formError && <div className="form-error">{state.formError}</div>}

      <form action={formAction}>
        {gasto && <input type="hidden" name="id" value={gasto.id} />}

        <div className="field-row">
          <div className="field">
            <label htmlFor="data">Data</label>
            <input
              id="data"
              name="data"
              type="date"
              defaultValue={gasto?.data ?? todayISO()}
              required
            />
            {e.data && <div className="err">{e.data[0]}</div>}
          </div>
          <div className="field">
            <label htmlFor="categoria">Categoria</label>
            <select
              id="categoria"
              name="categoria"
              defaultValue={gasto?.categoria ?? CATEGORIAS_GASTO[0]}
            >
              {CATEGORIAS_GASTO.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {e.categoria && <div className="err">{e.categoria[0]}</div>}
          </div>
        </div>

        <div className="field">
          <label htmlFor="descricao">Descrição</label>
          <input
            id="descricao"
            name="descricao"
            defaultValue={gasto?.descricao ?? ""}
            placeholder="Ex.: Farinha (4 kg)"
            required
          />
          {e.descricao && <div className="err">{e.descricao[0]}</div>}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="fornecedor">Fornecedor</label>
            <input
              id="fornecedor"
              name="fornecedor"
              defaultValue={gasto?.fornecedor ?? ""}
              placeholder="opcional"
            />
          </div>
          <div className="field">
            <label htmlFor="valor">Valor (R$)</label>
            <input
              id="valor"
              name="valor"
              type="number"
              min="0"
              step="0.01"
              defaultValue={gasto?.valor ?? ""}
              required
            />
            {e.valor && <div className="err">{e.valor[0]}</div>}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="forma_pagamento">Forma de pagamento</label>
            <select
              id="forma_pagamento"
              name="forma_pagamento"
              defaultValue={gasto?.forma_pagamento ?? ""}
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
              defaultValue={gasto?.obs ?? ""}
              placeholder="opcional"
            />
          </div>
        </div>

        <div className="form-actions">
          <Link className="btn ghost" href="/gastos">
            Cancelar
          </Link>
          <Submit label={isEdit ? "Salvar" : "Registrar gasto"} />
        </div>
      </form>
    </div>
  )
}
