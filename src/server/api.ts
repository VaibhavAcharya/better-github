import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { GhError, ghGraphql, ghJson, ghRest, ghRestVoid, runGh } from './gh'
import {
  INBOX_QUERY,
  ISSUE_DETAIL_QUERY,
  PR_DETAIL_QUERY,
  REPOS_QUERY,
  REPO_DETAIL_QUERY,
  SEARCH_ISSUES_QUERY,
  SEARCH_PRS_QUERY,
  VIEWER_QUERY,
} from './queries'
import type {
  GhActor,
  GhAuthStatus,
  GhCheckRun,
  GhCheckState,
  GhFileChange,
  GhInbox,
  GhIssueDetail,
  GhIssueState,
  GhIssueSummary,
  GhLabel,
  GhMergeable,
  GhNotification,
  GhPrDetail,
  GhPrState,
  GhPrSummary,
  GhRepo,
  GhTimelineItem,
  GhUser,
} from '#/lib/types'

/* ----------------------- shared mappers ----------------------- */

interface GqlActor {
  login: string
  avatarUrl: string
  url?: string
}

interface GqlLabel {
  name: string
  color: string
}

interface GqlRepoRef {
  owner: { login: string }
  name: string
  nameWithOwner: string
}

interface GqlPr {
  id: string
  number: number
  title: string
  url: string
  state: GhPrState
  isDraft: boolean
  createdAt: string
  updatedAt: string
  additions: number
  deletions: number
  changedFiles: number
  mergeable?: GhMergeable
  reviewDecision?: GhPrSummary['reviewDecision']
  repository: GqlRepoRef
  author: GqlActor | null
  labels?: { nodes: ReadonlyArray<GqlLabel> }
  comments?: { totalCount: number }
  commits?: {
    nodes: ReadonlyArray<{
      commit: { statusCheckRollup: { state: GhCheckState } | null }
    }>
  }
}

interface GqlIssue {
  id: string
  number: number
  title: string
  url: string
  state: GhIssueState
  createdAt: string
  updatedAt: string
  repository: GqlRepoRef
  author: GqlActor | null
  labels?: { nodes: ReadonlyArray<GqlLabel> }
  comments?: { totalCount: number }
  assignees?: { nodes: ReadonlyArray<GqlActor> }
}

function mapActor(a: GqlActor | null | undefined): GhActor | null {
  if (!a || !a.login) return null
  return { login: a.login, avatarUrl: a.avatarUrl, url: a.url }
}

function mapLabels(
  src: { nodes: ReadonlyArray<GqlLabel> } | undefined,
): ReadonlyArray<GhLabel> {
  return src?.nodes?.map((n) => ({ name: n.name, color: n.color })) ?? []
}

function mapPr(p: GqlPr): GhPrSummary {
  return {
    id: p.id,
    number: p.number,
    title: p.title,
    url: p.url,
    state: p.state,
    isDraft: p.isDraft,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    additions: p.additions,
    deletions: p.deletions,
    changedFiles: p.changedFiles,
    mergeable: p.mergeable ?? null,
    reviewDecision: p.reviewDecision ?? null,
    repo: {
      owner: p.repository.owner.login,
      name: p.repository.name,
      nameWithOwner: p.repository.nameWithOwner,
    },
    author: mapActor(p.author),
    labels: mapLabels(p.labels),
    comments: p.comments?.totalCount ?? 0,
    checkState: p.commits?.nodes[0]?.commit.statusCheckRollup?.state ?? null,
  }
}

function mapIssue(i: GqlIssue): GhIssueSummary {
  return {
    id: i.id,
    number: i.number,
    title: i.title,
    url: i.url,
    state: i.state,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
    repo: {
      owner: i.repository.owner.login,
      name: i.repository.name,
      nameWithOwner: i.repository.nameWithOwner,
    },
    author: mapActor(i.author),
    labels: mapLabels(i.labels),
    comments: i.comments?.totalCount ?? 0,
    assignees:
      i.assignees?.nodes
        ?.map(mapActor)
        .filter((x): x is GhActor => x !== null) ?? [],
  }
}

/** Auth + user info — used by the layout to render the header avatar / banner. */
export const fetchAuthStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GhAuthStatus> => {
    let ghVersion: string | null = null
    try {
      const out = await runGh(['--version'])
      ghVersion = out.split('\n')[0]?.replace(/^gh version\s*/, '') ?? null
    } catch (err) {
      if (err instanceof GhError) {
        return {
          authenticated: false,
          user: null,
          hostname: 'github.com',
          ghVersion: null,
          errorCode: err.code,
          errorMessage: err.message,
          errorHint: err.hint,
        }
      }
      throw err
    }

    try {
      const data = await ghGraphql<{ viewer: GhUser }>(VIEWER_QUERY)
      return {
        authenticated: true,
        user: data.viewer,
        hostname: 'github.com',
        ghVersion,
        errorCode: null,
        errorMessage: null,
        errorHint: null,
      }
    } catch (err) {
      if (err instanceof GhError) {
        return {
          authenticated: false,
          user: null,
          hostname: 'github.com',
          ghVersion,
          errorCode: err.code,
          errorMessage: err.message,
          errorHint: err.hint,
        }
      }
      throw err
    }
  },
)

/** Dashboard inbox — five sections in one round trip. */
export const fetchInbox = createServerFn({ method: 'GET' })
  .inputValidator(
    z
      .object({
        limit: z.number().min(1).max(100).optional(),
        repoFilter: z.array(z.string()).optional(),
      })
      .optional(),
  )
  .handler(async ({ data }): Promise<GhInbox> => {
    const limit = data?.limit ?? 25
    const repoFilter = data?.repoFilter?.length
      ? data.repoFilter.map((r) => `repo:${r}`).join(' ')
      : ''
    const suffix = repoFilter ? ` ${repoFilter}` : ''

    const reviewQuery = `is:pr is:open archived:false review-requested:@me${suffix}`
    const authoredQuery = `is:pr is:open archived:false author:@me${suffix}`
    const recentQuery = `is:pr is:open archived:false involves:@me sort:updated-desc${suffix}`
    const assignedQuery = `is:issue is:open archived:false assignee:@me${suffix}`
    const mentionsQuery = `is:open archived:false mentions:@me sort:updated-desc${suffix}`

    interface InboxResp {
      reviewRequested: { nodes: ReadonlyArray<GqlPr> }
      yourOpen: { nodes: ReadonlyArray<GqlPr> }
      recentlyUpdated: { nodes: ReadonlyArray<GqlPr> }
      assignedIssues: { nodes: ReadonlyArray<GqlIssue> }
      mentioned: { nodes: ReadonlyArray<GqlPr | GqlIssue> }
    }

    const resp = await ghGraphql<InboxResp>(INBOX_QUERY, {
      reviewQuery,
      authoredQuery,
      recentQuery,
      assignedQuery,
      mentionsQuery,
      first: limit,
    })

    const isPr = (n: GqlPr | GqlIssue): n is GqlPr =>
      'isDraft' in n || 'reviewDecision' in n

    return {
      reviewRequested: resp.reviewRequested.nodes
        .filter((n) => n && n.id)
        .map(mapPr),
      yourOpenPrs: resp.yourOpen.nodes.filter((n) => n && n.id).map(mapPr),
      recentlyUpdatedPrs: resp.recentlyUpdated.nodes
        .filter((n) => n && n.id)
        .map(mapPr),
      assignedIssues: resp.assignedIssues.nodes
        .filter((n) => n && n.id)
        .map(mapIssue),
      mentioned: resp.mentioned.nodes
        .filter((n) => n && n.id)
        .map((n) => (isPr(n) ? mapPr(n) : mapIssue(n))),
    }
  })

const SEARCH_INPUT = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().min(1).max(100).optional(),
})

export const searchPullRequests = createServerFn({ method: 'GET' })
  .inputValidator(SEARCH_INPUT)
  .handler(
    async ({
      data,
    }): Promise<{
      totalCount: number
      results: ReadonlyArray<GhPrSummary>
    }> => {
      const resp = await ghGraphql<{
        search: { issueCount: number; nodes: ReadonlyArray<GqlPr> }
      }>(SEARCH_PRS_QUERY, { query: data.query, first: data.limit ?? 50 })
      return {
        totalCount: resp.search.issueCount,
        results: resp.search.nodes.filter((n) => n && n.id).map(mapPr),
      }
    },
  )

export const searchIssues = createServerFn({ method: 'GET' })
  .inputValidator(SEARCH_INPUT)
  .handler(
    async ({
      data,
    }): Promise<{
      totalCount: number
      results: ReadonlyArray<GhIssueSummary>
    }> => {
      const resp = await ghGraphql<{
        search: { issueCount: number; nodes: ReadonlyArray<GqlIssue> }
      }>(SEARCH_ISSUES_QUERY, { query: data.query, first: data.limit ?? 50 })
      return {
        totalCount: resp.search.issueCount,
        results: resp.search.nodes.filter((n) => n && n.id).map(mapIssue),
      }
    },
  )

/* --------------------------- PR detail --------------------------- */

interface GqlPrDetail extends GqlPr {
  body: string
  closedAt: string | null
  mergedAt: string | null
  headRefName: string
  baseRefName: string
  mergedBy: GqlActor | null
  assignees: { nodes: ReadonlyArray<GqlActor> }
  reviewRequests: {
    nodes: ReadonlyArray<{
      requestedReviewer:
        | GqlActor
        | { name: string; avatarUrl: string; url: string }
        | null
    }>
  }
  commits: {
    nodes: ReadonlyArray<{
      commit: {
        statusCheckRollup: {
          state: GhCheckState
          contexts: {
            nodes: ReadonlyArray<
              | {
                  __typename: 'CheckRun'
                  name: string
                  conclusion: GhCheckState | null
                  status: GhCheckRun['status']
                  startedAt: string | null
                  completedAt: string | null
                  detailsUrl: string | null
                }
              | {
                  __typename: 'StatusContext'
                  context: string
                  state: GhCheckState
                  targetUrl: string | null
                }
            >
          }
        } | null
      }
    }>
  }
  timelineItems: {
    nodes: ReadonlyArray<Record<string, unknown> & { __typename: string }>
  }
  files: {
    nodes: ReadonlyArray<{
      path: string
      additions: number
      deletions: number
      changeType: GhFileChange['changeType']
    }>
  }
}

function mapTimeline(
  nodes: ReadonlyArray<Record<string, unknown> & { __typename: string }>,
): ReadonlyArray<GhTimelineItem> {
  const out: Array<GhTimelineItem> = []
  for (const n of nodes) {
    const id = (n.id as string) ?? `${n.__typename}-${out.length}`
    const actor = mapActor((n.actor ?? n.author) as GqlActor | null)
    const createdAt =
      (n.createdAt as string) ??
      (n.submittedAt as string) ??
      new Date(0).toISOString()

    switch (n.__typename) {
      case 'IssueComment':
        out.push({
          kind: 'comment',
          id,
          author: actor,
          body: (n.body as string) ?? '',
          createdAt,
        })
        break
      case 'PullRequestReview':
        out.push({
          kind: 'review',
          id,
          author: actor,
          state: n.state as GqlPrDetail['state'] as never,
          body: (n.body as string) ?? '',
          submittedAt: (n.submittedAt as string) ?? null,
        })
        break
      case 'ClosedEvent':
        out.push({
          kind: 'event',
          id,
          type: 'closed',
          actor,
          createdAt,
          detail: null,
        })
        break
      case 'ReopenedEvent':
        out.push({
          kind: 'event',
          id,
          type: 'reopened',
          actor,
          createdAt,
          detail: null,
        })
        break
      case 'MergedEvent': {
        const oid = (n.commit as { abbreviatedOid?: string } | null)
          ?.abbreviatedOid
        out.push({
          kind: 'event',
          id,
          type: 'merged',
          actor,
          createdAt,
          detail: oid ? `commit ${oid}` : null,
        })
        break
      }
      case 'ReviewRequestedEvent': {
        const r = n.requestedReviewer as
          | { login?: string; name?: string }
          | null
          | undefined
        const who = r?.login ?? r?.name ?? null
        out.push({
          kind: 'event',
          id,
          type: 'review-requested',
          actor,
          createdAt,
          detail: who ? `from ${who}` : null,
        })
        break
      }
      case 'LabeledEvent': {
        const label = n.label as { name: string }
        out.push({
          kind: 'event',
          id,
          type: 'labeled',
          actor,
          createdAt,
          detail: label.name,
        })
        break
      }
      case 'UnlabeledEvent': {
        const label = n.label as { name: string }
        out.push({
          kind: 'event',
          id,
          type: 'unlabeled',
          actor,
          createdAt,
          detail: label.name,
        })
        break
      }
      case 'AssignedEvent': {
        const a = n.assignee as { login?: string } | null | undefined
        out.push({
          kind: 'event',
          id,
          type: 'assigned',
          actor,
          createdAt,
          detail: a?.login ?? null,
        })
        break
      }
      case 'HeadRefForcePushedEvent': {
        const before = (n.beforeCommit as { abbreviatedOid?: string } | null)
          ?.abbreviatedOid
        const after = (n.afterCommit as { abbreviatedOid?: string } | null)
          ?.abbreviatedOid
        out.push({
          kind: 'event',
          id,
          type: 'force-pushed',
          actor,
          createdAt,
          detail: before && after ? `${before} → ${after}` : null,
        })
        break
      }
      case 'RenamedTitleEvent': {
        out.push({
          kind: 'event',
          id,
          type: 'renamed',
          actor,
          createdAt,
          detail: `${n.previousTitle as string} → ${n.currentTitle as string}`,
        })
        break
      }
      default:
        break
    }
  }
  // sort ascending by date
  out.sort(
    (a, b) =>
      new Date(timestampOf(a)).getTime() - new Date(timestampOf(b)).getTime(),
  )
  return out
}

function timestampOf(t: GhTimelineItem): string {
  if (t.kind === 'comment') return t.createdAt
  if (t.kind === 'review') return t.submittedAt ?? new Date(0).toISOString()
  return t.createdAt
}

export const fetchPullRequest = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      number: z.number().int().positive(),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{ pr: GhPrDetail; files: ReadonlyArray<GhFileChange> }> => {
      const resp = await ghGraphql<{
        repository: { pullRequest: GqlPrDetail | null }
      }>(PR_DETAIL_QUERY, {
        owner: data.owner,
        repo: data.repo,
        number: data.number,
      })
      const p = resp.repository?.pullRequest
      if (!p) {
        throw new GhError({
          code: 'not-found',
          message: `Pull request ${data.owner}/${data.repo}#${data.number} not found`,
        })
      }
      const summary = mapPr(p)

      const checks: Array<GhCheckRun> = []
      const ctxs =
        p.commits.nodes[0]?.commit.statusCheckRollup?.contexts.nodes ?? []
      for (const c of ctxs) {
        if (c.__typename === 'CheckRun') {
          const duration =
            c.startedAt && c.completedAt
              ? new Date(c.completedAt).getTime() -
                new Date(c.startedAt).getTime()
              : null
          checks.push({
            name: c.name,
            conclusion: c.conclusion,
            status: c.status,
            detailsUrl: c.detailsUrl,
            durationMs: duration,
          })
        } else {
          checks.push({
            name: c.context,
            conclusion: c.state,
            status: 'COMPLETED',
            detailsUrl: c.targetUrl,
            durationMs: null,
          })
        }
      }

      const detail: GhPrDetail = {
        ...summary,
        body: p.body,
        headRefName: p.headRefName,
        baseRefName: p.baseRefName,
        closedAt: p.closedAt,
        mergedAt: p.mergedAt,
        mergedBy: mapActor(p.mergedBy),
        assignees:
          p.assignees.nodes
            .map(mapActor)
            .filter((x): x is GhActor => x !== null) ?? [],
        requestedReviewers: p.reviewRequests.nodes
          .map((r) => {
            const reviewer = r.requestedReviewer as GqlActor | null
            return mapActor(reviewer)
          })
          .filter((x): x is GhActor => x !== null),
        checks,
        timeline: mapTimeline(p.timelineItems.nodes),
      }

      const files: ReadonlyArray<GhFileChange> = p.files.nodes.map((f) => ({
        path: f.path,
        previousPath: null,
        changeType: f.changeType,
        additions: f.additions,
        deletions: f.deletions,
      }))

      return { pr: detail, files }
    },
  )

/** Raw unified diff for a PR — we render this client-side. */
export const fetchPullRequestDiff = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      number: z.number().int().positive(),
    }),
  )
  .handler(async ({ data }): Promise<{ diff: string }> => {
    const args = [
      'api',
      `/repos/${data.owner}/${data.repo}/pulls/${data.number}`,
      '-H',
      'Accept: application/vnd.github.v3.diff',
    ]
    const diff = await runGh(args, { timeoutMs: 60_000, maxBufferMB: 64 })
    return { diff }
  })

/* --------------------------- Issue detail --------------------------- */

export const fetchIssue = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      number: z.number().int().positive(),
    }),
  )
  .handler(async ({ data }): Promise<GhIssueDetail> => {
    const resp = await ghGraphql<{
      repository: {
        issue:
          | (GqlIssue & {
              body: string
              closedAt: string | null
              timelineItems: {
                nodes: ReadonlyArray<
                  Record<string, unknown> & { __typename: string }
                >
              }
            })
          | null
      }
    }>(ISSUE_DETAIL_QUERY, {
      owner: data.owner,
      repo: data.repo,
      number: data.number,
    })
    const i = resp.repository?.issue
    if (!i) {
      throw new GhError({
        code: 'not-found',
        message: `Issue ${data.owner}/${data.repo}#${data.number} not found`,
      })
    }
    const summary = mapIssue(i)
    return {
      ...summary,
      body: i.body,
      closedAt: i.closedAt,
      timeline: mapTimeline(i.timelineItems.nodes),
    }
  })

/* --------------------------- Notifications --------------------------- */

interface RawNotification {
  id: string
  unread: boolean
  reason: string
  updated_at: string
  subject: { title: string; url: string | null; type: string }
  repository: {
    full_name: string
    name: string
    owner: { login: string }
  }
}

function parseSubjectNumber(subjectUrl: string | null): number | null {
  if (!subjectUrl) return null
  const match = /\/(?:pulls|issues|discussions)\/(\d+)/.exec(subjectUrl)
  return match ? Number(match[1]) : null
}

function toWebUrl(apiUrl: string | null, type: string): string | null {
  if (!apiUrl) return null
  // /repos/foo/bar/pulls/123 -> /foo/bar/pull/123
  const match =
    /\/repos\/([^/]+)\/([^/]+)\/(pulls|issues|discussions)\/(\d+)/.exec(apiUrl)
  if (match) {
    const kind = type === 'PullRequest' ? 'pull' : 'issues'
    return `https://github.com/${match[1]}/${match[2]}/${kind === 'pull' ? 'pull' : match[3] === 'pulls' ? 'pull' : match[3]}/${match[4]}`
  }
  return apiUrl.replace('https://api.github.com', 'https://github.com')
}

export const fetchNotifications = createServerFn({ method: 'GET' })
  .inputValidator(
    z
      .object({
        all: z.boolean().optional(),
        participating: z.boolean().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }): Promise<ReadonlyArray<GhNotification>> => {
    const params = new URLSearchParams()
    if (data?.all) params.set('all', 'true')
    if (data?.participating) params.set('participating', 'true')
    params.set('per_page', '50')
    const path = `/notifications?${params.toString()}`
    const raw = await ghJson<ReadonlyArray<RawNotification>>(['api', path])
    return raw.map((n) => ({
      id: n.id,
      unread: n.unread,
      reason: n.reason,
      updatedAt: n.updated_at,
      title: n.subject.title,
      type: n.subject.type,
      repo: {
        owner: n.repository.owner.login,
        name: n.repository.name,
        nameWithOwner: n.repository.full_name,
      },
      subjectUrl: toWebUrl(n.subject.url, n.subject.type),
      number: parseSubjectNumber(n.subject.url),
    }))
  })

export const markNotificationRead = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ threadId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await ghRestVoid('PATCH', `/notifications/threads/${data.threadId}`)
    return { ok: true }
  })

export const markNotificationDone = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ threadId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await ghRestVoid('DELETE', `/notifications/threads/${data.threadId}`)
    return { ok: true }
  })

export const markAllNotificationsRead = createServerFn({
  method: 'POST',
}).handler(async () => {
  await ghRestVoid('PUT', `/notifications`, { read: true })
  return { ok: true }
})

/* --------------------------- Repos --------------------------- */

interface GqlRepo {
  id: string
  nameWithOwner: string
  name: string
  description: string | null
  url: string
  isPrivate: boolean
  isArchived: boolean
  isFork: boolean
  pushedAt: string | null
  stargazerCount: number
  defaultBranchRef: { name: string } | null
  owner: { login: string }
  primaryLanguage: { name: string; color: string | null } | null
  issues: { totalCount: number }
}

export const fetchRepos = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ReadonlyArray<GhRepo>> => {
    const resp = await ghGraphql<{
      viewer: {
        repositories: { nodes: ReadonlyArray<GqlRepo> }
      }
    }>(REPOS_QUERY, { first: 50 })
    return resp.viewer.repositories.nodes.map((r) => ({
      id: r.id,
      nameWithOwner: r.nameWithOwner,
      owner: r.owner.login,
      name: r.name,
      description: r.description,
      url: r.url,
      isPrivate: r.isPrivate,
      isArchived: r.isArchived,
      isFork: r.isFork,
      pushedAt: r.pushedAt,
      stargazerCount: r.stargazerCount,
      openIssuesCount: r.issues.totalCount,
      primaryLanguage: r.primaryLanguage
        ? { name: r.primaryLanguage.name, color: r.primaryLanguage.color }
        : null,
      defaultBranch: r.defaultBranchRef?.name ?? null,
    }))
  },
)

export interface RepoCommit {
  oid: string
  abbreviatedOid: string
  message: string
  committedDate: string
  url: string
  authorName: string | null
  authorLogin: string | null
  authorAvatarUrl: string | null
}

export interface RepoDetail {
  repo: GhRepo & {
    forkCount: number
    watchersCount: number
    languages: ReadonlyArray<{
      name: string
      color: string | null
      size: number
    }>
  }
  recentCommits: ReadonlyArray<RepoCommit>
  openPrs: ReadonlyArray<GhPrSummary>
  openIssues: ReadonlyArray<GhIssueSummary>
}

export const fetchRepoDetail = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({ owner: z.string().min(1), repo: z.string().min(1) }),
  )
  .handler(async ({ data }): Promise<RepoDetail> => {
    interface RepoDetailResp {
      repository: {
        id: string
        nameWithOwner: string
        name: string
        description: string | null
        url: string
        isPrivate: boolean
        isArchived: boolean
        isFork: boolean
        pushedAt: string | null
        stargazerCount: number
        forkCount: number
        watchers: { totalCount: number }
        defaultBranchRef: {
          name: string
          target: {
            history?: {
              nodes: ReadonlyArray<{
                oid: string
                abbreviatedOid: string
                message: string
                committedDate: string
                url: string
                author: {
                  name: string | null
                  user: { login: string; avatarUrl: string } | null
                } | null
              }>
            }
          }
        } | null
        owner: { login: string }
        primaryLanguage: { name: string; color: string | null } | null
        languages: {
          edges: ReadonlyArray<{
            size: number
            node: { name: string; color: string | null }
          }>
        }
        openPrs: { totalCount: number; nodes: ReadonlyArray<GqlPr> }
        openIssues: { totalCount: number; nodes: ReadonlyArray<GqlIssue> }
      }
    }
    const resp = await ghGraphql<RepoDetailResp>(REPO_DETAIL_QUERY, {
      owner: data.owner,
      name: data.repo,
    })
    const r = resp.repository
    if (!r) {
      throw new GhError({
        code: 'not-found',
        message: `Repository ${data.owner}/${data.repo} not found`,
      })
    }
    const commits = (r.defaultBranchRef?.target.history?.nodes ?? []).map(
      (c) => ({
        oid: c.oid,
        abbreviatedOid: c.abbreviatedOid,
        message: c.message,
        committedDate: c.committedDate,
        url: c.url,
        authorName: c.author?.name ?? c.author?.user?.login ?? null,
        authorLogin: c.author?.user?.login ?? null,
        authorAvatarUrl: c.author?.user?.avatarUrl ?? null,
      }),
    )
    return {
      repo: {
        id: r.id,
        nameWithOwner: r.nameWithOwner,
        owner: r.owner.login,
        name: r.name,
        description: r.description,
        url: r.url,
        isPrivate: r.isPrivate,
        isArchived: r.isArchived,
        isFork: r.isFork,
        pushedAt: r.pushedAt,
        stargazerCount: r.stargazerCount,
        openIssuesCount: r.openIssues.totalCount,
        defaultBranch: r.defaultBranchRef?.name ?? null,
        forkCount: r.forkCount,
        watchersCount: r.watchers.totalCount,
        primaryLanguage: r.primaryLanguage
          ? { name: r.primaryLanguage.name, color: r.primaryLanguage.color }
          : null,
        languages: r.languages.edges.map((e) => ({
          name: e.node.name,
          color: e.node.color,
          size: e.size,
        })),
      },
      recentCommits: commits,
      openPrs: r.openPrs.nodes.filter((n) => n && n.id).map(mapPr),
      openIssues: r.openIssues.nodes.filter((n) => n && n.id).map(mapIssue),
    }
  })

/* --------------------------- Mutations --------------------------- */

export const addPrComment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      number: z.number().int().positive(),
      body: z.string().min(1).max(65000),
    }),
  )
  .handler(async ({ data }) => {
    await ghRest(
      'POST',
      `/repos/${data.owner}/${data.repo}/issues/${data.number}/comments`,
      {
        body: data.body,
      },
    )
    return { ok: true }
  })

export const submitReview = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      number: z.number().int().positive(),
      event: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']),
      body: z.string().max(65000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await ghRest(
      'POST',
      `/repos/${data.owner}/${data.repo}/pulls/${data.number}/reviews`,
      {
        event: data.event,
        body: data.body ?? '',
      },
    )
    return { ok: true }
  })

export const mergePullRequest = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      number: z.number().int().positive(),
      method: z.enum(['merge', 'squash', 'rebase']).default('squash'),
    }),
  )
  .handler(async ({ data }) => {
    await ghRest(
      'PUT',
      `/repos/${data.owner}/${data.repo}/pulls/${data.number}/merge`,
      {
        merge_method: data.method,
      },
    )
    return { ok: true }
  })

export const closePullRequest = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      number: z.number().int().positive(),
    }),
  )
  .handler(async ({ data }) => {
    await ghRest(
      'PATCH',
      `/repos/${data.owner}/${data.repo}/pulls/${data.number}`,
      {
        state: 'closed',
      },
    )
    return { ok: true }
  })

export const reopenPullRequest = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      number: z.number().int().positive(),
    }),
  )
  .handler(async ({ data }) => {
    await ghRest(
      'PATCH',
      `/repos/${data.owner}/${data.repo}/pulls/${data.number}`,
      {
        state: 'open',
      },
    )
    return { ok: true }
  })

export const addIssueComment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      number: z.number().int().positive(),
      body: z.string().min(1).max(65000),
    }),
  )
  .handler(async ({ data }) => {
    await ghRest(
      'POST',
      `/repos/${data.owner}/${data.repo}/issues/${data.number}/comments`,
      {
        body: data.body,
      },
    )
    return { ok: true }
  })

export const closeIssue = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      number: z.number().int().positive(),
      reason: z.enum(['completed', 'not_planned']).default('completed'),
    }),
  )
  .handler(async ({ data }) => {
    await ghRest(
      'PATCH',
      `/repos/${data.owner}/${data.repo}/issues/${data.number}`,
      {
        state: 'closed',
        state_reason: data.reason,
      },
    )
    return { ok: true }
  })

export const reopenIssue = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      number: z.number().int().positive(),
    }),
  )
  .handler(async ({ data }) => {
    await ghRest(
      'PATCH',
      `/repos/${data.owner}/${data.repo}/issues/${data.number}`,
      {
        state: 'open',
      },
    )
    return { ok: true }
  })
