"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { IconTrash } from "@/components/icons"
import type { FormState } from "@/lib/form"

export function DeleteButton({
  id,
  onDelete,
  message,
}: {
  id: string
  onDelete: (id: string) => Promise<FormState>
  message: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  function confirm() {
    start(async () => {
      await onDelete(id)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" aria-label="Excluir" onClick={() => setOpen(true)}>
        <IconTrash />
      </button>
      {open && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="modal-sheet">
            <h3>{message}</h3>
            <div className="form-actions">
              <button
                className="btn ghost"
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </button>
              <button
                className="btn"
                type="button"
                style={{ background: "var(--ink)" }}
                onClick={confirm}
                disabled={pending}
              >
                {pending ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
