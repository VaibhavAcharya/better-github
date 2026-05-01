import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppShell } from '#/components/layout/shell'
import { AuthBanner } from '#/components/auth-banner'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <AppShell>
      <div className="px-4 pt-3">
        <AuthBanner />
      </div>
      <Outlet />
    </AppShell>
  )
}
