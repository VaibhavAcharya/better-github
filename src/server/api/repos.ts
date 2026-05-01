import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { GhError, ghGraphql } from '#/server/gh'
import { REPOS_QUERY, REPO_DETAIL_QUERY } from '#/server/queries'
import {
  
  
  mapIssue,
  mapPr
} from '#/server/api/mappers'
import type {GqlIssue, GqlPr} from '#/server/api/mappers';
import type { GhIssueSummary, GhPrSummary, GhRepo } from '#/lib/types'

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
      viewer: { repositories: { nodes: ReadonlyArray<GqlRepo> } }
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
