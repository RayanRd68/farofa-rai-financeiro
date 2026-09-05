"use client"

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="list-empty">
      <p style={{ fontWeight: 700, color: "var(--brown)" }}>
        Algo deu errado
      </p>
      <p className="muted" style={{ marginBottom: 16 }}>
        Tente de novo em alguns instantes.
      </p>
      <button className="btn" type="button" onClick={reset}>
        Recarregar
      </button>
    </div>
  )
}
