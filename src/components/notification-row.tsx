import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  CheckIcon,
  ExternalLinkIcon,
  GitCommitIcon,
  GitPullRequestIcon,
  HashIcon,
  MessageSquareIcon,
  TagIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { TimeAgo } from '#/components/time-ago'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { reasonLabel } from '#/lib/format'
import { cn } from '#/lib/utils'
import type { GhNotification } from '#/lib/types'

interface NotificationRowProps {
  notification: GhNotification
  onMarkRead: (id: string) => void
  onMarkDone: (id: string) => void
  selected?: boolean
}

const TYPE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  PullRequest: GitPullRequestIcon,
  Issue: HashIcon,
  Commit: GitCommitIcon,
  Discussion: MessageSquareIcon,
  Release: TagIcon,
}

export function NotificationRow({
  notification: n,
  onMarkRead,
  onMarkDone,
  selected,
}: NotificationRowProps) {
  const Icon = TYPE_ICONS[n.type] ?? MessageSquareIcon

  const internalHref = (() => {
    if (n.type === 'PullRequest' && n.number) {
      return {
        to: '/pulls/$owner/$repo/$number' as const,
        params: {
          owner: n.repo.owner,
          repo: n.repo.name,
          number: n.number,
        },
      }
    }
    if (n.type === 'Issue' && n.number) {
      return {
        to: '/issues/$owner/$repo/$number' as const,
        params: {
          owner: n.repo.owner,
          repo: n.repo.name,
          number: n.number,
        },
      }
    }
    return null
  })()

  return (
    <div
      data-unread={n.unread || undefined}
      data-selected={selected || undefined}
      className={cn(
        'group flex items-center gap-3 border-l-2 border-transparent px-3 py-2 text-xs transition-colors hover:bg-muted/40',
        n.unread && 'bg-muted/20',
        selected && 'border-l-foreground bg-muted/40',
      )}
    >
      <span
        className={cn(
          'inline-flex size-2 shrink-0 rounded-full',
          n.unread ? 'bg-foreground' : 'bg-transparent',
        )}
        aria-hidden
      />
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {internalHref ? (
          <Link
            to={internalHref.to}
            params={internalHref.params}
            className="truncate font-medium text-foreground hover:underline"
          >
            {n.title}
          </Link>
        ) : (
          <span className="truncate font-medium text-foreground">
            {n.title}
          </span>
        )}
        <div className="flex min-w-0 items-center gap-3 text-[11px] text-muted-foreground">
          <span className="truncate font-mono">{n.repo.nameWithOwner}</span>
          <span>{reasonLabel(n.reason)}</span>
          <TimeAgo value={n.updatedAt} />
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {n.unread ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Mark read"
                onClick={() => onMarkRead(n.id)}
              >
                <CheckIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>mark read</TooltipContent>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Mark done"
              onClick={() => onMarkDone(n.id)}
            >
              <XIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>mark done</TooltipContent>
        </Tooltip>
        {n.subjectUrl ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Open on GitHub"
                asChild
              >
                <a
                  href={n.subjectUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <ExternalLinkIcon />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>open on github</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}
