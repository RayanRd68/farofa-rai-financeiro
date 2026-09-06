import Link from "next/link"

import { signOut } from "@/app/auth/actions"
import { Nav } from "@/components/nav"
import { IconLogout } from "@/components/icons"

export function AppHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          Farofa <em>da</em> Rai
        </Link>
        <Nav />
        <form action={signOut}>
          <button className="header-btn" type="submit">
            <IconLogout />
            Sair
          </button>
        </form>
      </div>
    </header>
  )
}
