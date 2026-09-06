import { GastoForm } from "../gasto-form"

export const metadata = { title: "Novo gasto — Farofa da Rai" }

export default function NovoGastoPage() {
  return (
    <>
      <div className="page-head">
        <h2>Novo gasto</h2>
      </div>
      <GastoForm />
    </>
  )
}
