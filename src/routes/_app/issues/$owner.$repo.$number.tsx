import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CircleDotIcon, ExternalLinkIcon, XIcon } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { Markdown } from '#/components/markdown'
import { LabelList } from '#/components/label-tag'
import { IssueStatePill } from '#/components/status-pill'
import { TimeAgo } from '#/components/time-ago'
import { UserAvatar } from '#/components/user-avatar'
import { Timeline } from '#/components/pr-detail/timeline'
import { CommentForm } from '#/components/pr-detail/comment-form'
import { Sidecard } from '#/components/sidecard'
import { ErrorState, ListSkeleton } from '#/components/states'
import { PageHeader } from '#/components/layout/page-header'
import {
  useAddIssueComment,
  useCloseIssue,
  useIssue,
  useReopenIssue,
} from '#/lib/queries'

const ParamsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  number: z.coerce.number().int().positive(),
})

export const Route = createFileRoute('/_app/issues/$owner/$repo/$number')({
  parseParams: (params) => ParamsSchema.parse(params),
  component: IssueDetailPage,
})

function IssueDetailPage() {
  const { owner, repo, number } = Route.useParams()
  const query = useIssue(owner, repo, number)
  const [resetSignal, setResetSignal] = React.useState(0)
  const addComment = useAddIssueComment(owner, repo, number)
  const close = useCloseIssue(owner, repo, number)
  const reopen = useReopenIssue(owner, repo, number)

  if (query.isPending) {
    return (
      <div className="space-y-3 p-4">
        <ListSkeleton rows={3} />
      </div>
    )
  }
  if (query.error) {
    return (
      <div className="p-4">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </div>
    )
  }
  if (!query.data) return null

  const issue = query.data

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        crumbs={[
          { label: 'issues', to: '/issues' },
          {
            label: issue.repo.nameWithOwner,
            to: '/repos/$owner/$repo',
            params: { owner: issue.repo.owner, repo: issue.repo.name },
          },
          { label: `#${issue.number}` },
        ]}
        title={
          <span className="flex items-center gap-2">
            <IssueStatePill state={issue.state} />
            <span className="font-medium">{issue.title}</span>
            <span className="text-muted-foreground">#{issue.number}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {issue.author ? (
              <span className="inline-flex items-center gap-1">
                <UserAvatar
                  login={issue.author.login}
                  src={issue.author.avatarUrl}
                  size="xs"
                />
                {issue.author.login}
              </span>
            ) : null}
            <span>
              opened <TimeAgo value={issue.createdAt} />
            </span>
            <span>{issue.comments} comments</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild size="icon-sm" variant="outline">
                  <a href={issue.url} target="_blank" rel="noreferrer noopener">
                    <ExternalLinkIcon />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>open on github</TooltipContent>
            </Tooltip>
            {issue.state === 'OPEN' ? (
              <Button
                size="xs"
                variant="outline"
                disabled={close.isPending}
                onClick={() => {
                  close.mutate('completed', {
                    onSuccess: () => toast.success('issue closed'),
                    onError: (e) =>
                      toast.error(`failed to close: ${e.message ?? 'unknown'}`),
                  })
                }}
              >
                <XIcon /> close
              </Button>
            ) : (
              <Button
                size="xs"
                variant="outline"
                disabled={reopen.isPending}
                onClick={() => {
                  reopen.mutate(undefined, {
                    onSuccess: () => toast.success('issue reopened'),
                    onError: (e) =>
                      toast.error(
                        `failed to reopen: ${e.message ?? 'unknown'}`,
                      ),
                  })
                }}
              >
                <CircleDotIcon /> reopen
              </Button>
            )}
          </div>
        }
      />

      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          <article className="border border-border bg-card">
            <header className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs">
              <UserAvatar
                login={issue.author?.login ?? '?'}
                src={issue.author?.avatarUrl}
                size="sm"
              />
              <span className="font-medium">
                {issue.author?.login ?? 'ghost'}
              </span>
              <span className="text-muted-foreground">
                opened this <TimeAgo value={issue.createdAt} />
              </span>
            </header>
            <div className="px-3 py-3">
              <Markdown body={issue.body} />
            </div>
          </article>

          <Timeline items={issue.timeline} />

          <CommentForm
            onSubmit={(body) => {
              addComment.mutate(body, {
                onSuccess: () => {
                  setResetSignal((v) => v + 1)
                  toast.success('comment posted')
                },
                onError: (e) =>
                  toast.error(`failed: ${e.message ?? 'unknown'}`),
              })
            }}
            busy={addComment.isPending}
            resetSignal={resetSignal}
            secondary={
              issue.state === 'OPEN'
                ? {
                    label: 'comment & close',
                    busy: addComment.isPending || close.isPending,
                    onClick: (body) => {
                      const closeIssueAfter = () =>
                        close.mutate('completed', {
                          onSuccess: () => toast.success('closed with comment'),
                          onError: (e) =>
                            toast.error(
                              `close failed: ${e.message ?? 'unknown'}`,
                            ),
                        })
                      if (body.trim()) {
                        addComment.mutate(body, {
                          onSuccess: () => {
                            setResetSignal((v) => v + 1)
                            closeIssueAfter()
                          },
                          onError: (e) =>
                            toast.error(`failed: ${e.message ?? 'unknown'}`),
                        })
                      } else {
                        closeIssueAfter()
                      }
                    },
                  }
                : undefined
            }
          />
        </div>

        <aside className="space-y-3 text-xs">
          <Sidecard label="assignees">
            {issue.assignees.length === 0 ? (
              <p className="text-muted-foreground">unassigned</p>
            ) : (
              <ul className="space-y-1">
                {issue.assignees.map((a) => (
                  <li key={a.login} className="flex items-center gap-2">
                    <UserAvatar login={a.login} src={a.avatarUrl} size="xs" />
                    <span>{a.login}</span>
                  </li>
                ))}
              </ul>
            )}
          </Sidecard>
          <Sidecard label="labels">
            {issue.labels.length === 0 ? (
              <p className="text-muted-foreground">no labels</p>
            ) : (
              <LabelList labels={issue.labels} max={20} />
            )}
          </Sidecard>
          {issue.closedAt ? (
            <Sidecard label="closed">
              <p className="text-muted-foreground">
                <TimeAgo value={issue.closedAt} />
              </p>
            </Sidecard>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
