/**
 * Shared types between server functions and the UI. Kept narrow on purpose —
 * we only model fields we actually render, so the GraphQL queries stay small.
 */

export interface GhUser {
  login: string
  name: string | null
  avatarUrl: string
  url: string
}

export interface GhActor {
  login: string
  avatarUrl: string
  url?: string
}

export interface GhLabel {
  name: string
  color: string
}

export type GhCheckState =
  | 'SUCCESS'
  | 'FAILURE'
  | 'PENDING'
  | 'ERROR'
  | 'EXPECTED'
  | 'NEUTRAL'
  | 'CANCELLED'
  | 'SKIPPED'
  | 'TIMED_OUT'
  | 'ACTION_REQUIRED'
  | 'STARTUP_FAILURE'

export type GhPrState = 'OPEN' | 'CLOSED' | 'MERGED'
export type GhIssueState = 'OPEN' | 'CLOSED'

export type GhMergeable = 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'

export interface GhRepoRef {
  owner: string
  name: string
  nameWithOwner: string
}

export interface GhPrSummary {
  id: string
  number: number
  title: string
  url: string
  state: GhPrState
  isDraft: boolean
  createdAt: string
  updatedAt: string
  repo: GhRepoRef
  author: GhActor | null
  additions: number
  deletions: number
  changedFiles: number
  comments: number
  labels: ReadonlyArray<GhLabel>
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
  checkState: GhCheckState | null
  mergeable: GhMergeable | null
}

export interface GhIssueSummary {
  id: string
  number: number
  title: string
  url: string
  state: GhIssueState
  createdAt: string
  updatedAt: string
  repo: GhRepoRef
  author: GhActor | null
  comments: number
  labels: ReadonlyArray<GhLabel>
  assignees: ReadonlyArray<GhActor>
}

export interface GhCheckRun {
  name: string
  conclusion: GhCheckState | null
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'WAITING' | 'PENDING' | null
  detailsUrl: string | null
  durationMs: number | null
}

export interface GhTimelineComment {
  kind: 'comment'
  id: string
  author: GhActor | null
  body: string
  createdAt: string
}

export interface GhTimelineReview {
  kind: 'review'
  id: string
  author: GhActor | null
  state:
    | 'APPROVED'
    | 'CHANGES_REQUESTED'
    | 'COMMENTED'
    | 'DISMISSED'
    | 'PENDING'
  body: string
  submittedAt: string | null
}

export interface GhTimelineEvent {
  kind: 'event'
  id: string
  type: string
  actor: GhActor | null
  createdAt: string
  detail: string | null
}

export type GhTimelineItem =
  | GhTimelineComment
  | GhTimelineReview
  | GhTimelineEvent

export interface GhPrDetail extends GhPrSummary {
  body: string
  headRefName: string
  baseRefName: string
  assignees: ReadonlyArray<GhActor>
  requestedReviewers: ReadonlyArray<GhActor>
  checks: ReadonlyArray<GhCheckRun>
  timeline: ReadonlyArray<GhTimelineItem>
  closedAt: string | null
  mergedAt: string | null
  mergedBy: GhActor | null
}

export interface GhIssueDetail extends GhIssueSummary {
  body: string
  closedAt: string | null
  timeline: ReadonlyArray<GhTimelineItem>
}

export interface GhNotification {
  id: string
  unread: boolean
  reason: string
  updatedAt: string
  title: string
  type: 'PullRequest' | 'Issue' | 'Discussion' | 'Commit' | 'Release' | string
  repo: GhRepoRef
  /** Resolved web url for the underlying subject (PR/issue/etc.). May be null. */
  subjectUrl: string | null
  /** Resolved number for PR/issue notifications, when applicable. */
  number: number | null
}

export interface GhRepo {
  id: string
  nameWithOwner: string
  owner: string
  name: string
  description: string | null
  url: string
  isPrivate: boolean
  isArchived: boolean
  isFork: boolean
  primaryLanguage: { name: string; color: string | null } | null
  pushedAt: string | null
  stargazerCount: number
  openIssuesCount: number
  defaultBranch: string | null
}

export interface GhAuthStatus {
  authenticated: boolean
  user: GhUser | null
  hostname: string
  ghVersion: string | null
  errorCode: import('#/server/gh').GhErrorCode | null
  errorMessage: string | null
  errorHint: string | null
}

export interface GhInbox {
  reviewRequested: ReadonlyArray<GhPrSummary>
  yourOpenPrs: ReadonlyArray<GhPrSummary>
  recentlyUpdatedPrs: ReadonlyArray<GhPrSummary>
  assignedIssues: ReadonlyArray<GhIssueSummary>
  mentioned: ReadonlyArray<GhPrSummary | GhIssueSummary>
}

export interface GhFileChange {
  path: string
  previousPath: string | null
  changeType:
    | 'ADDED'
    | 'CHANGED'
    | 'COPIED'
    | 'DELETED'
    | 'MODIFIED'
    | 'RENAMED'
    | 'TYPE_CHANGED'
  additions: number
  deletions: number
}
