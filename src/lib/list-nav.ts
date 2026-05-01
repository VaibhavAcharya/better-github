import * as React from 'react'
import { useHotkey } from '#/lib/hotkeys'

/**
 * Tracks a focused index across an arbitrary list of items, with keyboard
 * navigation via j/k (and arrow keys). Designed to be glued onto any
 * scrollable list — the consumer renders the visual selection state via
 * `data-selected` or class toggles. Hotkeys go through the global
 * `useHotkey` registry so form inputs remain untouched.
 */

interface UseListNavOptions {
  count: number
  /** Called when the user presses Enter on the selected row. */
  onSelect?: (index: number) => void
  /** Called for `e` (mark read / archive) — caller decides semantics. */
  onSecondary?: (index: number) => void
  /** Disable navigation entirely. */
  disabled?: boolean
}

export function useListNav({
  count,
  onSelect,
  onSecondary,
  disabled,
}: UseListNavOptions) {
  const [index, setIndex] = React.useState(0)
  const containerRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (count === 0) {
      setIndex(-1)
    } else if (index >= count) {
      setIndex(count - 1)
    } else if (index < 0) {
      setIndex(0)
    }
  }, [count, index])

  const move = React.useCallback(
    (delta: number) => {
      if (disabled || count === 0) return
      setIndex((prev) => {
        const next = Math.max(0, Math.min(count - 1, prev + delta))
        // Best-effort scroll-into-view of the corresponding row (any element
        // tagged data-list-item={index} inside the container).
        const container = containerRef.current
        if (container) {
          const target = container.querySelector<HTMLElement>(
            `[data-list-item="${next}"]`,
          )
          target?.scrollIntoView({ block: 'nearest' })
        }
        return next
      })
    },
    [count, disabled],
  )

  useHotkey(
    {
      combo: 'j',
      group: 'Lists',
      description: 'Move selection down',
      handler: () => move(1),
    },
    [move],
  )
  useHotkey(
    {
      combo: 'k',
      group: 'Lists',
      description: 'Move selection up',
      handler: () => move(-1),
    },
    [move],
  )
  useHotkey(
    {
      combo: 'arrowdown',
      handler: () => move(1),
    },
    [move],
  )
  useHotkey(
    {
      combo: 'arrowup',
      handler: () => move(-1),
    },
    [move],
  )
  useHotkey(
    {
      combo: 'enter',
      group: 'Lists',
      description: 'Open selected item',
      handler: () => {
        if (disabled || index < 0 || index >= count) return
        onSelect?.(index)
      },
    },
    [index, count, disabled, onSelect],
  )
  useHotkey(
    {
      combo: 'e',
      group: 'Lists',
      description: 'Mark selected read',
      handler: () => {
        if (disabled || index < 0 || index >= count) return
        onSecondary?.(index)
      },
    },
    [index, count, disabled, onSecondary],
  )

  return { index, setIndex, containerRef }
}
