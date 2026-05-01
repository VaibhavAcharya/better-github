import * as React from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { CommandPalette, useCommandPalette } from '#/components/command-palette'
import { HelpDialog } from '#/components/help-dialog'
import { useHotkey } from '#/lib/hotkeys'
import { TooltipProvider } from '#/components/ui/tooltip'
import { Toaster } from '#/components/ui/sonner'

/**
 * Top-level layout for every authenticated app page. Owns:
 *  - sidebar + header chrome
 *  - command palette (Cmd+K) and help dialog (?)
 *  - global navigation hotkeys (g i / g n / g p / g s / g r)
 *  - refresh hotkey (r)
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const palette = useCommandPalette()
  const [helpOpen, setHelpOpen] = React.useState(false)
  const navigate = useNavigate()
  const router = useRouter()
  const qc = useQueryClient()

  useHotkey({
    combo: '?',
    description: 'Show shortcuts',
    group: 'Global',
    handler: () => setHelpOpen(true),
  })
  useHotkey({
    combo: 'shift+/',
    handler: () => setHelpOpen(true),
  })
  useHotkey({
    combo: 'r',
    description: 'Refresh',
    group: 'Global',
    handler: () => {
      void qc.refetchQueries({ type: 'active' })
    },
  })
  useHotkey({
    combo: 'g i',
    description: 'Go to inbox',
    group: 'Navigate',
    handler: () => navigate({ to: '/' }),
  })
  useHotkey({
    combo: 'g n',
    description: 'Go to notifications',
    group: 'Navigate',
    handler: () => navigate({ to: '/notifications' }),
  })
  useHotkey({
    combo: 'g p',
    description: 'Go to pulls',
    group: 'Navigate',
    handler: () => navigate({ to: '/pulls' }),
  })
  useHotkey({
    combo: 'g s',
    description: 'Go to issues',
    group: 'Navigate',
    handler: () => navigate({ to: '/issues' }),
  })
  useHotkey({
    combo: 'g r',
    description: 'Go to repos',
    group: 'Navigate',
    handler: () => navigate({ to: '/repos' }),
  })
  useHotkey({
    combo: 'g ,',
    description: 'Go to settings',
    group: 'Navigate',
    handler: () => navigate({ to: '/settings' }),
  })
  useHotkey({
    combo: 'u',
    description: 'Go up to list',
    group: 'Detail',
    handler: () => router.history.back(),
  })

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-svh w-full bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onOpenCommandPalette={() => palette.setOpen(true)} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <Toaster />
    </TooltipProvider>
  )
}
