import * as React from 'react'
import { FileTree, useFileTree } from '@pierre/trees/react'
import { ClientOnly } from '#/components/client-only'
import { cn } from '#/lib/utils'
import type { GhFileChange } from '#/lib/types'

interface FilesPanelProps {
  files: ReadonlyArray<GhFileChange>
}

/**
 * Two-part view:
 *   - a header summarising +/- across all files;
 *   - the actual files rendered as a real, expandable tree using
 *     `@pierre/trees`. The tree is browser-only (it builds a Shadow DOM
 *     subtree under the hood), so we keep it inside a ClientOnly boundary
 *     and ship a flat list as the SSR fallback.
 *
 * The flat list also serves users on machines without `crypto.subtle` /
 * Shadow DOM polyfills, so we never lose access to per-file stats.
 */
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
        <span className="text-emerald-500">+{totalAdds}</span>
        <span className="text-rose-500">-{totalDels}</span>
      </div>

      <ClientOnly fallback={<FlatFiles files={files} />}>
        <FileTreeContainer files={files} />
      </ClientOnly>
    </div>
  )
}

function FileTreeContainer({ files }: FilesPanelProps) {
  const paths = React.useMemo(() => files.map((f) => f.path), [files])
  const { model } = useFileTree({ paths, initialExpansion: 'open' })

  return (
    <FileTree
      model={model}
      className="max-h-[480px] overflow-auto px-1 py-2 text-xs"
    />
  )
}

/* SSR / no-JS fallback — same look-and-feel as the previous static panel. */
function FlatFiles({ files }: FilesPanelProps) {
  return (
    <ul className="divide-y divide-border/60">
      {files.map((f) => (
        <li
          key={f.path}
          className="flex items-center gap-2 px-3 py-1.5 text-xs"
        >
          <span
            aria-label={f.changeType.toLowerCase()}
            className={cn(
              'inline-block size-2 shrink-0 rounded-sm',
              f.changeType === 'ADDED' && 'bg-emerald-500',
              f.changeType === 'DELETED' && 'bg-rose-500',
              f.changeType === 'MODIFIED' && 'bg-foreground/40',
              f.changeType === 'RENAMED' && 'bg-amber-500',
              f.changeType === 'COPIED' && 'bg-amber-500',
              f.changeType === 'CHANGED' && 'bg-foreground/40',
              f.changeType === 'TYPE_CHANGED' && 'bg-amber-500',
            )}
          />
          <span className="flex-1 truncate font-mono">{f.path}</span>
          <span className="font-mono text-emerald-500">+{f.additions}</span>
          <span className="font-mono text-rose-500">-{f.deletions}</span>
        </li>
      ))}
    </ul>
  )
}
