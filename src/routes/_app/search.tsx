import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { SearchIcon, XIcon } from 'lucide-react'
import { PageHeader } from '#/components/layout/page-header'
import { PrCard } from '#/components/pr-card'
import { IssueCard } from '#/components/issue-card'
import { EmptyState, ErrorState, ListSkeleton } from '#/components/states'
import { Input } from '#/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Button } from '#/components/ui/button'
import { useSearchIssues, useSearchPrs } from '#/lib/queries'

interface SearchParams {
  q?: string
  type?: 'pr' | 'issue'
}

export const Route = createFileRoute('/_app/search')({
  component: SearchPage,
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === 'string' ? s.q : undefined,
    type: s.type === 'issue' || s.type === 'pr' ? s.type : 'pr',
  }),
})

function SearchPage() {
  const { q, type } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [draft, setDraft] = React.useState(q ?? '')
  React.useEffect(() => setDraft(q ?? ''), [q])

  const prQuery = q ? `${q} is:pr` : ''
  const issueQuery = q ? `${q} is:issue` : ''
  const prs = useSearchPrs(prQuery, type === 'pr' && !!q)
  const issues = useSearchIssues(issueQuery, type === 'issue' && !!q)

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="search"
        subtitle="raw GitHub search across PRs and issues"
      />
      <div className="space-y-3 p-4">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            navigate({
              search: (s) => ({ ...s, q: draft.trim() || undefined }),
            })
          }}
        >
          <div className="relative flex flex-1 items-center">
            <SearchIcon className="absolute left-2 size-3.5 text-muted-foreground" />
            <Input
              autoFocus
              className="pl-7"
              placeholder='eg. "auth bug" repo:vercel/next.js label:bug'
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
          <Button size="xs" type="submit" variant="outline">
            search
          </Button>
        </form>

        {!q ? (
          <EmptyState
            title="enter a query"
            description="we use GitHub search syntax. include qualifiers like repo:, label:, author:, or just keywords."
          />
        ) : (
          <Tabs
            value={type}
            onValueChange={(v) =>
              navigate({ search: (s) => ({ ...s, type: v as 'pr' | 'issue' }) })
            }
          >
            <TabsList className="rounded-none">
              <TabsTrigger value="pr" className="rounded-none">
                pull requests
              </TabsTrigger>
              <TabsTrigger value="issue" className="rounded-none">
                issues
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pr" className="space-y-3 pt-3">
              {prs.error ? (
                <ErrorState error={prs.error} onRetry={() => prs.refetch()} />
              ) : prs.isPending ? (
                <ListSkeleton rows={4} />
              ) : !prs.data || prs.data.results.length === 0 ? (
                <EmptyState title="no PRs match this query" />
              ) : (
                <section className="border border-border bg-card">
                  <header className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                    {prs.data.results.length} of {prs.data.totalCount} results
                  </header>
                  <ul className="divide-y divide-border/60">
                    {prs.data.results.map((pr) => (
                      <li key={pr.id}>
                        <PrCard pr={pr} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </TabsContent>
            <TabsContent value="issue" className="space-y-3 pt-3">
              {issues.error ? (
                <ErrorState
                  error={issues.error}
                  onRetry={() => issues.refetch()}
                />
              ) : issues.isPending ? (
                <ListSkeleton rows={4} />
              ) : !issues.data || issues.data.results.length === 0 ? (
                <EmptyState title="no issues match this query" />
              ) : (
                <section className="border border-border bg-card">
                  <header className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                    {issues.data.results.length} of {issues.data.totalCount}{' '}
                    results
                  </header>
                  <ul className="divide-y divide-border/60">
                    {issues.data.results.map((issue) => (
                      <li key={issue.id}>
                        <IssueCard issue={issue} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
