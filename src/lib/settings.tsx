import * as React from 'react'

/**
 * Local-first settings stored in localStorage. The whole point of better-github
 * is that nothing leaves your machine — your preferences shouldn't either.
 */
export interface Settings {
  /** Auto-refresh interval in seconds. 0 = disabled. */
  refreshIntervalSec: number
  /** Compact rows = denser PR/issue cards. */
  density: 'compact' | 'comfortable'
  /** Repos used to scope the inbox; empty = all. */
  inboxRepos: ReadonlyArray<string>
  /** Default merge method on PR detail. */
  defaultMergeMethod: 'merge' | 'squash' | 'rebase'
  /** Hide PRs/issues authored by these users (eg. bots). */
  hiddenAuthors: ReadonlyArray<string>
  /** Open external GitHub links in a new tab (default true). */
  externalLinksNewTab: boolean
  /** Show diff stats inline on cards. */
  showDiffStats: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  refreshIntervalSec: 60,
  density: 'compact',
  inboxRepos: [],
  defaultMergeMethod: 'squash',
  hiddenAuthors: [],
  externalLinksNewTab: true,
  showDiffStats: true,
}

const STORAGE_KEY = 'better-github:settings:v1'

function readStored(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function writeStored(value: Settings) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // localStorage unavailable / quota — settings simply won't persist.
  }
}

interface SettingsContextValue {
  settings: Settings
  set: <TKey extends keyof Settings>(key: TKey, value: Settings[TKey]) => void
  reset: () => void
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // SSR renders defaults; client rehydrates after mount to avoid hydration mismatch.
  const [settings, setSettings] = React.useState<Settings>(DEFAULT_SETTINGS)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    setSettings(readStored())
    setHydrated(true)
  }, [])

  const set = React.useCallback(
    <TKey extends keyof Settings>(key: TKey, value: Settings[TKey]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value }
        writeStored(next)
        return next
      })
    },
    [],
  )

  const reset = React.useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    writeStored(DEFAULT_SETTINGS)
  }, [])

  const value = React.useMemo(
    () => ({ settings: hydrated ? settings : DEFAULT_SETTINGS, set, reset }),
    [settings, hydrated, set, reset],
  )

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = React.useContext(SettingsContext)
  if (!ctx)
    throw new Error('useSettings must be used within <SettingsProvider>')
  return ctx
}
