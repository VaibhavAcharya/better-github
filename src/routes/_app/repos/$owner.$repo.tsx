import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ArchiveIcon,
  ExternalLinkIcon,
  EyeIcon,
  GitCommitIcon,
  GitForkIcon,
  GitPullRequestIcon,
  ListChecksIcon,
  LockIcon,
  StarIcon,
} from 'lucide-react'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { PageHeader } from '#/components/layout/page-header'
import { ErrorState, ListSkeleton } from '#/components/states'
import { Section } from '#/components/section'
import { PrCard } from '#/components/pr-card'
import { IssueCard } from '#/components/issue-card'
import { TimeAgo } from '#/components/time-ago'
import { UserAvatar } from '#/components/user-avatar'
import { useRepoDetail } from '#/lib/queries'
import { compactNumber } from '#/lib/format'

const ParamsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
})

export const Route = createFileRoute('/_app/repos/$owner/$repo')({
  parseParams: (p) => ParamsSchema.parse(p),
  component: RepoDetailPage,
})

function RepoDetailPage() {
  const { owner, repo } = Route.useParams()
  const detail = useRepoDetail(owner, repo)

  if (detail.isPending) {
    return (
      <div className="space-y-3 p-4">
        <ListSkeleton rows={3} />
      </div>
    )
  }
  if (detail.error) {
    return (
      <div className="p-4">
        <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
      </div>
    )
  }
  if (!detail.data) return null

  const { repo: r, recentCommits, openPrs, openIssues } = detail.data

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        crumbs={[
          { label: 'repositories', to: '/repos' },
          { label: r.nameWithOwner },
        ]}
        title={
          <span className="flex items-center gap-2">
            {r.isPrivate ? (
              <LockIcon className="size-4 text-muted-foreground" />
            ) : null}
            <span className="font-mono">{r.nameWithOwner}</span>
            {r.isFork ? (
              <GitForkIcon className="size-3 text-muted-foreground" />
            ) : null}
            {r.isArchived ? (
              <ArchiveIcon className="size-3 text-muted-foreground" />
            ) : null}
          </span>
        }
        subtitle={
          r.description ? (
            <span className="text-muted-foreground">{r.description}</span>
          ) : null
        }
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="icon-sm" variant="outline">
              <a href={r.url} target="_blank" rel="noreferrer noopener">
                <ExternalLinkIcon />
              </a>
            </Button>
          </div>
        }
      />

      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Section
            icon={GitPullRequestIcon}
            title="open pull requests"
            count={openPrs.length}
          >
            {openPrs.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                no open PRs
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {openPrs.map((pr) => (
                  <li key={pr.id}>
                    <PrCard pr={pr} hideRepo />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            icon={ListChecksIcon}
            title="open issues"
            count={openIssues.length}
          >
            {openIssues.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                no open issues
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {openIssues.map((issue) => (
                  <li key={issue.id}>
                    <IssueCard issue={issue} hideRepo />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            icon={GitCommitIcon}
            title="recent commits"
            defaultOpen={false}
          >
            {recentCommits.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                no recent commits
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {recentCommits.map((c) => (
                  <li
                    key={c.oid}
                    className="flex items-center gap-3 px-3 py-2 text-xs"
                  >
                    {c.authorLogin ? (
                      <UserAvatar
                        login={c.authorLogin}
                        src={c.authorAvatarUrl}
                        size="xs"
                      />
                    ) : (
                      <div className="size-4" />
                    )}
                    <span className="flex-1 truncate">
                      {firstLine(c.message)}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {c.abbreviatedOid}
                    </span>
                    <TimeAgo
                      value={c.committedDate}
                      className="text-[10px] text-muted-foreground"
                    />
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="space-y-3 text-xs">
          <Sidecard label="stats">
            <ul className="space-y-1.5">
              <Stat
                icon={<StarIcon className="size-3" />}
                label="stars"
                value={compactNumber(r.stargazerCount)}
              />
              <Stat
                icon={<GitForkIcon className="size-3" />}
                label="forks"
                value={compactNumber(r.forkCount)}
              />
              <Stat
                icon={<EyeIcon className="size-3" />}
                label="watchers"
                value={compactNumber(r.watchersCount)}
              />
              {r.defaultBranch ? (
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">default branch</span>
                  <span className="font-mono">{r.defaultBranch}</span>
                </li>
              ) : null}
              {r.pushedAt ? (
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">last push</span>
                  <TimeAgo value={r.pushedAt} />
                </li>
              ) : null}
            </ul>
          </Sidecard>

          <Sidecard label="languages">
            {r.languages.length === 0 ? (
              <p className="text-muted-foreground">no language data</p>
            ) : (
              <LanguageBar languages={r.languages} />
            )}
          </Sidecard>
        </aside>
      </div>
    </div>
  )
}

function Sidecard({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <section className="border border-border bg-card p-3">
      <p className="mb-2 text-[10px] tracking-wider uppercase text-muted-foreground">
        {label}
      </p>
      {children}
    </section>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        {icon} {label}
      </span>
      <span className="font-mono">{value}</span>
    </li>
  )
}

function LanguageBar({
  languages,
}: {
  languages: ReadonlyArray<{ name: string; color: string | null; size: number }>
}) {
  const total = languages.reduce((s, l) => s + l.size, 0) || 1
  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-sm bg-muted">
        {languages.map((l) => (
          <span
            key={l.name}
            style={{
              width: `${(l.size / total) * 100}%`,
              backgroundColor: l.color ?? 'var(--muted-foreground)',
            }}
            title={`${l.name} ${((l.size / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <ul className="space-y-0.5">
        {languages.slice(0, 6).map((l) => (
          <li key={l.name} className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <span
                className="size-2 rounded-sm"
                style={{
                  backgroundColor: l.color ?? 'var(--muted-foreground)',
                }}
              />
              {l.name}
            </span>
            <span className="font-mono text-muted-foreground">
              {((l.size / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function firstLine(s: string): string {
  const idx = s.indexOf('\n')
  return idx === -1 ? s : s.slice(0, idx)
}
