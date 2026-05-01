import { Link } from '@tanstack/react-router'
import { MessageSquareIcon } from 'lucide-react'
import { IssueStatePill } from '#/components/status-pill'
import { LabelList } from '#/components/label-tag'
import { TimeAgo } from '#/components/time-ago'
import { UserAvatar } from '#/components/user-avatar'
import { cn } from '#/lib/utils'
import type { GhIssueSummary } from '#/lib/types'

interface IssueCardProps {
  issue: GhIssueSummary
  hideRepo?: boolean
  density?: 'compact' | 'comfortable'
  selected?: boolean
  className?: string
}

export function IssueCard({
  issue,
  hideRepo,
  density = 'compact',
  selected,
  className,
}: IssueCardProps) {
  return (
    <Link
      to="/issues/$owner/$repo/$number"
      params={{
        owner: issue.repo.owner,
        repo: issue.repo.name,
        number: issue.number,
      }}
      data-selected={selected ? '' : undefined}
      className={cn(
        'group flex gap-3 border-l-2 border-transparent px-3 py-2 text-xs transition-colors hover:bg-muted/40 outline-none focus-visible:bg-muted/60',
        selected && 'border-l-foreground bg-muted/40',
        density === 'comfortable' && 'py-3',
        className,
      )}
    >
      <div className="pt-0.5">
        <IssueStatePill state={issue.state} showLabel={false} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-foreground group-hover:underline">
            {issue.title}
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {!hideRepo ? (
            <span className="truncate font-mono">
              {issue.repo.nameWithOwner}
            </span>
          ) : null}
          <span className="font-mono">#{issue.number}</span>
          {issue.author ? (
            <span className="flex items-center gap-1">
              <UserAvatar
                login={issue.author.login}
                src={issue.author.avatarUrl}
                size="xs"
              />
              <span>{issue.author.login}</span>
            </span>
          ) : null}
          <TimeAgo value={issue.updatedAt} />
          {issue.comments > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <MessageSquareIcon className="size-3" />
              {issue.comments}
            </span>
          ) : null}
          {issue.assignees.length > 0 ? (
            <span className="flex -space-x-1">
              {issue.assignees.slice(0, 3).map((a) => (
                <UserAvatar
                  key={a.login}
                  login={a.login}
                  src={a.avatarUrl}
                  size="xs"
                  className="ring-1 ring-background"
                />
              ))}
            </span>
          ) : null}
          {issue.labels.length > 0 ? (
            <LabelList labels={issue.labels} max={3} />
          ) : null}
        </div>
      </div>
    </Link>
  )
}
