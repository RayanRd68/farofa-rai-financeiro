"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  IconGastos,
  IconProdutos,
  IconResumo,
  IconVendas,
} from "@/components/icons"

const TABS = [
  { href: "/", label: "Resumo", Icon: IconResumo },
  { href: "/vendas", label: "Vendas", Icon: IconVendas },
  { href: "/gastos", label: "Gastos", Icon: IconGastos },
  { href: "/produtos", label: "Produtos", Icon: IconProdutos },
] as const

export function TabBar() {
  const pathname = usePathname()
  return (
    <nav className="tabbar">
      {TABS.map(({ href, label, Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`tab${active ? " active" : ""}`}
          >
            <Icon />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
