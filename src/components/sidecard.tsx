import * as React from 'react'
import { cn } from '#/lib/utils'

interface SidecardProps {
  /** Small all-caps label rendered above the body. */
  label: string
  /** Body content; use the `<dl>`-style helpers below for tabular metadata. */
  children: React.ReactNode
  className?: string
}

/**
 * Right-rail metadata panel used on PR / issue / repo detail pages. Kept
 * minimal — a label, then whatever children you want — so the same shell
 * can carry plain prose, lists of users, language bars, etc.
 */
export function Sidecard({ label, children, className }: SidecardProps) {
  return (
    <section className={cn('border border-border bg-card p-3', className)}>
      <p className="mb-2 text-[10px] tracking-wider uppercase text-muted-foreground">
        {label}
      </p>
      {children}
    </section>
  )
}

interface SidecardStatProps {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
}

/** A label / value row commonly nested inside a Sidecard's body. */
export function SidecardStat({ icon, label, value }: SidecardStatProps) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-mono">{value}</span>
    </li>
  )
}
