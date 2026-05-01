/**
 * Public surface of every server function. Each entity owns its own module
 * under `./api/` — keeping this file as a barrel means `lib/queries.ts`
 * (and any future callers) only ever import from one place.
 */
export { fetchAuthStatus } from './api/auth'
export { fetchInbox, searchIssues, searchPullRequests } from './api/inbox'
export {
  addPrComment,
  closePullRequest,
  fetchPullRequest,
  fetchPullRequestDiff,
  mergePullRequest,
  reopenPullRequest,
  submitReview,
} from './api/pulls'
export {
  addIssueComment,
  closeIssue,
  fetchIssue,
  reopenIssue,
} from './api/issues'
export {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationDone,
  markNotificationRead,
} from './api/notifications'
export {
  type RepoCommit,
  type RepoDetail,
  fetchRepoDetail,
  fetchRepos,
} from './api/repos'
