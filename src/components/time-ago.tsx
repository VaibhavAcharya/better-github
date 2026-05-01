import * as React from 'react'
import { absoluteTime, relativeTime } from '#/lib/format'
import { cn } from '#/lib/utils'

interface TimeAgoProps extends Omit<
  React.HTMLAttributes<HTMLTimeElement>,
  'title'
> {
  value: string | number | Date
  /** Refresh interval in ms. Defaults to 60s. 0 disables refresh. */
  intervalMs?: number
}

/**
 * Self-refreshing relative time. The native title attribute carries the
 * absolute timestamp so users can hover for the precise value.
 */
export function TimeAgo({
  value,
  className,
  intervalMs = 60_000,
  ...rest
}: TimeAgoProps) {
  const [, force] = React.useReducer((x: number) => x + 1, 0)

  React.useEffect(() => {
    if (!intervalMs) return undefined
    const id = window.setInterval(force, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  const iso =
    value instanceof Date
      ? value.toISOString()
      : typeof value === 'number'
        ? new Date(value).toISOString()
        : value

  return (
    <time
      dateTime={iso}
      title={absoluteTime(value)}
      className={cn('tabular-nums', className)}
      {...rest}
    >
      {relativeTime(value)}
    </time>
  )
}
