import * as React from 'react'

/**
 * Tiny global hotkey registry. Keeping this in-house (rather than bringing in
 * react-hotkeys-hook) means we get exactly the semantics we want — including
 * `g i`-style sequences without library config gymnastics.
 *
 * Bindings are matched in registration order. Inputs / textareas / contentEditable
 * elements are skipped automatically so typing `?` in a search box doesn't open
 * the help dialog.
 */

type Modifier = 'meta' | 'ctrl' | 'alt' | 'shift' | 'mod'

export interface Hotkey {
  /**
   * A single key (eg "k") or a sequence (eg "g i"). Modifiers can be combined
   * with "+" — "mod+k" matches Cmd+K on macOS and Ctrl+K elsewhere.
   */
  combo: string
  /** Display label for help/UI; defaults to combo. */
  label?: string
  /** Free-text description shown in the help dialog. */
  description?: string
  /** Group label for the help dialog. */
  group?: string
  handler: (event: KeyboardEvent) => void
  /** Run even when focus is in an input. Default false. */
  allowInInput?: boolean
}

interface HotkeyContextValue {
  register: (key: Hotkey) => () => void
  hotkeys: ReadonlyArray<Hotkey>
}

const HotkeyContext = React.createContext<HotkeyContextValue | null>(null)

const SEQUENCE_TIMEOUT_MS = 1500

export function HotkeyProvider({ children }: { children: React.ReactNode }) {
  const hotkeysRef = React.useRef<Array<Hotkey>>([])
  const [version, setVersion] = React.useState(0)
  const sequenceRef = React.useRef<{ buf: string; timer: number | null }>({
    buf: '',
    timer: null,
  })

  const register = React.useCallback((key: Hotkey) => {
    hotkeysRef.current.push(key)
    setVersion((v) => v + 1)
    return () => {
      hotkeysRef.current = hotkeysRef.current.filter((h) => h !== key)
      setVersion((v) => v + 1)
    }
  }, [])

  React.useEffect(() => {
    function shouldSkip(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (!t) return false
      const tag = t.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        t.isContentEditable
      ) {
        return true
      }
      return false
    }

    function handleKey(e: KeyboardEvent) {
      // Ignore repeated keydowns from holding a key; we only want discrete presses.
      if (e.repeat) return

      const inInput = shouldSkip(e)
      const key = e.key
      const isMac =
        typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

      // Try chord matches first (mod+k, etc).
      for (const hk of hotkeysRef.current) {
        if (hk.combo.includes(' ')) continue
        if (!hk.allowInInput && inInput) continue
        if (matchesChord(hk.combo, e, isMac)) {
          e.preventDefault()
          hk.handler(e)
          return
        }
      }

      // Bare modifier presses don't contribute to sequences.
      if (
        key === 'Shift' ||
        key === 'Meta' ||
        key === 'Control' ||
        key === 'Alt'
      )
        return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const seq = sequenceRef.current
      if (seq.timer) window.clearTimeout(seq.timer)
      const next = (seq.buf + ' ' + key.toLowerCase()).trim()
      seq.buf = next
      seq.timer = window.setTimeout(() => {
        seq.buf = ''
        seq.timer = null
      }, SEQUENCE_TIMEOUT_MS)

      for (const hk of hotkeysRef.current) {
        if (!hk.combo.includes(' ')) continue
        if (!hk.allowInInput && inInput) continue
        if (next.endsWith(hk.combo)) {
          e.preventDefault()
          hk.handler(e)
          seq.buf = ''
          if (seq.timer) {
            window.clearTimeout(seq.timer)
            seq.timer = null
          }
          return
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const value = React.useMemo<HotkeyContextValue>(
    () => ({ register, hotkeys: hotkeysRef.current.slice() }),
    [register, version],
  )

  return (
    <HotkeyContext.Provider value={value}>{children}</HotkeyContext.Provider>
  )
}

function matchesChord(
  combo: string,
  e: KeyboardEvent,
  isMac: boolean,
): boolean {
  const parts = combo.toLowerCase().split('+')
  const key = parts.pop() ?? ''
  const mods = new Set<Modifier>(parts as Array<Modifier>)

  if (mods.has('mod')) {
    mods.delete('mod')
    if (isMac) mods.add('meta')
    else mods.add('ctrl')
  }

  if (mods.has('meta') !== e.metaKey) return false
  if (mods.has('ctrl') !== e.ctrlKey) return false
  if (mods.has('alt') !== e.altKey) return false
  if (mods.has('shift') && !e.shiftKey) return false
  if (
    !mods.has('shift') &&
    e.shiftKey &&
    key.length === 1 &&
    /[a-z0-9]/.test(key)
  ) {
    return false
  }
  return e.key.toLowerCase() === key
}

export function useHotkey(opts: Hotkey, deps: ReadonlyArray<unknown> = []) {
  const ctx = React.useContext(HotkeyContext)
  if (!ctx) throw new Error('useHotkey must be used inside <HotkeyProvider>')
  const stable = React.useRef(opts)
  stable.current = opts

  React.useEffect(() => {
    return ctx.register({
      combo: opts.combo,
      label: opts.label,
      description: opts.description,
      group: opts.group,
      allowInInput: opts.allowInInput,
      handler: (e) => stable.current.handler(e),
    })
  }, [opts.combo, ctx, ...deps])
}

export function useHotkeyList() {
  const ctx = React.useContext(HotkeyContext)
  if (!ctx)
    throw new Error('useHotkeyList must be used inside <HotkeyProvider>')
  return ctx.hotkeys
}
