import * as React from 'react'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleDotIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
  LoaderIcon,
  MinusCircleIcon,
  XCircleIcon,
} from 'lucide-react'
import { cn } from '#/lib/utils'
import type { GhCheckState, GhIssueState, GhPrState } from '#/lib/types'

/* ------------------------------- PR state ------------------------------- */

interface PrStatePillProps {
  state: GhPrState
  isDraft?: boolean
  className?: string
  showLabel?: boolean
}

export function PrStatePill({
  state,
  isDraft,
  className,
  showLabel = true,
}: PrStatePillProps) {
  if (isDraft) {
    return (
      <Pill className={cn('text-muted-foreground', className)}>
        <GitPullRequestDraftIcon className="size-3" />
        {showLabel ? 'draft' : null}
      </Pill>
    )
  }
  if (state === 'MERGED')
    return (
      <Pill className={cn('text-violet-400', className)}>
        <GitMergeIcon className="size-3" />
        {showLabel ? 'merged' : null}
      </Pill>
    )
  if (state === 'CLOSED')
    return (
      <Pill className={cn('text-rose-400', className)}>
        <GitPullRequestClosedIcon className="size-3" />
        {showLabel ? 'closed' : null}
      </Pill>
    )
  return (
    <Pill className={cn('text-emerald-400', className)}>
      <GitPullRequestIcon className="size-3" />
      {showLabel ? 'open' : null}
    </Pill>
  )
}

/* ------------------------------ Issue state ----------------------------- */

interface IssueStatePillProps {
  state: GhIssueState
  className?: string
  showLabel?: boolean
}

export function IssueStatePill({
  state,
  className,
  showLabel = true,
}: IssueStatePillProps) {
  if (state === 'CLOSED')
    return (
      <Pill className={cn('text-violet-400', className)}>
        <CheckCircle2Icon className="size-3" />
        {showLabel ? 'closed' : null}
      </Pill>
    )
  return (
    <Pill className={cn('text-emerald-400', className)}>
      <CircleDotIcon className="size-3" />
      {showLabel ? 'open' : null}
    </Pill>
  )
}

/* --------------------------------- Checks --------------------------------- */

interface CheckPillProps {
  state: GhCheckState | null
  className?: string
  label?: string
}

const CHECK_STYLES: Record<
  GhCheckState | 'NONE',
  {
    icon: React.ComponentType<{ className?: string }>
    color: string
    label: string
  }
> = {
  SUCCESS: {
    icon: CheckCircle2Icon,
    color: 'text-emerald-400',
    label: 'passing',
  },
  FAILURE: { icon: XCircleIcon, color: 'text-rose-400', label: 'failing' },
  ERROR: { icon: AlertCircleIcon, color: 'text-rose-400', label: 'error' },
  PENDING: { icon: LoaderIcon, color: 'text-amber-400', label: 'pending' },
  EXPECTED: {
    icon: CircleDashedIcon,
    color: 'text-muted-foreground',
    label: 'expected',
  },
  NEUTRAL: {
    icon: MinusCircleIcon,
    color: 'text-muted-foreground',
    label: 'neutral',
  },
  CANCELLED: {
    icon: XCircleIcon,
    color: 'text-muted-foreground',
    label: 'cancelled',
  },
  SKIPPED: {
    icon: MinusCircleIcon,
    color: 'text-muted-foreground',
    label: 'skipped',
  },
  TIMED_OUT: {
    icon: AlertCircleIcon,
    color: 'text-amber-400',
    label: 'timed out',
  },
  ACTION_REQUIRED: {
    icon: AlertCircleIcon,
    color: 'text-amber-400',
    label: 'action required',
  },
  STARTUP_FAILURE: {
    icon: XCircleIcon,
    color: 'text-rose-400',
    label: 'startup failure',
  },
  NONE: {
    icon: CircleDashedIcon,
    color: 'text-muted-foreground',
    label: 'no checks',
  },
}

export function CheckPill({ state, className, label }: CheckPillProps) {
  const style = CHECK_STYLES[state ?? 'NONE'] ?? CHECK_STYLES.NONE
  const Icon = style.icon
  return (
    <Pill className={cn(style.color, className)}>
      <Icon
        className={cn(
          'size-3',
          state === 'PENDING' ? 'animate-spin [animation-duration:1.6s]' : '',
        )}
      />
      {label ?? style.label}
    </Pill>
  )
}

/* ------------------------------- Generic pill ------------------------------- */

function Pill({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 px-1.5 text-[10px] font-medium tracking-wide uppercase',
        className,
      )}
    >
      {children}
    </span>
  )
}
