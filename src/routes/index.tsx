import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

const tabs = [
  { label: 'overview', active: true, badge: null },
  { label: 'notifications', active: false, badge: '*' },
  { label: 'pull-requests', active: false, badge: null },
  { label: 'issues', active: false, badge: null },
  { label: 'reviews', active: false, badge: null },
] as const

function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col px-6 py-12">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-medium">better-github</h1>
        <span className="text-muted-foreground font-mono text-xs">v0.0.0</span>
      </header>

      <p className="text-muted-foreground mt-2 max-w-xl text-sm">
        An opinionated, local-first GitHub dashboard, powered by your{' '}
        <span className="font-mono">gh</span> CLI.
      </p>

      <nav
        aria-label="Sections"
        className="border-border mt-10 flex flex-wrap gap-x-4 gap-y-2 border-b pb-3 font-mono text-sm"
      >
        {tabs.map((tab) => (
          <span
            key={tab.label}
            className={
              tab.active
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground cursor-pointer'
            }
          >
            <span className="text-muted-foreground">[</span>
            {tab.label}
            {tab.badge ? (
              <span className="text-foreground">{tab.badge}</span>
            ) : null}
            <span className="text-muted-foreground">]</span>
          </span>
        ))}
      </nav>

      <section className="mt-10 space-y-3 font-mono text-sm">
        <p className="text-muted-foreground">
          <span className="text-foreground">status</span> &mdash; early, active
          development
        </p>
        <p className="text-muted-foreground">
          <span className="text-foreground">requires</span> &mdash; gh auth
          login, node 20+
        </p>
        <p className="text-muted-foreground">
          <span className="text-foreground">data</span> &mdash; nothing leaves
          your machine
        </p>
      </section>

      <footer className="text-muted-foreground mt-auto pt-12 font-mono text-xs">
        nothing here is final yet.
      </footer>
    </main>
  )
}
