import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { HotkeyProvider } from '#/lib/hotkeys'
import { SettingsProvider } from '#/lib/settings'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  notFoundComponent: NotFound,
  errorComponent: RootError,
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'better-github',
      },
      {
        name: 'description',
        content:
          'An opinionated, local-first GitHub dashboard, powered by your gh CLI.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/logo.png',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
      <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
        404 — not found
      </p>
      <h1 className="text-xl font-medium">we couldn't find that page</h1>
      <p className="max-w-md text-xs text-muted-foreground">
        The URL might be wrong, or the resource may have been moved or hidden by
        its owner.
      </p>
      <a
        href="/"
        className="inline-flex h-8 items-center border border-border px-3 text-xs hover:bg-muted"
      >
        back to inbox
      </a>
    </div>
  )
}

function RootError({ error }: { error: Error }) {
  const message =
    error instanceof Error
      ? (error.message ?? 'unknown error')
      : 'unexpected error'
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background p-6 text-center text-foreground">
      <p className="font-mono text-xs tracking-wider text-destructive uppercase">
        crashed
      </p>
      <h1 className="text-lg font-medium">
        something broke while rendering this page
      </h1>
      <pre className="max-w-xl overflow-x-auto border border-border bg-muted/30 p-2 text-[10px] text-left whitespace-pre-wrap">
        {message}
      </pre>
      <div className="flex gap-2">
        <a
          href="/"
          className="inline-flex h-7 items-center border border-border px-3 text-xs hover:bg-muted"
        >
          go home
        </a>
        <button
          onClick={() => window.location.reload()}
          type="button"
          className="inline-flex h-7 items-center border border-border bg-foreground px-3 text-xs text-background hover:opacity-90"
        >
          reload
        </button>
      </div>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <SettingsProvider>
          <HotkeyProvider>{children}</HotkeyProvider>
        </SettingsProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
