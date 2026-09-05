import Link from "next/link"

export default function NotFound() {
  return (
    <div className="list-empty">
      <p style={{ fontWeight: 700, color: "var(--brown)" }}>
        Página não encontrada
      </p>
      <Link className="btn" href="/" style={{ marginTop: 12 }}>
        Voltar ao início
      </Link>
    </div>
  )
}
