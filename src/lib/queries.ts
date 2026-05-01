import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addIssueComment,
  addPrComment,
  closeIssue,
  closePullRequest,
  fetchAuthStatus,
  fetchInbox,
  fetchIssue,
  fetchNotifications,
  fetchPullRequest,
  fetchPullRequestDiff,
  fetchRepoDetail,
  fetchRepos,
  markAllNotificationsRead,
  markNotificationDone,
  markNotificationRead,
  mergePullRequest,
  reopenIssue,
  reopenPullRequest,
  searchIssues,
  searchPullRequests,
  submitReview,
} from '#/server/api'

/**
 * Query keys live in one place so mutations can invalidate them precisely.
 */
export const qk = {
  auth: () => ['auth'] as const,
  inbox: (repos?: ReadonlyArray<string>) => ['inbox', repos ?? []] as const,
  notifications: (filter?: { all?: boolean; participating?: boolean }) =>
    ['notifications', filter ?? {}] as const,
  searchPrs: (query: string) => ['searchPrs', query] as const,
  searchIssues: (query: string) => ['searchIssues', query] as const,
  pr: (owner: string, repo: string, number: number) =>
    ['pr', owner, repo, number] as const,
  prDiff: (owner: string, repo: string, number: number) =>
    ['pr-diff', owner, repo, number] as const,
  issue: (owner: string, repo: string, number: number) =>
    ['issue', owner, repo, number] as const,
  repos: () => ['repos'] as const,
  repo: (owner: string, repo: string) => ['repo', owner, repo] as const,
}

const STALE_SHORT = 30 * 1000
const STALE_MED = 60 * 1000
const STALE_LONG = 5 * 60 * 1000

export function useAuthStatus() {
  return useQuery({
    queryKey: qk.auth(),
    queryFn: () => fetchAuthStatus(),
    staleTime: STALE_LONG,
    refetchOnWindowFocus: false,
  })
}

export function useInbox(opts?: {
  repos?: ReadonlyArray<string>
  refetchInterval?: number
}) {
  return useQuery({
    queryKey: qk.inbox(opts?.repos),
    queryFn: () =>
      fetchInbox({
        data: opts?.repos?.length ? { repoFilter: [...opts.repos] } : undefined,
      }),
    staleTime: STALE_MED,
    refetchInterval: opts?.refetchInterval,
  })
}

export function useNotifications(opts?: {
  all?: boolean
  participating?: boolean
  refetchInterval?: number
}) {
  return useQuery({
    queryKey: qk.notifications({
      all: opts?.all,
      participating: opts?.participating,
    }),
    queryFn: () =>
      fetchNotifications({
        data: { all: opts?.all, participating: opts?.participating },
      }),
    staleTime: STALE_SHORT,
    refetchInterval: opts?.refetchInterval,
  })
}

export function useSearchPrs(query: string, enabled = true) {
  return useQuery({
    queryKey: qk.searchPrs(query),
    queryFn: () => searchPullRequests({ data: { query, limit: 75 } }),
    staleTime: STALE_MED,
    enabled: enabled && query.trim().length > 0,
  })
}

export function useSearchIssues(query: string, enabled = true) {
  return useQuery({
    queryKey: qk.searchIssues(query),
    queryFn: () => searchIssues({ data: { query, limit: 75 } }),
    staleTime: STALE_MED,
    enabled: enabled && query.trim().length > 0,
  })
}

export function usePullRequest(owner: string, repo: string, number: number) {
  return useQuery({
    queryKey: qk.pr(owner, repo, number),
    queryFn: () => fetchPullRequest({ data: { owner, repo, number } }),
    staleTime: STALE_MED,
  })
}

export function usePullRequestDiff(
  owner: string,
  repo: string,
  number: number,
  enabled = true,
) {
  return useQuery({
    queryKey: qk.prDiff(owner, repo, number),
    queryFn: () => fetchPullRequestDiff({ data: { owner, repo, number } }),
    staleTime: STALE_LONG,
    enabled,
  })
}

export function useIssue(owner: string, repo: string, number: number) {
  return useQuery({
    queryKey: qk.issue(owner, repo, number),
    queryFn: () => fetchIssue({ data: { owner, repo, number } }),
    staleTime: STALE_MED,
  })
}

export function useRepos() {
  return useQuery({
    queryKey: qk.repos(),
    queryFn: () => fetchRepos(),
    staleTime: STALE_LONG,
  })
}

export function useRepoDetail(owner: string, repo: string) {
  return useQuery({
    queryKey: qk.repo(owner, repo),
    queryFn: () => fetchRepoDetail({ data: { owner, repo } }),
    staleTime: STALE_MED,
  })
}

/* ----------------------------- Mutations ----------------------------- */

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (threadId: string) =>
      markNotificationRead({ data: { threadId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkNotificationDone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (threadId: string) =>
      markNotificationDone({ data: { threadId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useAddPrComment(owner: string, repo: string, number: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      addPrComment({ data: { owner, repo, number, body } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.pr(owner, repo, number) }),
  })
}

export function useSubmitReview(owner: string, repo: string, number: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'
      body?: string
    }) =>
      submitReview({
        data: { owner, repo, number, event: input.event, body: input.body },
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.pr(owner, repo, number) }),
  })
}

export function useMergePullRequest(
  owner: string,
  repo: string,
  number: number,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (method: 'merge' | 'squash' | 'rebase') =>
      mergePullRequest({ data: { owner, repo, number, method } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.pr(owner, repo, number) }),
  })
}

export function useClosePullRequest(
  owner: string,
  repo: string,
  number: number,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => closePullRequest({ data: { owner, repo, number } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.pr(owner, repo, number) }),
  })
}

export function useReopenPullRequest(
  owner: string,
  repo: string,
  number: number,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => reopenPullRequest({ data: { owner, repo, number } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.pr(owner, repo, number) }),
  })
}

export function useAddIssueComment(
  owner: string,
  repo: string,
  number: number,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      addIssueComment({ data: { owner, repo, number, body } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.issue(owner, repo, number) }),
  })
}

export function useCloseIssue(owner: string, repo: string, number: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason: 'completed' | 'not_planned' = 'completed') =>
      closeIssue({ data: { owner, repo, number, reason } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.issue(owner, repo, number) }),
  })
}

export function useReopenIssue(owner: string, repo: string, number: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => reopenIssue({ data: { owner, repo, number } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.issue(owner, repo, number) }),
  })
}
