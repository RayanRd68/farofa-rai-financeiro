import { getProdutos } from "@/lib/queries"
import { VendaForm } from "../venda-form"

export const metadata = { title: "Nova venda — Farofa da Rai" }

export default async function NovaVendaPage() {
  const produtos = await getProdutos()
  return <VendaForm produtos={produtos} />
}
