import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'
import { cn } from '#/lib/utils'

interface Crumb {
  label: string
  to?: string
  params?: Record<string, string>
}

interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  crumbs?: ReadonlyArray<Crumb>
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  crumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'border-b border-border bg-background/60 px-4 py-3 backdrop-blur',
        className,
      )}
    >
      {crumbs?.length ? (
        <nav className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          {crumbs.map((c, i) => (
            <React.Fragment key={`${c.label}-${i}`}>
              {i > 0 ? <ChevronRightIcon className="size-3" /> : null}
              {c.to ? (
                <Link
                  to={c.to}
                  params={c.params}
                  className="hover:text-foreground"
                >
                  {c.label}
                </Link>
              ) : (
                <span>{c.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-base font-medium tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  )
}
