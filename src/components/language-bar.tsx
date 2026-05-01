interface Language {
  name: string
  color: string | null
  size: number
}

interface LanguageBarProps {
  languages: ReadonlyArray<Language>
  /** Number of items to show in the legend (the bar itself shows all). */
  legendLimit?: number
}

/**
 * Repo language breakdown — one stacked bar plus a short legend. Uses each
 * language's GitHub-provided color so users get the same visual shorthand
 * they're used to. We don't try to match GitHub's exact ordering rules; the
 * caller is expected to pass languages already sorted by size (descending).
 */
export function LanguageBar({ languages, legendLimit = 6 }: LanguageBarProps) {
  const total = languages.reduce((s, l) => s + l.size, 0) || 1

  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-sm bg-muted">
        {languages.map((l) => (
          <span
            key={l.name}
            style={{
              width: `${(l.size / total) * 100}%`,
              backgroundColor: l.color ?? 'var(--muted-foreground)',
            }}
            title={`${l.name} ${((l.size / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <ul className="space-y-0.5">
        {languages.slice(0, legendLimit).map((l) => (
          <li key={l.name} className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <span
                className="size-2 rounded-sm"
                style={{
                  backgroundColor: l.color ?? 'var(--muted-foreground)',
                }}
              />
              {l.name}
            </span>
            <span className="font-mono text-muted-foreground">
              {((l.size / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
