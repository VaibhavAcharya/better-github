import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { ghGraphql } from '#/server/gh'
import {
  INBOX_QUERY,
  SEARCH_ISSUES_QUERY,
  SEARCH_PRS_QUERY,
} from '#/server/queries'
import {
  
  
  mapIssue,
  mapPr
} from '#/server/api/mappers'
import type {GqlIssue, GqlPr} from '#/server/api/mappers';
import type { GhInbox, GhIssueSummary, GhPrSummary } from '#/lib/types'

/**
 * Single batched GraphQL query for the dashboard landing page. Five GitHub
 * search aliases (review-requested, authored, recent, assigned, mentions) all
 * return through one round trip — important because each `search()` already
 * uses a chunk of GitHub's secondary rate limit.
 */
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
