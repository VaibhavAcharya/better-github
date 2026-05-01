import { Link } from '@tanstack/react-router'
import {
  CheckIcon,
  GitMergeIcon,
  MessageSquareIcon,
  MinusIcon,
  PlusIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { CheckPill, PrStatePill } from '#/components/status-pill'
import { LabelList } from '#/components/label-tag'
import { TimeAgo } from '#/components/time-ago'
import { UserAvatar } from '#/components/user-avatar'
import { compactNumber } from '#/lib/format'
import { cn } from '#/lib/utils'
import type { GhPrSummary } from '#/lib/types'

interface PrCardProps {
  pr: GhPrSummary
  /** When true, hide the repo prefix (eg. on a single-repo page). */
  hideRepo?: boolean
  density?: 'compact' | 'comfortable'
  selected?: boolean
  className?: string
}

export function PrCard({
  pr,
  hideRepo,
  density = 'compact',
  selected,
  className,
}: PrCardProps) {
  return (
    <Link
      to="/pulls/$owner/$repo/$number"
      params={{
        owner: pr.repo.owner,
        repo: pr.repo.name,
        number: pr.number,
      }}
      data-selected={selected ? '' : undefined}
      className={cn(
        'group flex gap-3 border-l-2 border-transparent px-3 py-2 text-xs transition-colors hover:bg-muted/40 focus-visible:bg-muted/60 outline-none',
        selected && 'border-l-foreground bg-muted/40',
        density === 'comfortable' && 'py-3',
        className,
      )}
    >
      <div className="pt-0.5">
        <PrStatePill state={pr.state} isDraft={pr.isDraft} showLabel={false} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-foreground group-hover:underline">
            {pr.title}
          </span>
          {pr.reviewDecision === 'APPROVED' ? (
            <span
              className="flex shrink-0 items-center gap-0.5 text-[10px] text-emerald-400"
              title="approved"
            >
              <CheckIcon className="size-3" /> approved
            </span>
          ) : null}
          {pr.reviewDecision === 'CHANGES_REQUESTED' ? (
            <span
              className="flex shrink-0 items-center gap-0.5 text-[10px] text-rose-400"
              title="changes requested"
            >
              <TriangleAlertIcon className="size-3" /> changes
            </span>
          ) : null}
          {pr.mergeable === 'CONFLICTING' ? (
            <span
              className="flex shrink-0 items-center gap-0.5 text-[10px] text-amber-400"
              title="merge conflicts"
            >
              <GitMergeIcon className="size-3" /> conflict
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {!hideRepo ? (
            <span className="truncate font-mono">{pr.repo.nameWithOwner}</span>
          ) : null}
          <span className="font-mono">#{pr.number}</span>
          {pr.author ? (
            <span className="flex items-center gap-1">
              <UserAvatar
                login={pr.author.login}
                src={pr.author.avatarUrl}
                size="xs"
              />
              <span>{pr.author.login}</span>
            </span>
          ) : null}
          <TimeAgo value={pr.updatedAt} />
          <CheckPill state={pr.checkState} />
          {pr.comments > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <MessageSquareIcon className="size-3" />
              {pr.comments}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 font-mono">
            <span className="inline-flex items-center text-emerald-400">
              <PlusIcon className="size-3" />
              {compactNumber(pr.additions)}
            </span>
            <span className="inline-flex items-center text-rose-400">
              <MinusIcon className="size-3" />
              {compactNumber(pr.deletions)}
            </span>
          </span>
          {pr.labels.length > 0 ? (
            <LabelList labels={pr.labels} max={3} />
          ) : null}
        </div>
      </div>
    </Link>
  )
}
