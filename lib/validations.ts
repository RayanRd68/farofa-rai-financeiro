import { z } from "zod"

import { CATEGORIAS_GASTO, FORMAS_PAGAMENTO, TIPOS_VENDA } from "@/lib/constants"

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")

/** "12,5" ou "12.5" -> "12.50" (string p/ numeric). Aceita >= min. */
function money(min = 0, field = "Valor") {
  return z.preprocess(
    (v) => {
      if (v === "" || v == null) return v
      const n = Number(String(v).replace(",", "."))
      return Number.isFinite(n) ? n.toFixed(2) : v
    },
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, `${field} inválido.`)
      .refine((s) => Number(s) >= min, `${field} deve ser ${min === 0 ? "≥ 0" : `maior que ${min}`}.`)
  )
}

function qty() {
  return z.preprocess(
    (v) => {
      if (v === "" || v == null) return v
      const n = Number(String(v).replace(",", "."))
      return Number.isFinite(n) ? String(n) : v
    },
    z.string().regex(/^\d+(\.\d{1,3})?$/, "Quantidade inválida.").refine((s) => Number(s) > 0, "Quantidade deve ser maior que zero.")
  )
}

const nullableText = (max: number) =>
  z.preprocess(
    (v) =>
      (typeof v === "string" && v.trim() === "") || v == null ? null : v,
    z.string().trim().max(max).nullable()
  )

const formaPagamento = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.enum(FORMAS_PAGAMENTO).nullable()
)

export const vendaSchema = z.object({
  data: dataISO,
  cliente: nullableText(120),
  produto: z.string().trim().min(1, "Informe o produto.").max(120),
  tipo_venda: z.enum(TIPOS_VENDA),
  qtd: qty(),
  valor_unitario: money(0, "Valor unitário"),
  valor_total: money(0, "Valor total"),
  forma_pagamento: formaPagamento,
  obs: nullableText(300),
})
export type VendaInput = z.infer<typeof vendaSchema>

export const gastoSchema = z.object({
  data: dataISO,
  categoria: z.enum(CATEGORIAS_GASTO, { message: "Selecione uma categoria." }),
  descricao: z.string().trim().min(1, "Descreva o gasto.").max(200),
  fornecedor: nullableText(120),
  valor: money(0.01, "Valor"),
  forma_pagamento: formaPagamento,
  obs: nullableText(300),
})
export type GastoInput = z.infer<typeof gastoSchema>

export const produtoSchema = z.object({
  produto: z.string().trim().min(1, "Informe o nome.").max(120),
  custo_producao: money(0, "Custo"),
  preco_cliente_final: money(0, "Preço cliente final"),
  preco_revenda: money(0, "Preço revenda"),
})
export type ProdutoInput = z.infer<typeof produtoSchema>

export const idSchema = z.object({ id: z.string().uuid() })
