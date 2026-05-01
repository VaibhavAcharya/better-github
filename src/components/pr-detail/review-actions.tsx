import {
  CheckIcon,
  MessageSquareIcon,
  ScrollIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Button } from '#/components/ui/button'

export type ReviewEvent = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'

interface ReviewActionsProps {
  body: string
  onBodyChange: (v: string) => void
  onSubmit: (event: ReviewEvent) => void
  disabled: boolean
}

/**
 * Collapsible review action panel — sits above the comment form on the PR
 * conversation tab. The body text is shared with all three review events
 * (approve / comment / request changes) since GitHub treats it as a single
 * "review summary" regardless of which button you click.
 */
export function ReviewActions({
  body,
  onBodyChange,
  onSubmit,
  disabled,
}: ReviewActionsProps) {
  return (
    <details className="border border-border bg-card">
      <summary className="flex cursor-pointer items-center justify-between border-b border-border bg-muted/30 px-3 py-2 text-xs">
        <span className="flex items-center gap-2">
          <ScrollIcon className="size-3" />
          submit a review
        </span>
        <span className="text-[10px] text-muted-foreground">expand</span>
      </summary>
      <div className="space-y-2 p-3">
        <textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="optional review summary"
          className="min-h-20 w-full border border-border bg-input/30 px-2 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
        />
        <div className="flex items-center justify-end gap-2">
          <Button
            size="xs"
            variant="ghost"
            disabled={disabled}
            onClick={() => onSubmit('COMMENT')}
          >
            <MessageSquareIcon /> comment
          </Button>
          <Button
            size="xs"
            variant="destructive"
            disabled={disabled}
            onClick={() => onSubmit('REQUEST_CHANGES')}
          >
            <TriangleAlertIcon /> request changes
          </Button>
          <Button
            size="xs"
            disabled={disabled}
            onClick={() => onSubmit('APPROVE')}
          >
            <CheckIcon /> approve
          </Button>
        </div>
      </div>
    </details>
  )
}
