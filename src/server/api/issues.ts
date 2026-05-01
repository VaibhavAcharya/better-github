import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { GhError, ghGraphql, ghRest } from '#/server/gh'
import { ISSUE_DETAIL_QUERY } from '#/server/queries'
import {  mapIssue, mapTimeline } from '#/server/api/mappers'
import type {GqlIssue} from '#/server/api/mappers';
import type { GhIssueDetail } from '#/lib/types'

const ISSUE_PARAMS = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  number: z.number().int().positive(),
})

export const fetchIssue = createServerFn({ method: 'GET' })
  .inputValidator(ISSUE_PARAMS)
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

/* ----------------------------- Mutations ----------------------------- */

export const addIssueComment = createServerFn({ method: 'POST' })
  .inputValidator(ISSUE_PARAMS.extend({ body: z.string().min(1).max(65000) }))
  .handler(async ({ data }) => {
    await ghRest(
      'POST',
      `/repos/${data.owner}/${data.repo}/issues/${data.number}/comments`,
      { body: data.body },
    )
    return { ok: true }
  })

export const closeIssue = createServerFn({ method: 'POST' })
  .inputValidator(
    ISSUE_PARAMS.extend({
      reason: z.enum(['completed', 'not_planned']).default('completed'),
    }),
  )
  .handler(async ({ data }) => {
    await ghRest(
      'PATCH',
      `/repos/${data.owner}/${data.repo}/issues/${data.number}`,
      { state: 'closed', state_reason: data.reason },
    )
    return { ok: true }
  })

export const reopenIssue = createServerFn({ method: 'POST' })
  .inputValidator(ISSUE_PARAMS)
  .handler(async ({ data }) => {
    await ghRest(
      'PATCH',
      `/repos/${data.owner}/${data.repo}/issues/${data.number}`,
      { state: 'open' },
    )
    return { ok: true }
  })
