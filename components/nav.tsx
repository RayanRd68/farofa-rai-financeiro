"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const LINKS = [
  { href: "/", label: "Resumo" },
  { href: "/vendas", label: "Vendas" },
  { href: "/gastos", label: "Gastos" },
  { href: "/produtos", label: "Produtos" },
] as const

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="site-nav">
      {LINKS.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
