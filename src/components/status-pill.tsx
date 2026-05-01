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

/**
 * Status pills are one of the only spots where we let color sneak in — and
 * we still keep it muted (500-shade, not 400). Everything outside this file
 * stays inside the project's `--foreground` / `--muted-foreground` /
 * `--destructive` palette so the chrome doesn't look like a christmas tree.
 *
 * Tones:
 *   - `ok`     subtle green (success, open, merged)
 *   - `bad`    subtle red (closed, failure, conflict)
 *   - `pending` subtle amber (in-progress checks)
 *   - `muted`  no color (drafts, neutral, expected)
 *
 * Bracket notation (`[open]`, `[passing]`) matches the original landing page.
 */

type Tone = 'ok' | 'bad' | 'pending' | 'muted'

const TONE_CLASS: Record<Tone, string> = {
  ok: 'text-emerald-500',
  bad: 'text-rose-500',
  pending: 'text-amber-500',
  muted: 'text-muted-foreground',
}

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
      <Pill
        tone="muted"
        label="draft"
        showLabel={showLabel}
        className={className}
      >
        <GitPullRequestDraftIcon className="size-3" />
      </Pill>
    )
  }
  if (state === 'MERGED')
    return (
      <Pill
        tone="ok"
        label="merged"
        showLabel={showLabel}
        className={className}
      >
        <GitMergeIcon className="size-3" />
      </Pill>
    )
  if (state === 'CLOSED')
    return (
      <Pill
        tone="bad"
        label="closed"
        showLabel={showLabel}
        className={className}
      >
        <GitPullRequestClosedIcon className="size-3" />
      </Pill>
    )
  return (
    <Pill tone="ok" label="open" showLabel={showLabel} className={className}>
      <GitPullRequestIcon className="size-3" />
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
      <Pill
        tone="ok"
        label="closed"
        showLabel={showLabel}
        className={className}
      >
        <CheckCircle2Icon className="size-3" />
      </Pill>
    )
  return (
    <Pill tone="ok" label="open" showLabel={showLabel} className={className}>
      <CircleDotIcon className="size-3" />
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
    tone: Tone
    label: string
  }
> = {
  SUCCESS: { icon: CheckCircle2Icon, tone: 'ok', label: 'passing' },
  FAILURE: { icon: XCircleIcon, tone: 'bad', label: 'failing' },
  ERROR: { icon: AlertCircleIcon, tone: 'bad', label: 'error' },
  PENDING: { icon: LoaderIcon, tone: 'pending', label: 'pending' },
  EXPECTED: { icon: CircleDashedIcon, tone: 'muted', label: 'expected' },
  NEUTRAL: { icon: MinusCircleIcon, tone: 'muted', label: 'neutral' },
  CANCELLED: { icon: XCircleIcon, tone: 'muted', label: 'cancelled' },
  SKIPPED: { icon: MinusCircleIcon, tone: 'muted', label: 'skipped' },
  TIMED_OUT: { icon: AlertCircleIcon, tone: 'pending', label: 'timed out' },
  ACTION_REQUIRED: {
    icon: AlertCircleIcon,
    tone: 'pending',
    label: 'action required',
  },
  STARTUP_FAILURE: { icon: XCircleIcon, tone: 'bad', label: 'startup failure' },
  NONE: { icon: CircleDashedIcon, tone: 'muted', label: 'no checks' },
}

export function CheckPill({ state, className, label }: CheckPillProps) {
  const style = CHECK_STYLES[state ?? 'NONE'] ?? CHECK_STYLES.NONE
  const Icon = style.icon
  return (
    <Pill
      tone={style.tone}
      label={label ?? style.label}
      showLabel={true}
      className={className}
    >
      <Icon
        className={cn(
          'size-3',
          state === 'PENDING' ? 'animate-spin [animation-duration:1.6s]' : '',
        )}
      />
    </Pill>
  )
}

/* ------------------------------- Generic pill ------------------------------- */

function Pill({
  children,
  className,
  tone,
  label,
  showLabel,
}: {
  children: React.ReactNode
  className?: string
  tone: Tone
  label: string
  showLabel: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 px-1 text-[10px] tracking-tight',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
      {showLabel ? (
        <span>
          <span className="text-muted-foreground/70">[</span>
          {label}
          <span className="text-muted-foreground/70">]</span>
        </span>
      ) : null}
    </span>
  )
}
