import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { GitPullRequestIcon, SearchIcon, XIcon } from 'lucide-react'
import { PageHeader } from '#/components/layout/page-header'
import { PrCard } from '#/components/pr-card'
import { EmptyState, ErrorState, ListSkeleton } from '#/components/states'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useSearchPrs } from '#/lib/queries'
import { useListNav } from '#/lib/list-nav'
import { useSettings } from '#/lib/settings'

interface SearchParams {
  q?: string
  scope?: 'involves' | 'author' | 'review-requested' | 'mentions' | 'assignee'
  state?: 'open' | 'closed' | 'merged' | 'any'
  sort?: 'updated' | 'created' | 'comments' | 'reactions'
}

export const Route = createFileRoute('/_app/pulls/')({
  component: PullsListPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === 'string' ? search.q : undefined,
    scope:
      search.scope === 'author' ||
      search.scope === 'review-requested' ||
      search.scope === 'mentions' ||
      search.scope === 'assignee' ||
      search.scope === 'involves'
        ? search.scope
        : 'involves',
    state:
      search.state === 'closed' ||
      search.state === 'merged' ||
      search.state === 'any'
        ? search.state
        : 'open',
    sort:
      search.sort === 'created' ||
      search.sort === 'comments' ||
      search.sort === 'reactions'
        ? search.sort
        : 'updated',
  }),
})

function PullsListPage() {
  const { q, scope, state, sort } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { settings } = useSettings()
  const [draft, setDraft] = React.useState(q ?? '')

  React.useEffect(() => setDraft(q ?? ''), [q])

  const buildQuery = React.useCallback(() => {
    const parts: Array<string> = ['is:pr', 'archived:false']
    if (state === 'open') parts.push('is:open')
    else if (state === 'closed') parts.push('is:closed', 'is:unmerged')
    else if (state === 'merged') parts.push('is:merged')
    if (scope === 'author') parts.push('author:@me')
    else if (scope === 'review-requested') parts.push('review-requested:@me')
    else if (scope === 'mentions') parts.push('mentions:@me')
    else if (scope === 'assignee') parts.push('assignee:@me')
    else parts.push('involves:@me')
    if (settings.inboxRepos.length > 0) {
      for (const r of settings.inboxRepos) parts.push(`repo:${r}`)
    }
    parts.push(`sort:${sort}-desc`)
    if (q) parts.push(q)
    return parts.join(' ')
  }, [q, scope, state, sort, settings.inboxRepos])

  const query = buildQuery()
  const result = useSearchPrs(query)
  const routerNavigate = useNavigate()

  const items = result.data?.results ?? []
  const listNav = useListNav({
    count: items.length,
    onSelect: (idx) => {
      const pr = items[idx]
      if (!pr) return
      void routerNavigate({
        to: '/pulls/$owner/$repo/$number',
        params: {
          owner: pr.repo.owner,
          repo: pr.repo.name,
          number: pr.number,
        },
      })
    },
  })

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="pull requests"
        subtitle="search across every PR you can see"
      />

      <div className="space-y-3 p-4">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            navigate({ search: (s) => ({ ...s, q: draft || undefined }) })
          }}
        >
          <div className="relative flex flex-1 items-center">
            <SearchIcon className="absolute left-2 size-3.5 text-muted-foreground" />
            <Input
              className="pl-7"
              placeholder="search query (eg. label:bug repo:vercel/next.js)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            {draft ? (
              <button
                type="button"
                className="absolute right-2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setDraft('')
                  navigate({ search: (s) => ({ ...s, q: undefined }) })
                }}
                aria-label="clear"
              >
                <XIcon className="size-3.5" />
              </button>
            ) : null}
          </div>
          <Select
            value={scope}
            onValueChange={(v) =>
              navigate({
                search: (s) => ({ ...s, scope: v as SearchParams['scope'] }),
              })
            }
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="involves">involves me</SelectItem>
              <SelectItem value="author">authored by me</SelectItem>
              <SelectItem value="review-requested">review-requested</SelectItem>
              <SelectItem value="mentions">mentions me</SelectItem>
              <SelectItem value="assignee">assigned to me</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={state}
            onValueChange={(v) =>
              navigate({
                search: (s) => ({ ...s, state: v as SearchParams['state'] }),
              })
            }
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">open</SelectItem>
              <SelectItem value="merged">merged</SelectItem>
              <SelectItem value="closed">closed</SelectItem>
              <SelectItem value="any">any</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(v) =>
              navigate({
                search: (s) => ({ ...s, sort: v as SearchParams['sort'] }),
              })
            }
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">updated</SelectItem>
              <SelectItem value="created">created</SelectItem>
              <SelectItem value="comments">comments</SelectItem>
              <SelectItem value="reactions">reactions</SelectItem>
            </SelectContent>
          </Select>
          <Button size="xs" type="submit" variant="outline">
            search
          </Button>
        </form>

        <details className="text-[11px] text-muted-foreground">
          <summary className="cursor-pointer select-none">
            current GitHub query
          </summary>
          <pre className="mt-1 border border-border bg-muted/30 p-2 whitespace-pre-wrap">
            {query}
          </pre>
        </details>

        {result.error ? (
          <ErrorState error={result.error} onRetry={() => result.refetch()} />
        ) : result.isPending ? (
          <ListSkeleton rows={6} />
        ) : !result.data || result.data.results.length === 0 ? (
          <EmptyState
            icon={GitPullRequestIcon}
            title="no pull requests"
            description="Adjust your filters or try a different search."
          />
        ) : (
          <section
            ref={(el) => {
              listNav.containerRef.current = el
            }}
            className="border border-border bg-card"
          >
            <header className="flex items-center justify-between border-b border-border px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                {result.data.results.length} of {result.data.totalCount} results
              </span>
            </header>
            <ul className="divide-y divide-border/60">
              {result.data.results.map((pr, idx) => (
                <li
                  key={pr.id}
                  data-list-item={idx}
                  onMouseEnter={() => listNav.setIndex(idx)}
                >
                  <PrCard pr={pr} selected={idx === listNav.index} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
