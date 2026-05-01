import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { GhError, ghGraphql, ghRest, runGh } from '#/server/gh'
import { PR_DETAIL_QUERY } from '#/server/queries'
import {
  
  
  mapActor,
  mapPr,
  mapTimeline
} from '#/server/api/mappers'
import type {GqlActor, GqlPr} from '#/server/api/mappers';
import type {
  GhActor,
  GhCheckRun,
  GhCheckState,
  GhFileChange,
  GhPrDetail,
} from '#/lib/types'

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

const PR_PARAMS = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  number: z.number().int().positive(),
})

/** Full PR detail (body, timeline, checks, files) for the detail page. */
export const fetchPullRequest = createServerFn({ method: 'GET' })
  .inputValidator(PR_PARAMS)
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
        assignees: p.assignees.nodes
          .map(mapActor)
          .filter((x): x is GhActor => x !== null),
        requestedReviewers: p.reviewRequests.nodes
          .map((r) => mapActor(r.requestedReviewer as GqlActor | null))
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

/**
 * Raw unified diff for a PR. We hit the REST endpoint with the diff Accept
 * header rather than the GraphQL one because GraphQL doesn't expose the patch
 * body and `gh pr diff` would shell out twice.
 */
export const fetchPullRequestDiff = createServerFn({ method: 'GET' })
  .inputValidator(PR_PARAMS)
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

/* ----------------------------- Mutations ----------------------------- */

export const addPrComment = createServerFn({ method: 'POST' })
  .inputValidator(PR_PARAMS.extend({ body: z.string().min(1).max(65000) }))
  .handler(async ({ data }) => {
    await ghRest(
      'POST',
      `/repos/${data.owner}/${data.repo}/issues/${data.number}/comments`,
      { body: data.body },
    )
    return { ok: true }
  })

export const submitReview = createServerFn({ method: 'POST' })
  .inputValidator(
    PR_PARAMS.extend({
      event: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']),
      body: z.string().max(65000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await ghRest(
      'POST',
      `/repos/${data.owner}/${data.repo}/pulls/${data.number}/reviews`,
      { event: data.event, body: data.body ?? '' },
    )
    return { ok: true }
  })

export const mergePullRequest = createServerFn({ method: 'POST' })
  .inputValidator(
    PR_PARAMS.extend({
      method: z.enum(['merge', 'squash', 'rebase']).default('squash'),
    }),
  )
  .handler(async ({ data }) => {
    await ghRest(
      'PUT',
      `/repos/${data.owner}/${data.repo}/pulls/${data.number}/merge`,
      { merge_method: data.method },
    )
    return { ok: true }
  })

export const closePullRequest = createServerFn({ method: 'POST' })
  .inputValidator(PR_PARAMS)
  .handler(async ({ data }) => {
    await ghRest(
      'PATCH',
      `/repos/${data.owner}/${data.repo}/pulls/${data.number}`,
      { state: 'closed' },
    )
    return { ok: true }
  })

export const reopenPullRequest = createServerFn({ method: 'POST' })
  .inputValidator(PR_PARAMS)
  .handler(async ({ data }) => {
    await ghRest(
      'PATCH',
      `/repos/${data.owner}/${data.repo}/pulls/${data.number}`,
      { state: 'open' },
    )
    return { ok: true }
  })
