import { getProdutos } from "@/lib/queries"
import { VendaForm } from "../venda-form"

export const metadata = { title: "Nova venda — Farofa da Rai" }

export default async function NovaVendaPage() {
  const produtos = await getProdutos()
  return (
    <>
      <div className="page-head">
        <h2>Nova venda</h2>
      </div>
      <VendaForm produtos={produtos} />
    </>
  )
}
