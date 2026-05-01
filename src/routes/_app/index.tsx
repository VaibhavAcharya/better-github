import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AtSignIcon,
  CircleDotIcon,
  EyeIcon,
  GitPullRequestIcon,
  ListChecksIcon,
} from 'lucide-react'
import { PageHeader } from '#/components/layout/page-header'
import { Section } from '#/components/section'
import { PrCard } from '#/components/pr-card'
import { IssueCard } from '#/components/issue-card'
import { EmptyState, ErrorState, ListSkeleton } from '#/components/states'
import { useInbox, useNotifications } from '#/lib/queries'
import { useSettings } from '#/lib/settings'
import { Button } from '#/components/ui/button'
import type { GhInbox, GhIssueSummary, GhPrSummary } from '#/lib/types'

export const Route = createFileRoute('/_app/')({
  component: InboxPage,
})

function InboxPage() {
  const { settings } = useSettings()
  const refetchInterval = settings.refreshIntervalSec * 1000 || undefined
  const inbox = useInbox({ repos: settings.inboxRepos, refetchInterval })
  const notif = useNotifications({ refetchInterval })
  const navigate = useNavigate()

  const inboxData = applyAuthorFilter(inbox.data, settings.hiddenAuthors)
  const totalUnread = notif.data?.filter((n) => n.unread).length ?? 0

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="inbox"
        subtitle="everything that needs your attention, in one screen"
        actions={
          <Button
            variant="outline"
            size="xs"
            onClick={() => navigate({ to: '/notifications' })}
          >
            {totalUnread} unread
          </Button>
        }
      />

      <div className="space-y-4 p-4">
        <Section
          icon={EyeIcon}
          title="awaiting your review"
          count={inboxData?.reviewRequested.length}
          storageKey="inbox.review"
          description={
            inboxData ? "PRs where you've been requested as reviewer" : ''
          }
        >
          {renderPrList(
            inbox.error,
            inbox.isPending,
            inboxData?.reviewRequested,
            'No PRs are waiting on you. Nice.',
            () => inbox.refetch(),
          )}
        </Section>

        <Section
          icon={GitPullRequestIcon}
          title="your open pull requests"
          count={inboxData?.yourOpenPrs.length}
          storageKey="inbox.your-prs"
        >
          {renderPrList(
            inbox.error,
            inbox.isPending,
            inboxData?.yourOpenPrs,
            "You don't have any open PRs.",
            () => inbox.refetch(),
          )}
        </Section>

        <Section
          icon={ListChecksIcon}
          title="assigned issues"
          count={inboxData?.assignedIssues.length}
          storageKey="inbox.issues"
        >
          {renderIssueList(
            inbox.error,
            inbox.isPending,
            inboxData?.assignedIssues,
            'You have no assigned issues.',
            () => inbox.refetch(),
          )}
        </Section>

        <Section
          icon={AtSignIcon}
          title="mentions"
          count={inboxData?.mentioned.length}
          storageKey="inbox.mentions"
          description="recent PRs and issues mentioning you"
        >
          {renderMixedList(
            inbox.error,
            inbox.isPending,
            inboxData?.mentioned,
            'No recent mentions.',
            () => inbox.refetch(),
          )}
        </Section>

        <Section
          icon={CircleDotIcon}
          title="recently updated"
          count={inboxData?.recentlyUpdatedPrs.length}
          storageKey="inbox.recent"
          description="PRs you are involved in"
          defaultOpen={false}
        >
          {renderPrList(
            inbox.error,
            inbox.isPending,
            inboxData?.recentlyUpdatedPrs,
            'No recent activity.',
            () => inbox.refetch(),
          )}
        </Section>
      </div>
    </div>
  )
}

function applyAuthorFilter(
  inbox: GhInbox | undefined,
  hidden: ReadonlyArray<string>,
): GhInbox | undefined {
  if (!inbox || hidden.length === 0) return inbox
  const set = new Set(hidden.map((h) => h.toLowerCase()))
  const isHidden = <T extends { author: { login: string } | null }>(item: T) =>
    item.author && set.has(item.author.login.toLowerCase())
  return {
    reviewRequested: inbox.reviewRequested.filter((p) => !isHidden(p)),
    yourOpenPrs: inbox.yourOpenPrs.filter((p) => !isHidden(p)),
    recentlyUpdatedPrs: inbox.recentlyUpdatedPrs.filter((p) => !isHidden(p)),
    assignedIssues: inbox.assignedIssues.filter((i) => !isHidden(i)),
    mentioned: inbox.mentioned.filter((m) => !isHidden(m)),
  }
}

function renderPrList(
  error: unknown,
  pending: boolean,
  prs: ReadonlyArray<GhPrSummary> | undefined,
  emptyText: string,
  onRetry: () => void,
) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (pending) return <ListSkeleton rows={3} className="p-3" />
  if (!prs || prs.length === 0)
    return <EmptyState title={emptyText} className="border-0" />
  return (
    <ul className="divide-y divide-border/60">
      {prs.map((pr) => (
        <li key={pr.id}>
          <PrCard pr={pr} />
        </li>
      ))}
    </ul>
  )
}

function renderIssueList(
  error: unknown,
  pending: boolean,
  issues: ReadonlyArray<GhIssueSummary> | undefined,
  emptyText: string,
  onRetry: () => void,
) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (pending) return <ListSkeleton rows={3} className="p-3" />
  if (!issues || issues.length === 0)
    return <EmptyState title={emptyText} className="border-0" />
  return (
    <ul className="divide-y divide-border/60">
      {issues.map((issue) => (
        <li key={issue.id}>
          <IssueCard issue={issue} />
        </li>
      ))}
    </ul>
  )
}

function renderMixedList(
  error: unknown,
  pending: boolean,
  items: ReadonlyArray<GhPrSummary | GhIssueSummary> | undefined,
  emptyText: string,
  onRetry: () => void,
) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (pending) return <ListSkeleton rows={3} className="p-3" />
  if (!items || items.length === 0)
    return <EmptyState title={emptyText} className="border-0" />
  return (
    <ul className="divide-y divide-border/60">
      {items.map((item) => (
        <li key={item.id}>
          {isPullRequest(item) ? (
            <PrCard pr={item} />
          ) : (
            <IssueCard issue={item} />
          )}
        </li>
      ))}
    </ul>
  )
}

function isPullRequest(
  item: GhPrSummary | GhIssueSummary,
): item is GhPrSummary {
  return 'isDraft' in item || 'reviewDecision' in item
}
