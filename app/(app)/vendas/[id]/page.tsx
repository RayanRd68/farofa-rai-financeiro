import { notFound } from "next/navigation"

import { getEntrada, getProdutos } from "@/lib/queries"
import { VendaForm } from "../venda-form"

export const metadata = { title: "Editar venda — Farofa da Rai" }

export default async function EditarVendaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [venda, produtos] = await Promise.all([getEntrada(id), getProdutos()])
  if (!venda) notFound()
  return <VendaForm produtos={produtos} venda={venda} />
}
