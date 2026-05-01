import * as React from 'react'
import {
  CheckCircle2Icon,
  CircleDotIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  MessageSquareIcon,
  PencilIcon,
  TagIcon,
  TriangleAlertIcon,
  UserPlusIcon,
  ZapIcon,
} from 'lucide-react'
import { Markdown } from '#/components/markdown'
import { TimeAgo } from '#/components/time-ago'
import { UserAvatar } from '#/components/user-avatar'
import { cn } from '#/lib/utils'
import type { GhTimelineItem } from '#/lib/types'

interface TimelineProps {
  items: ReadonlyArray<GhTimelineItem>
}

export function Timeline({ items }: TimelineProps) {
  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`}>
          <TimelineItemView item={item} />
        </li>
      ))}
    </ol>
  )
}

function TimelineItemView({ item }: { item: GhTimelineItem }) {
  if (item.kind === 'comment') {
    return (
      <article className="border border-border bg-card">
        <header className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs">
          <UserAvatar
            login={item.author?.login ?? '?'}
            src={item.author?.avatarUrl}
            size="sm"
          />
          <span className="font-medium">{item.author?.login ?? 'ghost'}</span>
          <span className="text-muted-foreground">commented</span>
          <span className="ml-auto text-muted-foreground">
            <TimeAgo value={item.createdAt} />
          </span>
        </header>
        <div className="px-3 py-3">
          <Markdown body={item.body} />
        </div>
      </article>
    )
  }

  if (item.kind === 'review') {
    const stateInfo = REVIEW_STATES[item.state] ?? REVIEW_STATES.COMMENTED
    return (
      <article className={cn('border bg-card', stateInfo.borderClass)}>
        <header className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs">
          <UserAvatar
            login={item.author?.login ?? '?'}
            src={item.author?.avatarUrl}
            size="sm"
          />
          <span className="font-medium">{item.author?.login ?? 'ghost'}</span>
          <span
            className={cn(
              'inline-flex items-center gap-1',
              stateInfo.textClass,
            )}
          >
            <stateInfo.icon className="size-3" />
            {stateInfo.label}
          </span>
          {item.submittedAt ? (
            <span className="ml-auto text-muted-foreground">
              <TimeAgo value={item.submittedAt} />
            </span>
          ) : null}
        </header>
        {item.body ? (
          <div className="px-3 py-3">
            <Markdown body={item.body} />
          </div>
        ) : null}
      </article>
    )
  }

  // event
  const event = EVENT_META[item.type]
  const Icon = event?.icon ?? CircleDotIcon
  const text = event?.label ?? item.type.replaceAll('-', ' ')
  return (
    <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
      <Icon className={cn('size-3.5', event?.color)} />
      {item.actor ? (
        <span className="font-medium text-foreground">{item.actor.login}</span>
      ) : null}
      <span>{text}</span>
      {item.detail ? (
        <span className="font-mono text-foreground/80">{item.detail}</span>
      ) : null}
      <span className="ml-auto">
        <TimeAgo value={item.createdAt} />
      </span>
    </div>
  )
}

const REVIEW_STATES: Record<
  string,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    textClass: string
    borderClass: string
  }
> = {
  APPROVED: {
    label: 'approved',
    icon: CheckCircle2Icon,
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
  },
  CHANGES_REQUESTED: {
    label: 'requested changes',
    icon: TriangleAlertIcon,
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/40',
  },
  COMMENTED: {
    label: 'reviewed',
    icon: MessageSquareIcon,
    textClass: 'text-foreground',
    borderClass: 'border-border',
  },
  DISMISSED: {
    label: 'dismissed',
    icon: MessageSquareIcon,
    textClass: 'text-muted-foreground',
    borderClass: 'border-border',
  },
  PENDING: {
    label: 'pending review',
    icon: MessageSquareIcon,
    textClass: 'text-muted-foreground',
    borderClass: 'border-border',
  },
}

const EVENT_META: Record<
  string,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    color: string
  }
> = {
  closed: {
    label: 'closed this',
    icon: GitPullRequestClosedIcon,
    color: 'text-rose-400',
  },
  reopened: {
    label: 'reopened this',
    icon: CircleDotIcon,
    color: 'text-emerald-400',
  },
  merged: { label: 'merged at', icon: GitMergeIcon, color: 'text-violet-400' },
  'review-requested': {
    label: 'requested review',
    icon: UserPlusIcon,
    color: 'text-foreground',
  },
  labeled: { label: 'labeled', icon: TagIcon, color: 'text-foreground' },
  unlabeled: {
    label: 'removed label',
    icon: TagIcon,
    color: 'text-muted-foreground',
  },
  assigned: {
    label: 'assigned',
    icon: UserPlusIcon,
    color: 'text-foreground',
  },
  'force-pushed': {
    label: 'force-pushed',
    icon: ZapIcon,
    color: 'text-amber-400',
  },
  renamed: {
    label: 'renamed',
    icon: PencilIcon,
    color: 'text-foreground',
  },
}
