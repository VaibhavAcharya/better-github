import { FilePlusIcon, FileXIcon, PencilIcon, RouteIcon } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { GhFileChange } from '#/lib/types'

interface FilesPanelProps {
  files: ReadonlyArray<GhFileChange>
}

export function FilesPanel({ files }: FilesPanelProps) {
  if (files.length === 0) {
    return (
      <div className="px-3 py-3 text-xs text-muted-foreground">
        no files reported
      </div>
    )
  }

  const totalAdds = files.reduce((s, f) => s + f.additions, 0)
  const totalDels = files.reduce((s, f) => s + f.deletions, 0)

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        <span>
          <span className="text-foreground">{files.length}</span> files
        </span>
        <span className="text-foreground">+{totalAdds}</span>
        <span className="text-destructive">-{totalDels}</span>
      </div>
      <ul className="divide-y divide-border/60">
        {files.map((f) => (
          <li
            key={f.path}
            className="flex items-center gap-2 px-3 py-1.5 text-xs"
          >
            <ChangeTypeIcon type={f.changeType} />
            <span className="flex-1 truncate font-mono">{f.path}</span>
            <span className="font-mono text-foreground">+{f.additions}</span>
            <span className="font-mono text-destructive">-{f.deletions}</span>
            <BarStat additions={f.additions} deletions={f.deletions} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChangeTypeIcon({ type }: { type: GhFileChange['changeType'] }) {
  if (type === 'ADDED')
    return (
      <FilePlusIcon className="size-3 text-foreground" aria-label="added" />
    )
  if (type === 'DELETED')
    return (
      <FileXIcon className="size-3 text-destructive" aria-label="deleted" />
    )
  if (type === 'RENAMED' || type === 'COPIED')
    return (
      <RouteIcon
        className="size-3 text-muted-foreground"
        aria-label={type.toLowerCase()}
      />
    )
  return (
    <PencilIcon
      className="size-3 text-muted-foreground"
      aria-label="modified"
    />
  )
}

function BarStat({
  additions,
  deletions,
}: {
  additions: number
  deletions: number
}) {
  const total = Math.max(1, additions + deletions)
  const adds = Math.round((additions / total) * 5)
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-2 w-1.5',
            i < adds ? 'bg-foreground/70' : 'bg-destructive/60',
            additions === 0 && deletions === 0 && 'bg-muted',
          )}
          aria-hidden
        />
      ))}
    </span>
  )
}
