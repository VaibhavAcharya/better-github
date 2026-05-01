import { Link, useRouterState } from '@tanstack/react-router'
import {
  BellIcon,
  FolderGit2Icon,
  GitPullRequestIcon,
  HouseIcon,
  ListChecksIcon,
  SettingsIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNotifications } from '#/lib/queries'
import { useSettings } from '#/lib/settings'
import { cn } from '#/lib/utils'
import { Kbd } from '#/components/kbd'

interface NavLink {
  label: string
  to: string
  icon: LucideIcon
  shortcut?: string
  badgeKey?: 'unreadNotifications'
}

const NAV: ReadonlyArray<NavLink> = [
  { label: 'inbox', to: '/', icon: HouseIcon, shortcut: 'g i' },
  {
    label: 'notifications',
    to: '/notifications',
    icon: BellIcon,
    shortcut: 'g n',
    badgeKey: 'unreadNotifications',
  },
  {
    label: 'pull requests',
    to: '/pulls',
    icon: GitPullRequestIcon,
    shortcut: 'g p',
  },
  { label: 'issues', to: '/issues', icon: ListChecksIcon, shortcut: 'g s' },
  {
    label: 'repositories',
    to: '/repos',
    icon: FolderGit2Icon,
    shortcut: 'g r',
  },
]

export function Sidebar() {
  const { settings } = useSettings()
  const refetchInterval = settings.refreshIntervalSec * 1000 || undefined

  // Pull notifications globally so the badge stays live without per-page work.
  const notif = useNotifications({ refetchInterval })

  const badges: Record<string, number | null> = {
    unreadNotifications: notif.data?.filter((n) => n.unread).length ?? null,
  }

  const router = useRouterState()
  const pathname = router.location.pathname

  return (
    <aside className="hidden h-svh w-52 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-11 items-center gap-2 px-3 text-xs font-medium tracking-tight">
        <span aria-hidden>{'>'}</span>
        <span>better-github</span>
      </div>

      <nav className="flex flex-1 flex-col px-1 py-1">
        {NAV.map((item) => {
          const active =
            pathname === item.to ||
            (item.to !== '/' && pathname.startsWith(item.to))
          const badge = item.badgeKey ? badges[item.badgeKey] : null
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'group flex items-center gap-2 px-2 py-1.5 text-xs transition-colors',
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'w-3 shrink-0 text-center text-muted-foreground/60',
                  active && 'text-foreground',
                )}
              >
                {active ? '·' : ' '}
              </span>
              <Icon className="size-3.5 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {badge && badge > 0 ? (
                <span className="font-mono text-[10px] text-foreground tabular-nums">
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
              {item.shortcut ? (
                <span className="hidden gap-0.5 text-[10px] tracking-tight text-muted-foreground/60 group-hover:flex">
                  {item.shortcut.split(' ').map((k) => (
                    <Kbd
                      key={k}
                      className="border-transparent bg-transparent px-0"
                    >
                      {k}
                    </Kbd>
                  ))}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="px-1 py-1">
        <Link
          to="/settings"
          className={cn(
            'group flex items-center gap-2 px-2 py-1.5 text-xs transition-colors',
            pathname.startsWith('/settings')
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'w-3 shrink-0 text-center text-muted-foreground/60',
              pathname.startsWith('/settings') && 'text-foreground',
            )}
          >
            {pathname.startsWith('/settings') ? '·' : ' '}
          </span>
          <SettingsIcon className="size-3.5" />
          <span className="flex-1">settings</span>
        </Link>
      </div>
    </aside>
  )
}
