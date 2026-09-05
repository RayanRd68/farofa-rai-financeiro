import { signOut } from "@/app/auth/actions"
import { APP_SUBTITLE } from "@/lib/constants"
import { IconLogout } from "@/components/icons"

export function AppHeader() {
  return (
    <header className="app-header">
      <form action={signOut}>
        <button
          className="header-btn"
          title="Sair"
          aria-label="Sair"
          type="submit"
        >
          <IconLogout width={17} height={17} />
        </button>
      </form>
      <h1 className="brand">
        Farofa <em>da</em> Rai
      </h1>
      <p className="tagline">{APP_SUBTITLE}</p>
    </header>
  )
}
