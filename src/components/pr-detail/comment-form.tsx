import * as React from 'react'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'

interface CommentFormProps {
  placeholder?: string
  busy?: boolean
  submitLabel?: string
  /** Optional secondary action (eg. "Close" alongside "Comment"). */
  secondary?: { label: string; busy?: boolean; onClick: (body: string) => void }
  onSubmit: (body: string) => void
  /** Useful when the same form must reset after a successful action. */
  resetSignal?: number
}

export function CommentForm({
  placeholder = 'leave a comment',
  busy,
  submitLabel = 'comment',
  secondary,
  onSubmit,
  resetSignal,
}: CommentFormProps) {
  const [body, setBody] = React.useState('')
  const ref = React.useRef<HTMLTextAreaElement | null>(null)

  React.useEffect(() => {
    if (resetSignal !== undefined) setBody('')
  }, [resetSignal])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (body.trim()) {
        e.preventDefault()
        onSubmit(body.trim())
      }
    }
  }

  return (
    <div className="border border-border bg-card">
      <Textarea
        ref={ref}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-24 rounded-none border-0 focus-visible:ring-0"
      />
      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-2 py-1.5">
        <p className="text-[10px] text-muted-foreground">
          ⌘+enter submits · markdown is rendered on github
        </p>
        <div className="flex items-center gap-2">
          {secondary ? (
            <Button
              size="xs"
              variant="outline"
              disabled={!!secondary.busy}
              onClick={() => secondary.onClick(body.trim())}
            >
              {secondary.label}
            </Button>
          ) : null}
          <Button
            size="xs"
            disabled={busy || !body.trim()}
            onClick={() => onSubmit(body.trim())}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
