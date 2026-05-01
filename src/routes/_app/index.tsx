import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AtSignIcon,
  CircleDotIcon,
  EyeIcon,
  GitPullRequestIcon,
  ListChecksIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '#/components/layout/page-header'
import { Section } from '#/components/section'
import { PrCard } from '#/components/pr-card'
import { IssueCard } from '#/components/issue-card'
import { EmptyState, ErrorState, ListSkeleton } from '#/components/states'
import { useInbox, useNotifications } from '#/lib/queries'
import { useListNav } from '#/lib/list-nav'
import { useSettings } from '#/lib/settings'
import { Button } from '#/components/ui/button'
import type { GhInbox, GhIssueSummary, GhPrSummary } from '#/lib/types'

export const Route = createFileRoute('/_app/')({
  component: InboxPage,
})

interface SectionDef {
  key: string
  icon: LucideIcon
  title: string
  description?: string
  defaultOpen?: boolean
  empty: string
  items: ReadonlyArray<GhPrSummary | GhIssueSummary>
}

function InboxPage() {
  const { settings } = useSettings()
  const refetchInterval = settings.refreshIntervalSec * 1000 || undefined
  const inbox = useInbox({ repos: settings.inboxRepos, refetchInterval })
  const notif = useNotifications({ refetchInterval })
  const navigate = useNavigate()

  const inboxData = applyAuthorFilter(inbox.data, settings.hiddenAuthors)
  const totalUnread = notif.data?.filter((n) => n.unread).length ?? 0

  const sections: ReadonlyArray<SectionDef> = inboxData
    ? [
        {
          key: 'review',
          icon: EyeIcon,
          title: 'awaiting your review',
          description: "PRs where you've been requested as reviewer",
          empty: 'no PRs are waiting on you',
          items: inboxData.reviewRequested,
        },
        {
          key: 'your-prs',
          icon: GitPullRequestIcon,
          title: 'your open pull requests',
          empty: 'no open PRs',
          items: inboxData.yourOpenPrs,
        },
        {
          key: 'issues',
          icon: ListChecksIcon,
          title: 'assigned issues',
          empty: 'no assigned issues',
          items: inboxData.assignedIssues,
        },
        {
          key: 'mentions',
          icon: AtSignIcon,
          title: 'mentions',
          description: 'recent PRs and issues mentioning you',
          empty: 'no recent mentions',
          items: inboxData.mentioned,
        },
        {
          key: 'recent',
          icon: CircleDotIcon,
          title: 'recently updated',
          description: 'PRs you are involved in',
          defaultOpen: false,
          empty: 'no recent activity',
          items: inboxData.recentlyUpdatedPrs,
        },
      ]
    : []

  // Flat list across all sections so j/k can move through what's on screen.
  const flat = React.useMemo(
    () => sections.flatMap((s) => s.items),
    [sections],
  )

  const listNav = useListNav({
    count: flat.length,
    onSelect: (idx) => {
      const item = flat[idx]
      if (!item) return
      if (isPullRequest(item)) {
        void navigate({
          to: '/pulls/$owner/$repo/$number',
          params: {
            owner: item.repo.owner,
            repo: item.repo.name,
            number: item.number,
          },
        })
      } else {
        void navigate({
          to: '/issues/$owner/$repo/$number',
          params: {
            owner: item.repo.owner,
            repo: item.repo.name,
            number: item.number,
          },
        })
      }
    },
  })

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
            [{totalUnread}] unread
          </Button>
        }
      />

      <div
        ref={(el) => {
          listNav.containerRef.current = el
        }}
        className="space-y-3 p-4"
      >
        {inbox.error ? (
          <ErrorState error={inbox.error} onRetry={() => inbox.refetch()} />
        ) : inbox.isPending ? (
          <ListSkeleton rows={6} />
        ) : (
          (() => {
            let cursor = 0
            return sections.map((s) => {
              const start = cursor
              cursor += s.items.length
              return (
                <Section
                  key={s.key}
                  icon={s.icon}
                  title={s.title}
                  count={s.items.length}
                  storageKey={`inbox.${s.key}`}
                  description={s.description}
                  defaultOpen={s.defaultOpen}
                >
                  {s.items.length === 0 ? (
                    <EmptyState
                      title={s.empty}
                      className="border-0 py-6"
                    />
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {s.items.map((item, i) => {
                        const idx = start + i
                        return (
                          <li
                            key={item.id}
                            data-list-item={idx}
                            onMouseEnter={() => listNav.setIndex(idx)}
                          >
                            {isPullRequest(item) ? (
                              <PrCard
                                pr={item}
                                selected={idx === listNav.index}
                              />
                            ) : (
                              <IssueCard
                                issue={item}
                                selected={idx === listNav.index}
                              />
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </Section>
              )
            })
          })()
        )}
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

function isPullRequest(
  item: GhPrSummary | GhIssueSummary,
): item is GhPrSummary {
  return 'isDraft' in item || 'reviewDecision' in item
}
