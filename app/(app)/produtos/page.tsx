import { getProdutos } from "@/lib/queries"
import { ProdutoCard } from "./produto-card"
import { AddProduto } from "./add-produto"

export const metadata = { title: "Produtos — Farofa da Rai" }

export default async function ProdutosPage() {
  const produtos = await getProdutos()
  return (
    <>
      <div className="page-head">
        <h2>Produtos</h2>
        <p>Custo, preços e a margem de cada tipo de venda.</p>
      </div>
      {produtos.map((p) => (
        <ProdutoCard key={p.id} produto={p} />
      ))}
      <AddProduto />
    </>
  )
}
