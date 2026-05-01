import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  BellIcon,
  CommandIcon,
  FolderGit2Icon,
  GitPullRequestIcon,
  HashIcon,
  HomeIcon,
  ListChecksIcon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '#/components/ui/command'
import { useHotkey } from '#/lib/hotkeys'
import { useRepos } from '#/lib/queries'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Cmd+K palette: navigation, refresh, repos, and a fall-through "search GitHub"
 * action. Selecting a repo deep-links into its detail page; typing `owner/repo#123`
 * jumps straight to that PR or issue.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const repos = useRepos()
  const [value, setValue] = React.useState('')

  const close = React.useCallback(() => {
    onOpenChange(false)
    setValue('')
  }, [onOpenChange])

  // Direct jump: owner/repo#123 → PR or issue detail
  const direct = React.useMemo(() => {
    const m = /^([^\s/]+)\/([^\s#]+)#(\d+)$/.exec(value.trim())
    if (!m) return null
    return {
      owner: m[1],
      repo: m[2],
      number: Number(m[3]),
    }
  }, [value])

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search PRs, issues, repos and run common actions"
      className="max-w-xl"
    >
      <CommandInput
        placeholder="search PRs, issues, repos… or type owner/repo#123"
        value={value}
        onValueChange={setValue}
      />
      <CommandList>
        <CommandEmpty>no matching commands</CommandEmpty>

        {direct ? (
          <>
            <CommandGroup heading="jump">
              <CommandItem
                value={`jump-pr-${direct.owner}/${direct.repo}#${direct.number}`}
                onSelect={() => {
                  navigate({
                    to: '/pulls/$owner/$repo/$number',
                    params: {
                      owner: direct.owner,
                      repo: direct.repo,
                      number: direct.number,
                    },
                  })
                  close()
                }}
              >
                <GitPullRequestIcon />
                open PR {direct.owner}/{direct.repo}#{direct.number}
              </CommandItem>
              <CommandItem
                value={`jump-issue-${direct.owner}/${direct.repo}#${direct.number}`}
                onSelect={() => {
                  navigate({
                    to: '/issues/$owner/$repo/$number',
                    params: {
                      owner: direct.owner,
                      repo: direct.repo,
                      number: direct.number,
                    },
                  })
                  close()
                }}
              >
                <HashIcon />
                open issue {direct.owner}/{direct.repo}#{direct.number}
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        ) : null}

        <CommandGroup heading="navigate">
          <CommandItem
            value="nav-inbox"
            onSelect={() => {
              navigate({ to: '/' })
              close()
            }}
          >
            <HomeIcon />
            inbox
          </CommandItem>
          <CommandItem
            value="nav-notifications"
            onSelect={() => {
              navigate({ to: '/notifications' })
              close()
            }}
          >
            <BellIcon />
            notifications
          </CommandItem>
          <CommandItem
            value="nav-pulls"
            onSelect={() => {
              navigate({ to: '/pulls' })
              close()
            }}
          >
            <GitPullRequestIcon />
            pull requests
          </CommandItem>
          <CommandItem
            value="nav-issues"
            onSelect={() => {
              navigate({ to: '/issues' })
              close()
            }}
          >
            <ListChecksIcon />
            issues
          </CommandItem>
          <CommandItem
            value="nav-repos"
            onSelect={() => {
              navigate({ to: '/repos' })
              close()
            }}
          >
            <FolderGit2Icon />
            repositories
          </CommandItem>
          <CommandItem
            value="nav-settings"
            onSelect={() => {
              navigate({ to: '/settings' })
              close()
            }}
          >
            <SettingsIcon />
            settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="actions">
          <CommandItem
            value="action-refresh"
            onSelect={() => {
              void qc.refetchQueries({ type: 'active' })
              close()
            }}
          >
            <RefreshCwIcon />
            refresh all
          </CommandItem>
          <CommandItem
            value="action-search"
            onSelect={() => {
              if (value.trim()) {
                navigate({
                  to: '/search',
                  search: { q: value.trim() },
                })
              } else {
                navigate({ to: '/search' })
              }
              close()
            }}
          >
            <SearchIcon />
            search GitHub for "{value || '…'}"
          </CommandItem>
        </CommandGroup>

        {repos.data && repos.data.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="repositories">
              {repos.data.slice(0, 25).map((r) => (
                <CommandItem
                  key={r.id}
                  value={`repo-${r.nameWithOwner}`}
                  onSelect={() => {
                    navigate({
                      to: '/repos/$owner/$repo',
                      params: { owner: r.owner, repo: r.name },
                    })
                    close()
                  }}
                >
                  <FolderGit2Icon />
                  {r.nameWithOwner}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {r.primaryLanguage?.name ?? ''}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}

/** Hook to register the global Cmd+K + `/` keyboard shortcuts. */
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false)

  useHotkey({
    combo: 'mod+k',
    description: 'Open command palette',
    group: 'Global',
    handler: () => setOpen(true),
    allowInInput: true,
  })
  useHotkey({
    combo: '/',
    description: 'Open command palette',
    group: 'Global',
    handler: () => setOpen(true),
  })

  return { open, setOpen }
}

/** Default export so the help dialog can render an icon. */
export const CommandPaletteIcon = CommandIcon
