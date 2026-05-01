/**
 * Formatting helpers used across the dashboard. Kept dependency-free so they
 * can run on the server too if we ever inline them into RSC payloads.
 */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/** Compact relative time (`5m`, `3h`, `2d`, `4w`, `1y`). */
export function relativeTime(input: string | number | Date): string {
  const ts =
    typeof input === 'string' || input instanceof Date
      ? new Date(input).getTime()
      : input
  const diff = Date.now() - ts
  const abs = Math.abs(diff)
  const sign = diff < 0 ? 'in ' : ''
  const suffix = diff < 0 ? '' : ''

  let value: string
  if (abs < MINUTE) value = `just now`
  else if (abs < HOUR) value = `${Math.floor(abs / MINUTE)}m`
  else if (abs < DAY) value = `${Math.floor(abs / HOUR)}h`
  else if (abs < WEEK) value = `${Math.floor(abs / DAY)}d`
  else if (abs < 30 * DAY) value = `${Math.floor(abs / WEEK)}w`
  else if (abs < 365 * DAY) value = `${Math.floor(abs / (30 * DAY))}mo`
  else value = `${Math.floor(abs / (365 * DAY))}y`

  if (value === 'just now') return value
  return diff < 0 ? `${sign}${value}` : `${value}${suffix}`
}

export function absoluteTime(input: string | number | Date): string {
  return new Date(input).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "1.2k", "12k", "1.4M" */
export function compactNumber(n: number): string {
  if (n < 1000) return String(n)
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`
  if (n < 1_000_000) return `${Math.floor(n / 1000)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

export function pluralize(
  n: number,
  singular: string,
  plural?: string,
): string {
  return n === 1 ? singular : (plural ?? `${singular}s`)
}

/** Notification reason → human label (matches GitHub's docs vocabulary). */
export function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    assign: 'assigned',
    author: 'authored',
    comment: 'commented',
    ci_activity: 'CI',
    invitation: 'invited',
    manual: 'subscribed',
    member_feature_requested: 'feature',
    mention: 'mentioned',
    push: 'pushed',
    review_requested: 'review',
    security_alert: 'security',
    state_change: 'state',
    subscribed: 'watching',
    team_mention: 'team mention',
    your_activity: 'you',
  }
  return map[reason] ?? reason.replaceAll('_', ' ')
}

/** Truncate long body text for cards / previews. */
export function truncate(input: string, max = 160): string {
  const trimmed = input.trim()
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max - 1).trimEnd() + '…'
}
