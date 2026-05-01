import * as React from 'react'
import { ExternalLinkIcon } from 'lucide-react'
import { CheckPill } from '#/components/status-pill'
import { cn } from '#/lib/utils'
import type { GhCheckRun } from '#/lib/types'

interface ChecksPanelProps {
  checks: ReadonlyArray<GhCheckRun>
}

export function ChecksPanel({ checks }: ChecksPanelProps) {
  const summary = React.useMemo(() => {
    const counts = { passing: 0, failing: 0, pending: 0, neutral: 0 }
    for (const c of checks) {
      const s = c.conclusion ?? 'PENDING'
      if (s === 'SUCCESS') counts.passing++
      else if (s === 'FAILURE' || s === 'ERROR' || s === 'STARTUP_FAILURE')
        counts.failing++
      else if (s === 'PENDING') counts.pending++
      else counts.neutral++
    }
    return counts
  }, [checks])

  if (checks.length === 0) {
    return (
      <div className="px-3 py-3 text-xs text-muted-foreground">
        no checks reported
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        <span>
          <span className="text-foreground">{summary.passing}</span> passing
        </span>
        <span>
          <span className="text-destructive">{summary.failing}</span> failing
        </span>
        <span>
          <span className="text-foreground">{summary.pending}</span> running
        </span>
        {summary.neutral ? (
          <span>
            <span className="text-muted-foreground">{summary.neutral}</span>{' '}
            other
          </span>
        ) : null}
      </div>
      <ul className="divide-y divide-border/60">
        {checks.map((c, i) => (
          <li
            key={`${c.name}-${i}`}
            className={cn(
              'flex items-center gap-3 px-3 py-1.5 text-xs',
              'hover:bg-muted/40',
            )}
          >
            <CheckPill state={c.conclusion ?? 'PENDING'} />
            <span className="flex-1 truncate font-mono">{c.name}</span>
            {c.durationMs !== null ? (
              <span className="text-[11px] text-muted-foreground">
                {formatDuration(c.durationMs)}
              </span>
            ) : null}
            {c.detailsUrl ? (
              <a
                href={c.detailsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-muted-foreground hover:text-foreground"
                aria-label="open check"
              >
                <ExternalLinkIcon className="size-3" />
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m}m ${r}s` : `${m}m`
}
