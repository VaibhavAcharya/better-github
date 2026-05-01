import * as React from 'react'
import { cn } from '#/lib/utils'

/**
 * Keyboard shortcut badge. Designed to read well at small sizes — uppercase
 * caps with subtle borders. Pass key labels as children (eg. "G", "I").
 */
export function Kbd({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-muted/40 px-1 font-mono text-[10px] font-medium tracking-tight text-muted-foreground uppercase',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}

interface KbdGroupProps extends React.HTMLAttributes<HTMLSpanElement> {
  keys: ReadonlyArray<string>
  /** Use "+" for chord, "then" for sequence. */
  separator?: '+' | 'then'
}

export function KbdGroup({
  keys,
  separator = '+',
  className,
  ...rest
}: KbdGroupProps) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} {...rest}>
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span className="text-[10px] text-muted-foreground/70">
              {separator === 'then' ? 'then' : '+'}
            </span>
          )}
          <Kbd>{k}</Kbd>
        </React.Fragment>
      ))}
    </span>
  )
}
