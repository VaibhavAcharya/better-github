import { TerminalIcon } from 'lucide-react'
import { useAuthStatus } from '#/lib/queries'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'

/**
 * Shown above the main content whenever `gh` is missing or not authed. We
 * never silently fail — the user needs to know exactly what to fix in their
 * terminal before the dashboard can do anything.
 */
export function AuthBanner() {
  const auth = useAuthStatus()

  if (auth.isPending) return null
  if (!auth.data) return null
  if (auth.data.authenticated) return null

  const code = auth.data.errorCode

  if (code === 'not-installed') {
    return (
      <Alert variant="destructive" className="mb-4">
        <TerminalIcon />
        <AlertTitle>GitHub CLI not found</AlertTitle>
        <AlertDescription>
          Install the GitHub CLI from{' '}
          <a
            className="font-mono underline"
            href="https://cli.github.com"
            target="_blank"
            rel="noreferrer noopener"
          >
            cli.github.com
          </a>{' '}
          and run <code className="font-mono">gh auth login</code> in your
          terminal, then refresh this page.
        </AlertDescription>
      </Alert>
    )
  }

  if (code === 'not-authed') {
    return (
      <Alert variant="destructive" className="mb-4">
        <TerminalIcon />
        <AlertTitle>You aren't signed in to gh</AlertTitle>
        <AlertDescription>
          Run <code className="font-mono">gh auth login</code> in your terminal,
          then refresh this page. better-github reuses your existing CLI auth —
          no token is stored here.
        </AlertDescription>
      </Alert>
    )
  }

  if (code === 'rate-limited') {
    return (
      <Alert variant="destructive" className="mb-4">
        <TerminalIcon />
        <AlertTitle>GitHub API rate limit hit</AlertTitle>
        <AlertDescription>
          Wait a few minutes, or check{' '}
          <code className="font-mono">gh api rate_limit</code> to see your
          remaining quota.
        </AlertDescription>
      </Alert>
    )
  }

  if (code === 'network') {
    return (
      <Alert variant="destructive" className="mb-4">
        <TerminalIcon />
        <AlertTitle>Cannot reach GitHub</AlertTitle>
        <AlertDescription>
          Check your network connection and VPN, then refresh.
        </AlertDescription>
      </Alert>
    )
  }

  if (auth.data.errorMessage) {
    return (
      <Alert variant="destructive" className="mb-4">
        <TerminalIcon />
        <AlertTitle>gh CLI error</AlertTitle>
        <AlertDescription>{auth.data.errorMessage}</AlertDescription>
      </Alert>
    )
  }

  return null
}
