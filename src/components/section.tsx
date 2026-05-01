import * as React from 'react'
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '#/lib/utils'

interface SectionProps {
  icon?: LucideIcon
  title: string
  count?: number | null
  description?: string
  defaultOpen?: boolean
  children: React.ReactNode
  action?: React.ReactNode
  /** Persist collapsed state under this storage key. */
  storageKey?: string
  className?: string
}

/**
 * A collapsible labeled section used across dashboard / detail pages.
 * Persists its open/closed state to localStorage so the inbox layout is sticky
 * across reloads.
 */
export function Section({
  icon: Icon,
  title,
  count,
  description,
  defaultOpen = true,
  children,
  action,
  storageKey,
  className,
}: SectionProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const initialized = React.useRef(false)

  React.useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    if (!storageKey || typeof window === 'undefined') return
    try {
      const v = window.localStorage.getItem(
        `better-github:section:${storageKey}`,
      )
      if (v === '1') setOpen(true)
      else if (v === '0') setOpen(false)
    } catch {
      // ignore
    }
  }, [storageKey])

  React.useEffect(() => {
    if (!initialized.current || !storageKey || typeof window === 'undefined')
      return
    try {
      window.localStorage.setItem(
        `better-github:section:${storageKey}`,
        open ? '1' : '0',
      )
    } catch {
      // ignore
    }
  }, [open, storageKey])

  return (
    <section className={cn('border border-border bg-card', className)}>
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left text-xs font-medium text-foreground"
        >
          {open ? (
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="size-3.5 text-muted-foreground" />
          )}
          {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
          <span className="tracking-tight">{title}</span>
          {typeof count === 'number' ? (
            <span className="rounded-sm bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
              {count}
            </span>
          ) : null}
          {description ? (
            <span className="text-[10px] text-muted-foreground/70">
              {description}
            </span>
          ) : null}
        </button>
        {action ? (
          <div className="flex items-center gap-1">{action}</div>
        ) : null}
      </header>
      {open ? <div>{children}</div> : null}
    </section>
  )
}
