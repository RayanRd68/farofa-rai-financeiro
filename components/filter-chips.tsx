"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function FilterChips({
  param,
  options,
  allLabel = "Todos",
}: {
  param: string
  options: readonly string[]
  allLabel?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()
  const current = params.get(param) ?? allLabel

  function pick(value: string) {
    const next = new URLSearchParams(params.toString())
    if (value === allLabel) next.delete(param)
    else next.set(param, value)
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="chip-row">
      {[allLabel, ...options].map((opt) => (
        <button
          key={opt}
          type="button"
          className={`chip${current === opt ? " active" : ""}`}
          onClick={() => pick(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
