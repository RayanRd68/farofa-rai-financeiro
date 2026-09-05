"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function SearchBar({ placeholder }: { placeholder: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get("q") ?? "")
  const [, startTransition] = useTransition()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (value.trim()) next.set("q", value.trim())
      else next.delete("q")
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false })
      })
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      className="search-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
    />
  )
}
