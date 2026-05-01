import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ExternalLinkIcon,
  FileDiffIcon,
  FilesIcon,
  GitMergeIcon,
  MessageSquareIcon,
  MinusIcon,
  PlusIcon,
  ShieldIcon,
} from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { Markdown } from '#/components/markdown'
import { LabelList } from '#/components/label-tag'
import { PrStatePill } from '#/components/status-pill'
import { TimeAgo } from '#/components/time-ago'
import { UserAvatar } from '#/components/user-avatar'
import { Sidecard } from '#/components/sidecard'
import { ChecksPanel } from '#/components/pr-detail/checks-panel'
import { Timeline } from '#/components/pr-detail/timeline'
import { FilesPanel } from '#/components/pr-detail/files-panel'
import { DiffView } from '#/components/pr-detail/diff-view'
import { CommentForm } from '#/components/pr-detail/comment-form'
import {
  MergeDialog
  
} from '#/components/pr-detail/merge-dialog'
import type {MergeMethod} from '#/components/pr-detail/merge-dialog';
import {
  ReviewActions
  
} from '#/components/pr-detail/review-actions'
import type {ReviewEvent} from '#/components/pr-detail/review-actions';
import { ErrorState, ListSkeleton } from '#/components/states'
import { PageHeader } from '#/components/layout/page-header'
import {
  useAddPrComment,
  useClosePullRequest,
  useMergePullRequest,
  usePullRequest,
  usePullRequestDiff,
  useReopenPullRequest,
  useSubmitReview,
} from '#/lib/queries'
import { useSettings } from '#/lib/settings'
import { compactNumber } from '#/lib/format'

const ParamsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  number: z.coerce.number().int().positive(),
})

type Tab = 'conversation' | 'files' | 'diff' | 'checks'

export const Route = createFileRoute('/_app/pulls/$owner/$repo/$number')({
  parseParams: (params) => ParamsSchema.parse(params),
  component: PullRequestDetailPage,
})

function PullRequestDetailPage() {
  const { owner, repo, number } = Route.useParams()
  const query = usePullRequest(owner, repo, number)
  const [tab, setTab] = React.useState<Tab>('conversation')
  const [resetSignal, setResetSignal] = React.useState(0)
  const [reviewBody, setReviewBody] = React.useState('')
  const [mergeOpen, setMergeOpen] = React.useState(false)
  const { settings } = useSettings()

  // Only fetch the (potentially big) raw diff when the user opens the tab.
  const diff = usePullRequestDiff(owner, repo, number, tab === 'diff')

  const addComment = useAddPrComment(owner, repo, number)
  const submitReview = useSubmitReview(owner, repo, number)
  const merge = useMergePullRequest(owner, repo, number)
  const close = useClosePullRequest(owner, repo, number)
  const reopen = useReopenPullRequest(owner, repo, number)

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

  const { pr, files } = query.data

  const onComment = (body: string) => {
    addComment.mutate(body, {
      onSuccess: () => {
        setResetSignal((v) => v + 1)
        toast.success('comment posted')
      },
      onError: (e) =>
        toast.error(`failed to comment: ${(e).message ?? 'unknown'}`),
    })
  }

  const onReview = (event: ReviewEvent) => {
    submitReview.mutate(
      { event, body: reviewBody.trim() || undefined },
      {
        onSuccess: () => {
          setReviewBody('')
          toast.success(toastForReview(event))
        },
        onError: (e) =>
          toast.error(`review failed: ${(e).message ?? 'unknown'}`),
      },
    )
  }

  const onMerge = (method: MergeMethod) => {
    merge.mutate(method, {
      onSuccess: () => {
        setMergeOpen(false)
        toast.success(`PR merged with ${method}`)
      },
      onError: (e) =>
        toast.error(`merge failed: ${(e).message ?? 'unknown'}`),
    })
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        crumbs={[
          { label: 'pulls', to: '/pulls' },
          {
            label: pr.repo.nameWithOwner,
            to: '/repos/$owner/$repo',
            params: { owner: pr.repo.owner, repo: pr.repo.name },
          },
          { label: `#${pr.number}` },
        ]}
        title={
          <span className="flex items-center gap-2">
            <PrStatePill state={pr.state} isDraft={pr.isDraft} />
            <span className="font-medium">{pr.title}</span>
            <span className="text-muted-foreground">#{pr.number}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {pr.author ? (
              <span className="inline-flex items-center gap-1">
                <UserAvatar
                  login={pr.author.login}
                  src={pr.author.avatarUrl}
                  size="xs"
                />
                {pr.author.login}
              </span>
            ) : null}
            <span>
              opened <TimeAgo value={pr.createdAt} />
            </span>
            <span className="font-mono">
              {pr.headRefName} → {pr.baseRefName}
            </span>
            <span className="font-mono inline-flex items-center gap-0.5 text-emerald-500">
              <PlusIcon className="size-3" /> {compactNumber(pr.additions)}
            </span>
            <span className="font-mono inline-flex items-center gap-0.5 text-rose-500">
              <MinusIcon className="size-3" /> {compactNumber(pr.deletions)}
            </span>
            <span>{pr.changedFiles} files</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild size="icon-sm" variant="outline">
                  <a href={pr.url} target="_blank" rel="noreferrer noopener">
                    <ExternalLinkIcon />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>open on github</TooltipContent>
            </Tooltip>
            {pr.state === 'OPEN' ? (
              <Button
                size="xs"
                variant="default"
                disabled={pr.mergeable !== 'MERGEABLE' || merge.isPending}
                onClick={() => setMergeOpen(true)}
              >
                <GitMergeIcon /> merge
              </Button>
            ) : null}
            {pr.state === 'OPEN' ? (
              <Button
                size="xs"
                variant="outline"
                disabled={close.isPending}
                onClick={() => {
                  close.mutate(undefined, {
                    onSuccess: () => toast.success('PR closed'),
                    onError: (e) =>
                      toast.error(
                        `failed to close: ${(e).message ?? 'unknown'}`,
                      ),
                  })
                }}
              >
                close
              </Button>
            ) : pr.state === 'CLOSED' ? (
              <Button
                size="xs"
                variant="outline"
                disabled={reopen.isPending}
                onClick={() => {
                  reopen.mutate(undefined, {
                    onSuccess: () => toast.success('PR reopened'),
                    onError: (e) =>
                      toast.error(
                        `failed to reopen: ${(e).message ?? 'unknown'}`,
                      ),
                  })
                }}
              >
                reopen
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="rounded-none">
              <TabsTrigger value="conversation" className="gap-1 rounded-none">
                <MessageSquareIcon /> conversation
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-1 rounded-none">
                <FilesIcon /> files
                <span className="text-[10px] text-muted-foreground">
                  {files.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="diff" className="gap-1 rounded-none">
                <FileDiffIcon /> diff
              </TabsTrigger>
              <TabsTrigger value="checks" className="gap-1 rounded-none">
                <ShieldIcon /> checks
                <span className="text-[10px] text-muted-foreground">
                  {pr.checks.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conversation" className="space-y-4 pt-4">
              <article className="border border-border bg-card">
                <header className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs">
                  <UserAvatar
                    login={pr.author?.login ?? '?'}
                    src={pr.author?.avatarUrl}
                    size="sm"
                  />
                  <span className="font-medium">
                    {pr.author?.login ?? 'ghost'}
                  </span>
                  <span className="text-muted-foreground">
                    opened this <TimeAgo value={pr.createdAt} />
                  </span>
                </header>
                <div className="px-3 py-3">
                  <Markdown body={pr.body} />
                </div>
              </article>

              <Timeline items={pr.timeline} />

              <ReviewActions
                disabled={pr.state !== 'OPEN' || submitReview.isPending}
                body={reviewBody}
                onBodyChange={setReviewBody}
                onSubmit={onReview}
              />

              <CommentForm
                onSubmit={onComment}
                busy={addComment.isPending}
                resetSignal={resetSignal}
              />
            </TabsContent>

            <TabsContent value="files" className="pt-4">
              <section className="border border-border bg-card">
                <FilesPanel files={files} />
              </section>
            </TabsContent>

            <TabsContent value="diff" className="space-y-2 pt-4">
              {diff.error ? (
                <ErrorState error={diff.error} onRetry={() => diff.refetch()} />
              ) : diff.isPending ? (
                <ListSkeleton rows={6} />
              ) : (
                <DiffView diff={diff.data?.diff ?? ''} />
              )}
            </TabsContent>

            <TabsContent value="checks" className="pt-4">
              <section className="border border-border bg-card">
                <ChecksPanel checks={pr.checks} />
              </section>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-3 text-xs">
          <Sidecard label="reviewers">
            {pr.requestedReviewers.length === 0 ? (
              <p className="text-muted-foreground">no reviewers requested</p>
            ) : (
              <ul className="space-y-1">
                {pr.requestedReviewers.map((r) => (
                  <li key={r.login} className="flex items-center gap-2">
                    <UserAvatar login={r.login} src={r.avatarUrl} size="xs" />
                    <span>{r.login}</span>
                  </li>
                ))}
              </ul>
            )}
          </Sidecard>
          <Sidecard label="assignees">
            {pr.assignees.length === 0 ? (
              <p className="text-muted-foreground">unassigned</p>
            ) : (
              <ul className="space-y-1">
                {pr.assignees.map((a) => (
                  <li key={a.login} className="flex items-center gap-2">
                    <UserAvatar login={a.login} src={a.avatarUrl} size="xs" />
                    <span>{a.login}</span>
                  </li>
                ))}
              </ul>
            )}
          </Sidecard>
          <Sidecard label="labels">
            {pr.labels.length === 0 ? (
              <p className="text-muted-foreground">no labels</p>
            ) : (
              <LabelList labels={pr.labels} max={20} />
            )}
          </Sidecard>
          <Sidecard label="merge">
            <p
              className={
                pr.mergeable === 'CONFLICTING'
                  ? 'text-rose-500'
                  : pr.mergeable === 'MERGEABLE'
                    ? 'text-emerald-500'
                    : 'text-muted-foreground'
              }
            >
              {pr.mergeable === 'MERGEABLE'
                ? '[no conflicts]'
                : pr.mergeable === 'CONFLICTING'
                  ? '[conflicts with base]'
                  : '[mergeability unknown]'}
            </p>
            {pr.mergedAt ? (
              <p className="text-muted-foreground">
                merged <TimeAgo value={pr.mergedAt} />{' '}
                {pr.mergedBy ? `by ${pr.mergedBy.login}` : ''}
              </p>
            ) : null}
            {pr.closedAt && !pr.mergedAt ? (
              <p className="text-muted-foreground">
                closed <TimeAgo value={pr.closedAt} />
              </p>
            ) : null}
          </Sidecard>
        </aside>
      </div>

      <MergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        defaultMethod={settings.defaultMergeMethod}
        title={pr.title}
        number={pr.number}
        busy={merge.isPending}
        onConfirm={onMerge}
      />
    </div>
  )
}

function toastForReview(event: ReviewEvent): string {
  if (event === 'APPROVE') return 'PR approved'
  if (event === 'REQUEST_CHANGES') return 'changes requested'
  return 'review submitted'
}
