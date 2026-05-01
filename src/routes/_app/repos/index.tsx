import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArchiveIcon,
  FolderGit2Icon,
  GitForkIcon,
  LockIcon,
  SearchIcon,
  StarIcon,
  XIcon,
} from 'lucide-react'
import { PageHeader } from '#/components/layout/page-header'
import { EmptyState, ErrorState, ListSkeleton } from '#/components/states'
import { Input } from '#/components/ui/input'
import { TimeAgo } from '#/components/time-ago'
import { useRepos } from '#/lib/queries'
import { useSettings } from '#/lib/settings'
import { compactNumber } from '#/lib/format'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/repos/')({
  component: ReposListPage,
})

function ReposListPage() {
  const repos = useRepos()
  const { settings, set } = useSettings()
  const [filter, setFilter] = React.useState('')

  const filtered = React.useMemo(() => {
    const all = repos.data ?? []
    const q = filter.trim().toLowerCase()
    if (!q) return all
    return all.filter(
      (r) =>
        r.nameWithOwner.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false) ||
        (r.primaryLanguage?.name.toLowerCase().includes(q) ?? false),
    )
  }, [repos.data, filter])

  const pinnedSet = new Set(settings.inboxRepos)
  const togglePin = (name: string) => {
    if (pinnedSet.has(name)) {
      set(
        'inboxRepos',
        settings.inboxRepos.filter((r) => r !== name),
      )
    } else {
      set('inboxRepos', [...settings.inboxRepos, name])
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="repositories"
        subtitle={repos.data ? `${repos.data.length} accessible` : 'loading…'}
      />

      <div className="space-y-3 p-4">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-7"
            placeholder="filter by name, language, description"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {filter ? (
            <button
              type="button"
              className="absolute right-2 text-muted-foreground hover:text-foreground"
              onClick={() => setFilter('')}
              aria-label="clear"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>

        {repos.error ? (
          <ErrorState error={repos.error} onRetry={() => repos.refetch()} />
        ) : repos.isPending ? (
          <ListSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FolderGit2Icon}
            title="no repositories match"
            description="Try a different filter or sign in with a different account."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filtered.map((r) => {
              const pinned = pinnedSet.has(r.nameWithOwner)
              return (
                <li
                  key={r.id}
                  className={cn(
                    'group relative border border-border bg-card transition-colors hover:border-foreground/30',
                    pinned && 'border-foreground/40',
                  )}
                >
                  <Link
                    to="/repos/$owner/$repo"
                    params={{ owner: r.owner, repo: r.name }}
                    className="block px-3 py-3 outline-none focus-visible:bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      {r.isPrivate ? (
                        <LockIcon className="size-3 text-muted-foreground" />
                      ) : (
                        <FolderGit2Icon className="size-3 text-muted-foreground" />
                      )}
                      <span className="truncate font-medium">
                        {r.nameWithOwner}
                      </span>
                      {r.isFork ? (
                        <span className="text-muted-foreground" title="fork">
                          <GitForkIcon className="size-3" />
                        </span>
                      ) : null}
                      {r.isArchived ? (
                        <span
                          className="text-muted-foreground"
                          title="archived"
                        >
                          <ArchiveIcon className="size-3" />
                        </span>
                      ) : null}
                    </div>
                    {r.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {r.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                      {r.primaryLanguage ? (
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="size-2 rounded-sm"
                            style={{
                              backgroundColor:
                                r.primaryLanguage.color ??
                                'var(--muted-foreground)',
                            }}
                          />
                          {r.primaryLanguage.name}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <StarIcon className="size-3" />
                        {compactNumber(r.stargazerCount)}
                      </span>
                      {r.openIssuesCount > 0 ? (
                        <span>{r.openIssuesCount} open issues</span>
                      ) : null}
                      {r.pushedAt ? (
                        <span>
                          pushed <TimeAgo value={r.pushedAt} />
                        </span>
                      ) : null}
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => togglePin(r.nameWithOwner)}
                    className={cn(
                      'absolute top-2 right-2 inline-flex h-6 items-center gap-1 px-1.5 text-[10px]',
                      pinned
                        ? 'border border-foreground/40 bg-muted text-foreground'
                        : 'opacity-0 group-hover:opacity-100 border border-border bg-background text-muted-foreground hover:text-foreground',
                    )}
                    aria-label={pinned ? 'unpin' : 'pin'}
                    title={
                      pinned
                        ? 'remove from inbox scope'
                        : 'add to inbox scope (limits inbox to these repos)'
                    }
                  >
                    {pinned ? 'pinned' : 'pin'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
