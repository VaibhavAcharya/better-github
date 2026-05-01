import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { TerminalIcon, RotateCcwIcon } from 'lucide-react'
import { PageHeader } from '#/components/layout/page-header'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { useAuthStatus, useRepos } from '#/lib/queries'
import { DEFAULT_SETTINGS, useSettings } from '#/lib/settings'
import { UserAvatar } from '#/components/user-avatar'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { settings, set, reset } = useSettings()
  const auth = useAuthStatus()
  const repos = useRepos()
  const [repoInput, setRepoInput] = React.useState('')
  const [hiddenInput, setHiddenInput] = React.useState('')

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="settings"
        subtitle="local preferences — nothing is sent anywhere"
        actions={
          <Button size="xs" variant="outline" onClick={reset}>
            <RotateCcwIcon /> reset to defaults
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-2">
        <Card title="account">
          {auth.data?.authenticated && auth.data.user ? (
            <div className="flex items-center gap-3">
              <UserAvatar
                login={auth.data.user.login}
                src={auth.data.user.avatarUrl}
                size="lg"
              />
              <div className="space-y-0.5">
                <p className="font-medium">{auth.data.user.login}</p>
                {auth.data.user.name ? (
                  <p className="text-xs text-muted-foreground">
                    {auth.data.user.name}
                  </p>
                ) : null}
                <p className="text-[10px] text-muted-foreground">
                  signed in via gh CLI · host {auth.data.hostname}
                  {auth.data.ghVersion ? ` · gh ${auth.data.ghVersion}` : ''}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <TerminalIcon className="size-3.5 text-destructive" />
                <p className="text-destructive">not signed in</p>
              </div>
              <p className="text-muted-foreground">
                {auth.data?.errorMessage ?? 'gh CLI is not authenticated.'}
              </p>
              {auth.data?.errorHint ? (
                <p className="font-mono text-[11px] text-muted-foreground">
                  {auth.data.errorHint}
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => auth.refetch()}
                  disabled={auth.isFetching}
                >
                  re-check
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card title="refresh">
          <Field label="auto-refresh interval">
            <Select
              value={String(settings.refreshIntervalSec)}
              onValueChange={(v) => set('refreshIntervalSec', Number(v))}
            >
              <SelectTrigger size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">disabled</SelectItem>
                <SelectItem value="30">every 30s</SelectItem>
                <SelectItem value="60">every minute</SelectItem>
                <SelectItem value="180">every 3 minutes</SelectItem>
                <SelectItem value="600">every 10 minutes</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Card>

        <Card title="display">
          <Field label="density">
            <Select
              value={settings.density}
              onValueChange={(v) =>
                set('density', v as 'compact' | 'comfortable')
              }
            >
              <SelectTrigger size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">compact</SelectItem>
                <SelectItem value="comfortable">comfortable</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="show diff stats on cards">
            <Switch
              checked={settings.showDiffStats}
              onCheckedChange={(v) => set('showDiffStats', v)}
            />
          </Field>
          <Field label="open external links in new tab">
            <Switch
              checked={settings.externalLinksNewTab}
              onCheckedChange={(v) => set('externalLinksNewTab', v)}
            />
          </Field>
        </Card>

        <Card title="merging">
          <Field label="default merge method">
            <Select
              value={settings.defaultMergeMethod}
              onValueChange={(v) =>
                set('defaultMergeMethod', v as 'merge' | 'squash' | 'rebase')
              }
            >
              <SelectTrigger size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="squash">squash</SelectItem>
                <SelectItem value="merge">merge commit</SelectItem>
                <SelectItem value="rebase">rebase</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Card>

        <Card title="inbox scope">
          <p className="text-xs text-muted-foreground">
            limit the inbox and list views to specific repositories. leave empty
            to include everything.
          </p>
          <div className="flex flex-wrap gap-1">
            {settings.inboxRepos.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">
                (all repositories)
              </span>
            ) : (
              settings.inboxRepos.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() =>
                    set(
                      'inboxRepos',
                      settings.inboxRepos.filter((x) => x !== r),
                    )
                  }
                  className="inline-flex items-center gap-1 border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] hover:border-destructive/50"
                  title="click to remove"
                >
                  {r} ×
                </button>
              ))
            )}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const v = repoInput.trim()
              if (!v) return
              if (!/^[^/\s]+\/[^/\s]+$/.test(v)) return
              if (!settings.inboxRepos.includes(v)) {
                set('inboxRepos', [...settings.inboxRepos, v])
              }
              setRepoInput('')
            }}
          >
            <Input
              placeholder="owner/repo"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              list="repo-suggestions"
            />
            <datalist id="repo-suggestions">
              {(repos.data ?? []).map((r) => (
                <option key={r.id} value={r.nameWithOwner} />
              ))}
            </datalist>
            <Button size="xs" type="submit" variant="outline">
              add
            </Button>
          </form>
        </Card>

        <Card title="hidden authors">
          <p className="text-xs text-muted-foreground">
            quiet bots and noisy accounts. their PRs and issues won't show up in
            the inbox.
          </p>
          <div className="flex flex-wrap gap-1">
            {settings.hiddenAuthors.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">(none)</span>
            ) : (
              settings.hiddenAuthors.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() =>
                    set(
                      'hiddenAuthors',
                      settings.hiddenAuthors.filter((x) => x !== a),
                    )
                  }
                  className="inline-flex items-center gap-1 border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] hover:border-destructive/50"
                >
                  @{a} ×
                </button>
              ))
            )}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const v = hiddenInput.trim().replace(/^@/, '')
              if (!v) return
              if (!settings.hiddenAuthors.includes(v)) {
                set('hiddenAuthors', [...settings.hiddenAuthors, v])
              }
              setHiddenInput('')
            }}
          >
            <Input
              placeholder="login (eg. dependabot)"
              value={hiddenInput}
              onChange={(e) => setHiddenInput(e.target.value)}
            />
            <Button size="xs" type="submit" variant="outline">
              add
            </Button>
          </form>
        </Card>

        <Card title="defaults">
          <p className="text-[11px] text-muted-foreground">
            the values written above are stored in localStorage under the key{' '}
            <code className="font-mono">better-github:settings:v1</code>.
            clearing site data will reset everything.
          </p>
          <details className="text-[11px]">
            <summary className="cursor-pointer text-muted-foreground">
              show defaults
            </summary>
            <pre className="mt-2 border border-border bg-muted/30 p-2 text-[10px]">
              {JSON.stringify(DEFAULT_SETTINGS, null, 2)}
            </pre>
          </details>
        </Card>
      </div>
    </div>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border border-border bg-card">
      <header className="border-b border-border bg-muted/30 px-3 py-2">
        <h2 className="text-xs font-medium tracking-tight">{title}</h2>
      </header>
      <div className="space-y-3 p-3">{children}</div>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
