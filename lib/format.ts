/** Converte numeric (string do Supabase) ou number para number com segurança. */
export function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function fmtBRL(v: string | number | null | undefined): string {
  return BRL.format(toNumber(v))
}

/** `n` é uma razão (0..1). fmtPct(0.394) -> "39,4%". */
export function fmtPct(n: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number.isFinite(n as number) ? (n as number) : 0)
}

export function fmtNum(v: string | number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
    toNumber(v)
  )
}

/** "2026-06-08" -> "08/06/2026" */
export function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

/**
 * Normaliza data (string ISO completa, "yyyy-MM-dd" ou Date) para "dd/MM/yyyy".
 * `fmtDateBR` só lida com "yyyy-MM-dd"; este aceita timestamptz e Date.
 */
export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return ""
  if (v instanceof Date) {
    const p = (n: number) => String(n).padStart(2, "0")
    return `${p(v.getDate())}/${p(v.getMonth() + 1)}/${v.getFullYear()}`
  }
  return fmtDateBR(v.slice(0, 10))
}

export function todayISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
