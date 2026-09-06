import { describe, expect, it } from "vitest"

import { ingestVendaSchema } from "@/lib/validations"

const base = {
  origem_id: "1789736d-7841-479f-b3f9-feb8ad87a5a3",
  data: "2026-09-05",
  cliente: "Helen Araújo",
  produto: "Farofa Tradicional",
  tipo_venda: "Cliente Final",
  qtd: "2",
  valor_unitario: "14",
  valor_total: "28",
  forma_pagamento: "PIX",
  obs: "Pedido #0042 · CRM",
}

describe("ingestVendaSchema", () => {
  it("aceita um payload válido do CRM e normaliza os numéricos", () => {
    const r = ingestVendaSchema.parse(base)
    expect(r.valor_unitario).toBe("14.00")
    expect(r.valor_total).toBe("28.00")
    expect(r.qtd).toBe("2")
    expect(r.forma_pagamento).toBe("PIX")
  })

  it("aceita cliente e forma_pagamento nulos", () => {
    const r = ingestVendaSchema.parse({
      ...base,
      cliente: null,
      forma_pagamento: null,
      obs: null,
    })
    expect(r.cliente).toBeNull()
    expect(r.forma_pagamento).toBeNull()
    expect(r.obs).toBeNull()
  })

  it("aceita valores em vírgula", () => {
    const r = ingestVendaSchema.parse({
      ...base,
      valor_unitario: "12,5",
      valor_total: "25,00",
    })
    expect(r.valor_unitario).toBe("12.50")
    expect(r.valor_total).toBe("25.00")
  })

  it("rejeita origem_id que não é UUID", () => {
    expect(ingestVendaSchema.safeParse({ ...base, origem_id: "#0042" }).success).toBe(
      false
    )
  })

  it("rejeita data fora do formato ISO", () => {
    expect(
      ingestVendaSchema.safeParse({ ...base, data: "05/09/2026" }).success
    ).toBe(false)
  })

  it("rejeita tipo_venda desconhecido", () => {
    expect(
      ingestVendaSchema.safeParse({ ...base, tipo_venda: "Atacado" }).success
    ).toBe(false)
  })

  it("rejeita forma_pagamento fora da lista", () => {
    expect(
      ingestVendaSchema.safeParse({ ...base, forma_pagamento: "Boleto" }).success
    ).toBe(false)
  })

  it("rejeita quantidade zero", () => {
    expect(ingestVendaSchema.safeParse({ ...base, qtd: "0" }).success).toBe(false)
  })
})
