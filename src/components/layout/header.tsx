import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  ExternalLinkIcon,
  RefreshCwIcon,
  SearchIcon,
  TerminalIcon,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Kbd } from '#/components/kbd'
import { UserAvatar } from '#/components/user-avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { useAuthStatus } from '#/lib/queries'
import { cn } from '#/lib/utils'

interface HeaderProps {
  onOpenCommandPalette: () => void
}

export function Header({ onOpenCommandPalette }: HeaderProps) {
  const auth = useAuthStatus()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = React.useState(false)

  const refresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await qc.refetchQueries({ type: 'active' })
    } finally {
      setRefreshing(false)
    }
  }, [qc])

  const user = auth.data?.user

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="group flex h-7 flex-1 items-center gap-2 border border-border bg-transparent px-2 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 outline-none"
      >
        <SearchIcon className="size-3" />
        <span className="flex-1 text-left">
          jump to PR, issue, repo… or run a command
        </span>
        <span className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={refresh}
              aria-label="Refresh"
            >
              <RefreshCwIcon className={cn(refreshing && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>refresh all</TooltipContent>
        </Tooltip>

        {user ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={user.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-7 items-center gap-2 px-2 text-xs hover:bg-muted"
              >
                <UserAvatar login={user.login} src={user.avatarUrl} size="sm" />
                <span className="hidden md:inline">{user.login}</span>
                <ExternalLinkIcon className="size-3 text-muted-foreground" />
              </a>
            </TooltipTrigger>
            <TooltipContent>signed in as {user.login}</TooltipContent>
          </Tooltip>
        ) : auth.data?.errorCode === 'not-authed' ? (
          <Link
            to="/settings"
            className="flex h-7 items-center gap-1 px-2 text-xs text-destructive hover:bg-muted"
          >
            <TerminalIcon className="size-3" />
            sign in
          </Link>
        ) : null}
      </div>
    </header>
  )
}
