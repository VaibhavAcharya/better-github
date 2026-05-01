import * as React from 'react'
import { cn } from '#/lib/utils'
import type { GhLabel } from '#/lib/types'

/**
 * GitHub-style label chip. We use the API-provided color as a thin accent
 * border so labels stay readable in our minimal monochrome palette.
 */
interface LabelTagProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  'color'
> {
  label: GhLabel
}

export function LabelTag({ label, className, style, ...rest }: LabelTagProps) {
  const color = label.color ? `#${label.color}` : 'var(--muted-foreground)'
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 border px-1.5 text-[10px] tracking-tight whitespace-nowrap',
        className,
      )}
      style={{
        borderColor: `color-mix(in oklab, ${color} 60%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
        color: `color-mix(in oklab, ${color} 70%, var(--foreground) 30%)`,
        ...style,
      }}
      {...rest}
    >
      {label.name}
    </span>
  )
}

interface LabelListProps {
  labels: ReadonlyArray<GhLabel>
  max?: number
  className?: string
}

export function LabelList({ labels, max = 3, className }: LabelListProps) {
  if (labels.length === 0) return null
  const visible = labels.slice(0, max)
  const overflow = labels.length - visible.length

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {visible.map((l) => (
        <LabelTag key={l.name} label={l} />
      ))}
      {overflow > 0 ? (
        <span className="text-[10px] text-muted-foreground">+{overflow}</span>
      ) : null}
    </span>
  )
}
