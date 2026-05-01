import * as React from 'react'
import { GitMergeIcon, XIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

export type MergeMethod = 'merge' | 'squash' | 'rebase'

interface MergeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Method preselected when the dialog opens. Reads from user settings. */
  defaultMethod: MergeMethod
  /** PR title — shown in the dialog description. */
  title: string
  /** PR number — shown in the dialog title. */
  number: number
  busy: boolean
  onConfirm: (method: MergeMethod) => void
}

/**
 * The merge confirmation dialog for PR detail. Owns its own method state so
 * cancelling-and-reopening starts from the user's default again.
 */
export function MergeDialog({
  open,
  onOpenChange,
  defaultMethod,
  title,
  number,
  busy,
  onConfirm,
}: MergeDialogProps) {
  const [method, setMethod] = React.useState<MergeMethod>(defaultMethod)

  React.useEffect(() => {
    if (open) setMethod(defaultMethod)
  }, [open, defaultMethod])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>merge #{number}</DialogTitle>
          <DialogDescription className="truncate">{title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs">
            <span className="w-24 text-muted-foreground">method</span>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as MergeMethod)}
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="squash">squash</SelectItem>
                <SelectItem value="merge">merge commit</SelectItem>
                <SelectItem value="rebase">rebase</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        <DialogFooter>
          <Button
            size="xs"
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            <XIcon /> cancel
          </Button>
          <Button size="xs" disabled={busy} onClick={() => onConfirm(method)}>
            <GitMergeIcon /> merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
