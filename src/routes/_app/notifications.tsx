import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BellOffIcon, CheckCheckIcon, FilterIcon } from 'lucide-react'
import { PageHeader } from '#/components/layout/page-header'
import { NotificationRow } from '#/components/notification-row'
import { EmptyState, ErrorState, ListSkeleton } from '#/components/states'
import { Button } from '#/components/ui/button'
import { useListNav } from '#/lib/list-nav'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationDone,
  useMarkNotificationRead,
  useNotifications,
} from '#/lib/queries'
import { useSettings } from '#/lib/settings'
import type { GhNotification } from '#/lib/types'

interface SearchParams {
  filter?: 'unread' | 'all' | 'participating'
  repo?: string
  type?: string
}

export const Route = createFileRoute('/_app/notifications')({
  component: NotificationsPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    filter:
      search.filter === 'all' || search.filter === 'participating'
        ? search.filter
        : 'unread',
    repo: typeof search.repo === 'string' ? search.repo : undefined,
    type: typeof search.type === 'string' ? search.type : undefined,
  }),
})

function NotificationsPage() {
  const { filter, repo, type } = Route.useSearch()
  const navigate = Route.useNavigate()
  const routerNavigate = useNavigate()
  const { settings } = useSettings()
  const refetchInterval = settings.refreshIntervalSec * 1000 || undefined

  const all = filter === 'all'
  const participating = filter === 'participating'
  const notifications = useNotifications({
    all,
    participating,
    refetchInterval,
  })

  const markRead = useMarkNotificationRead()
  const markDone = useMarkNotificationDone()
  const markAll = useMarkAllNotificationsRead()

  const filtered = React.useMemo(() => {
    const list = notifications.data ?? []
    return list.filter((n) => {
      if (repo && n.repo.nameWithOwner !== repo) return false
      if (type && n.type !== type) return false
      return true
    })
  }, [notifications.data, repo, type])

  const grouped = React.useMemo(() => {
    const map = new Map<string, Array<GhNotification>>()
    for (const n of filtered) {
      const arr = map.get(n.repo.nameWithOwner) ?? []
      arr.push(n)
      map.set(n.repo.nameWithOwner, arr)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const repos = React.useMemo(() => {
    const set = new Set<string>()
    for (const n of notifications.data ?? []) set.add(n.repo.nameWithOwner)
    return Array.from(set).sort()
  }, [notifications.data])

  const types = React.useMemo(() => {
    const set = new Set<string>()
    for (const n of notifications.data ?? []) set.add(n.type)
    return Array.from(set).sort()
  }, [notifications.data])

  const unreadCount = (notifications.data ?? []).filter((n) => n.unread).length

  // Flat ordered list (matches what we render group-by-group) so j/k indexing
  // lines up with what the user sees on screen.
  const flatList = React.useMemo(
    () => grouped.flatMap(([, items]) => items),
    [grouped],
  )

  const listNav = useListNav({
    count: flatList.length,
    onSelect: (idx) => {
      const n = flatList[idx]
      if (!n) return
      if (n.type === 'PullRequest' && n.number) {
        void routerNavigate({
          to: '/pulls/$owner/$repo/$number',
          params: {
            owner: n.repo.owner,
            repo: n.repo.name,
            number: n.number,
          },
        })
      } else if (n.type === 'Issue' && n.number) {
        void routerNavigate({
          to: '/issues/$owner/$repo/$number',
          params: {
            owner: n.repo.owner,
            repo: n.repo.name,
            number: n.number,
          },
        })
      } else if (n.subjectUrl) {
        window.open(n.subjectUrl, '_blank', 'noopener,noreferrer')
      }
    },
    onSecondary: (idx) => {
      const n = flatList[idx]
      if (n?.unread) markRead.mutate(n.id)
    },
  })

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="notifications"
        subtitle={
          notifications.data
            ? `${notifications.data.length} loaded · ${unreadCount} unread`
            : 'loading…'
        }
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="xs" variant="outline">
                  <FilterIcon /> {filter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>show</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() =>
                    navigate({ search: (s) => ({ ...s, filter: 'unread' }) })
                  }
                >
                  unread only
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    navigate({ search: (s) => ({ ...s, filter: 'all' }) })
                  }
                >
                  all
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    navigate({
                      search: (s) => ({ ...s, filter: 'participating' }),
                    })
                  }
                >
                  participating
                </DropdownMenuItem>
                {repos.length ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>repo</DropdownMenuLabel>
                    <DropdownMenuItem
                      onSelect={() =>
                        navigate({ search: (s) => ({ ...s, repo: undefined }) })
                      }
                    >
                      any repo
                    </DropdownMenuItem>
                    {repos.map((r) => (
                      <DropdownMenuItem
                        key={r}
                        onSelect={() =>
                          navigate({ search: (s) => ({ ...s, repo: r }) })
                        }
                      >
                        {r}
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : null}
                {types.length ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>type</DropdownMenuLabel>
                    <DropdownMenuItem
                      onSelect={() =>
                        navigate({ search: (s) => ({ ...s, type: undefined }) })
                      }
                    >
                      any type
                    </DropdownMenuItem>
                    {types.map((t) => (
                      <DropdownMenuItem
                        key={t}
                        onSelect={() =>
                          navigate({ search: (s) => ({ ...s, type: t }) })
                        }
                      >
                        {t}
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="xs"
              variant="outline"
              disabled={unreadCount === 0 || markAll.isPending}
              onClick={() => {
                markAll.mutate(undefined, {
                  onSuccess: () =>
                    toast.success('All notifications marked read'),
                  onError: (e: unknown) =>
                    toast.error(
                      `Failed: ${(e as Error).message ?? 'unknown error'}`,
                    ),
                })
              }}
            >
              <CheckCheckIcon /> mark all read
            </Button>
          </div>
        }
      />

      <div
        ref={(el) => {
          listNav.containerRef.current = el
        }}
        className="space-y-3 p-4"
      >
        {notifications.error ? (
          <ErrorState
            error={notifications.error}
            onRetry={() => notifications.refetch()}
          />
        ) : notifications.isPending ? (
          <ListSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BellOffIcon}
            title="all caught up"
            description="There are no notifications matching the current filter."
          />
        ) : (
          (() => {
            let cursor = 0
            return grouped.map(([repoName, items]) => (
              <section key={repoName} className="border border-border bg-card">
                <header className="flex items-center justify-between border-b border-border px-3 py-2 text-xs">
                  <span className="font-mono text-foreground">{repoName}</span>
                  <span className="text-muted-foreground">
                    {items.filter((n) => n.unread).length} unread /{' '}
                    {items.length}
                  </span>
                </header>
                <ul className="divide-y divide-border/60">
                  {items.map((n) => {
                    const idx = cursor++
                    return (
                      <li
                        key={n.id}
                        data-list-item={idx}
                        onMouseEnter={() => listNav.setIndex(idx)}
                      >
                        <NotificationRow
                          notification={n}
                          selected={idx === listNav.index}
                          onMarkRead={(id) => {
                            markRead.mutate(id, {
                              onError: (e: unknown) =>
                                toast.error(
                                  `Failed: ${(e as Error).message ?? 'unknown error'}`,
                                ),
                            })
                          }}
                          onMarkDone={(id) => {
                            markDone.mutate(id, {
                              onError: (e: unknown) =>
                                toast.error(
                                  `Failed: ${(e as Error).message ?? 'unknown error'}`,
                                ),
                            })
                          }}
                        />
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          })()
        )}
      </div>
    </div>
  )
}
