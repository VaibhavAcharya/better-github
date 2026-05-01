import * as React from 'react'

interface ClientOnlyProps {
  /** Rendered on server and during the first client paint. */
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Render `children` only after the component has hydrated on the client.
 *
 * `@pierre/diffs` and `@pierre/trees` reach for `window`, Shadow DOM, and
 * (optionally) Web Workers — none of which exist during TanStack Start's
 * SSR pass. Anything that wraps those libraries should sit inside this
 * boundary so SSR keeps producing stable HTML and the heavy renderer only
 * runs once we're in the browser.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])
  return <>{mounted ? children : fallback}</>
}
