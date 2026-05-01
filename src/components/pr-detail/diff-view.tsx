import { PatchDiff } from '@pierre/diffs/react'
import { ClientOnly } from '#/components/client-only'
import { ListSkeleton } from '#/components/states'
import { cn } from '#/lib/utils'

interface DiffViewProps {
  diff: string
  className?: string
}

/**
 * Renders a unified diff using `@pierre/diffs/react`'s `PatchDiff`. We disable
 * the worker pool because TanStack Start's bundler doesn't ship a worker
 * entry by default, and synchronous Shiki rendering is plenty fast for the
 * single-PR diffs we deal with here.
 *
 * The component is browser-only — it touches Shadow DOM and CSS Grid layout
 * APIs that don't exist on the server — so we render a skeleton during SSR
 * and the first paint, then swap in the real component once mounted.
 */
export function DiffView({ diff, className }: DiffViewProps) {
  return (
    <div className={cn('rounded-none border border-border bg-card', className)}>
      <ClientOnly fallback={<ListSkeleton rows={6} className="p-3" />}>
        {diff.trim() ? (
          <PatchDiff
            patch={diff}
            disableWorkerPool
            className="text-[11px] [&_pre]:font-mono"
          />
        ) : (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            no diff content available
          </p>
        )}
      </ClientOnly>
    </div>
  )
}
