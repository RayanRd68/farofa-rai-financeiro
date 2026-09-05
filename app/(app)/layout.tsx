import { requireUser } from "@/lib/auth"
import { AppHeader } from "@/components/app-header"
import { TabBar } from "@/components/tab-bar"

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
      <TabBar />
    </>
  )
}
