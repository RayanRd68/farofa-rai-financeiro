"use client"

import { useState } from "react"

import { ProdutoCard } from "./produto-card"

export function AddProduto() {
  const [open, setOpen] = useState(false)
  if (open) return <ProdutoCard />
  return (
    <button className="btn block sun" type="button" onClick={() => setOpen(true)}>
      + Novo produto
    </button>
  )
}
