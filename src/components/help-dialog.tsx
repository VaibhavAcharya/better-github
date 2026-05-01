import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Kbd } from '#/components/kbd'

interface HelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ShortcutDef {
  group: string
  combo: string
  description: string
}

const SHORTCUTS: ReadonlyArray<ShortcutDef> = [
  { group: 'Global', combo: 'mod+k', description: 'Open command palette' },
  { group: 'Global', combo: '/', description: 'Open command palette' },
  { group: 'Global', combo: '?', description: 'Show keyboard shortcuts' },
  { group: 'Global', combo: 'r', description: 'Refresh current page' },
  { group: 'Navigate', combo: 'g i', description: 'Go to inbox' },
  { group: 'Navigate', combo: 'g n', description: 'Go to notifications' },
  { group: 'Navigate', combo: 'g p', description: 'Go to pull requests' },
  { group: 'Navigate', combo: 'g s', description: 'Go to issues' },
  { group: 'Navigate', combo: 'g r', description: 'Go to repositories' },
  { group: 'Lists', combo: 'j', description: 'Move selection down' },
  { group: 'Lists', combo: 'k', description: 'Move selection up' },
  { group: 'Lists', combo: 'enter', description: 'Open selected item' },
  { group: 'Lists', combo: 'e', description: 'Mark item read' },
  { group: 'Lists', combo: 'x', description: 'Mark item done' },
]

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const grouped = React.useMemo(() => {
    const map = new Map<string, Array<ShortcutDef>>()
    for (const s of SHORTCUTS) {
      const arr = map.get(s.group) ?? []
      arr.push(s)
      map.set(s.group, arr)
    }
    return map
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>keyboard shortcuts</DialogTitle>
          <DialogDescription>
            press the matching keys anywhere in the dashboard
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
          {Array.from(grouped.entries()).map(([group, items]) => (
            <div key={group} className="space-y-1">
              <p className="text-[10px] tracking-wider uppercase text-muted-foreground">
                {group}
              </p>
              <ul className="space-y-1">
                {items.map((s) => (
                  <li
                    key={`${s.group}-${s.combo}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <span>{s.description}</span>
                    <span className="flex items-center gap-1">
                      {s.combo.split(/\s+|\+/).map((k, i) => (
                        <Kbd key={`${s.combo}-${i}`}>
                          {k === 'mod' ? '⌘' : k}
                        </Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
