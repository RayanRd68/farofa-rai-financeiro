import { requireUser } from "@/lib/auth"
import { AppHeader } from "@/components/app-header"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireUser()
  return (
    <>
      <AppHeader />
      <main>{children}</main>
    </>
  )
}
