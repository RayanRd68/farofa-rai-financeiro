import { notFound } from "next/navigation"

import { getSaida } from "@/lib/queries"
import { GastoForm } from "../gasto-form"

export const metadata = { title: "Editar gasto — Farofa da Rai" }

export default async function EditarGastoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const gasto = await getSaida(id)
  if (!gasto) notFound()
  return <GastoForm gasto={gasto} />
}
