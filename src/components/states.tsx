import * as React from 'react'
import { AlertTriangleIcon, InboxIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'
import { GhError } from '#/server/gh'
import type { GhErrorCode } from '#/server/gh'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 border border-dashed border-border/70 px-6 py-12 text-center',
        className,
      )}
    >
      <Icon className="size-6 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">{title}</p>
        {description ? (
          <p className="max-w-sm text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  className?: string
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const { code, message, hint } = describeError(error)
  return (
    <div
      className={cn(
        'space-y-3 border border-destructive/40 bg-destructive/5 px-4 py-4 text-xs',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">
            {titleFor(code)}
          </p>
          <p className="text-xs text-muted-foreground">{message}</p>
          {hint ? (
            <p className="font-mono text-[11px] text-muted-foreground/90">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
      {onRetry ? (
        <div>
          <Button size="xs" variant="outline" onClick={onRetry}>
            retry
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function describeError(err: unknown): {
  code: GhErrorCode | 'js'
  message: string
  hint: string | null
} {
  if (err instanceof GhError) {
    return { code: err.code, message: err.message, hint: err.hint }
  }
  if (err instanceof Error) {
    return { code: 'js', message: err.message, hint: null }
  }
  return { code: 'js', message: 'An unexpected error occurred', hint: null }
}

function titleFor(code: GhErrorCode | 'js'): string {
  switch (code) {
    case 'not-installed':
      return 'GitHub CLI not installed'
    case 'not-authed':
      return 'GitHub CLI not authenticated'
    case 'rate-limited':
      return 'GitHub API rate limit exceeded'
    case 'network':
      return 'Cannot reach GitHub'
    case 'not-found':
      return 'Not found'
    case 'forbidden':
      return 'Forbidden'
    case 'timed-out':
      return 'Request timed out'
    case 'parse':
      return 'Unexpected response'
    case 'unknown':
    case 'js':
      return 'Something went wrong'
  }
}

export function ListSkeleton({
  rows = 4,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-none" />
      ))}
    </div>
  )
}
