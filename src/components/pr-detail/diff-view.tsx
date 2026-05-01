import * as React from 'react'
import { cn } from '#/lib/utils'

interface DiffViewProps {
  diff: string
}

interface Hunk {
  file: string
  fromFile: string | null
  lines: ReadonlyArray<{
    kind: 'context' | 'add' | 'remove' | 'meta'
    text: string
  }>
}

/**
 * Plain-text unified diff renderer. Doesn't try to be a Monaco / shiki — keeps
 * the bundle tiny while still being readable. Per-file expand/collapse cuts
 * down on noise from huge diffs.
 */
export function DiffView({ diff }: DiffViewProps) {
  const hunks = React.useMemo(() => parseDiff(diff), [diff])

  if (hunks.length === 0) {
    return (
      <div className="px-3 py-3 text-xs text-muted-foreground">
        no diff content available
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {hunks.map((hunk, i) => (
        <DiffFile key={`${hunk.file}-${i}`} hunk={hunk} />
      ))}
    </div>
  )
}

function DiffFile({ hunk }: { hunk: Hunk }) {
  const [open, setOpen] = React.useState(true)
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="border border-border bg-card"
    >
      <summary className="flex cursor-pointer items-center gap-2 border-b border-border bg-muted/30 px-3 py-1.5 text-[11px]">
        <span className="font-mono">{hunk.file}</span>
        {hunk.fromFile && hunk.fromFile !== hunk.file ? (
          <span className="text-muted-foreground">(from {hunk.fromFile})</span>
        ) : null}
        <span className="ml-auto text-muted-foreground">
          {countLines(hunk)}
        </span>
      </summary>
      <pre className="overflow-x-auto py-1 text-[11px] leading-relaxed">
        {hunk.lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-2 px-3 whitespace-pre',
              line.kind === 'add' && 'bg-emerald-500/10 text-emerald-300',
              line.kind === 'remove' && 'bg-rose-500/10 text-rose-300',
              line.kind === 'meta' && 'text-muted-foreground',
            )}
          >
            <span className="w-3 shrink-0">
              {line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' '}
            </span>
            <span className="min-w-0">{line.text}</span>
          </div>
        ))}
      </pre>
    </details>
  )
}

function countLines(hunk: Hunk): string {
  const adds = hunk.lines.filter((l) => l.kind === 'add').length
  const dels = hunk.lines.filter((l) => l.kind === 'remove').length
  return `+${adds} -${dels}`
}

function parseDiff(diff: string): ReadonlyArray<Hunk> {
  if (!diff) return []
  const out: Array<Hunk> = []
  const lines = diff.split('\n')
  let current: Hunk | null = null

  const fromHeader = (line: string) => /^---\s+(?:a\/)?(.+)$/.exec(line)?.[1]
  const toHeader = (line: string) => /^\+\+\+\s+(?:b\/)?(.+)$/.exec(line)?.[1]

  for (const rawLine of lines) {
    const line = rawLine
    if (line.startsWith('diff --git ')) {
      // boundary; the actual file names will come on --- / +++ lines
      const m = /^diff --git a\/(.+?) b\/(.+)$/.exec(line)
      const file = m?.[2] ?? line
      const fromFile = m?.[1] ?? null
      current = { file, fromFile, lines: [] }
      out.push(current)
      ;(current.lines as Array<{ kind: 'meta'; text: string }>).push({
        kind: 'meta',
        text: line,
      })
      continue
    }
    if (!current) {
      const fromMatch = fromHeader(line)
      const toMatch = toHeader(line)
      if (fromMatch || toMatch) {
        current = {
          file: toMatch ?? fromMatch ?? 'unknown',
          fromFile: fromMatch ?? null,
          lines: [],
        }
        out.push(current)
        ;(current.lines as Array<{ kind: 'meta'; text: string }>).push({
          kind: 'meta',
          text: line,
        })
        continue
      }
      // skip non-diff preamble
      continue
    }

    if (line.startsWith('+++ ')) {
      const file = toHeader(line)
      if (file) current.file = file
      ;(current.lines as Array<{ kind: 'meta'; text: string }>).push({
        kind: 'meta',
        text: line,
      })
      continue
    }
    if (line.startsWith('--- ')) {
      const file = fromHeader(line)
      if (file && !current.fromFile) current.fromFile = file
      ;(current.lines as Array<{ kind: 'meta'; text: string }>).push({
        kind: 'meta',
        text: line,
      })
      continue
    }
    if (line.startsWith('@@')) {
      ;(current.lines as Array<{ kind: 'meta'; text: string }>).push({
        kind: 'meta',
        text: line,
      })
      continue
    }
    if (line.startsWith('+')) {
      ;(current.lines as Array<{ kind: 'add'; text: string }>).push({
        kind: 'add',
        text: line.slice(1),
      })
      continue
    }
    if (line.startsWith('-')) {
      ;(current.lines as Array<{ kind: 'remove'; text: string }>).push({
        kind: 'remove',
        text: line.slice(1),
      })
      continue
    }
    if (line.startsWith('\\')) {
      // "\ No newline at end of file"
      continue
    }
    ;(current.lines as Array<{ kind: 'context'; text: string }>).push({
      kind: 'context',
      text: line.startsWith(' ') ? line.slice(1) : line,
    })
  }
  return out
}
