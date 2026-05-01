/**
 * Centralized GraphQL queries. Kept as plain strings (not template tags) so we
 * don't depend on a graphql client — `gh api graphql` does the talking.
 */

export const PR_FIELDS_FRAGMENT = /* GraphQL */ `
  fragment PrFields on PullRequest {
    id
    number
    title
    url
    state
    isDraft
    createdAt
    updatedAt
    additions
    deletions
    changedFiles
    mergeable
    reviewDecision
    repository {
      owner {
        login
      }
      name
      nameWithOwner
    }
    author {
      login
      avatarUrl
      url
    }
    labels(first: 10) {
      nodes {
        name
        color
      }
    }
    comments {
      totalCount
    }
    commits(last: 1) {
      nodes {
        commit {
          statusCheckRollup {
            state
          }
        }
      }
    }
  }
`

export const ISSUE_FIELDS_FRAGMENT = /* GraphQL */ `
  fragment IssueFields on Issue {
    id
    number
    title
    url
    state
    createdAt
    updatedAt
    repository {
      owner {
        login
      }
      name
      nameWithOwner
    }
    author {
      login
      avatarUrl
      url
    }
    labels(first: 10) {
      nodes {
        name
        color
      }
    }
    comments {
      totalCount
    }
    assignees(first: 10) {
      nodes {
        login
        avatarUrl
        url
      }
    }
  }
`

export const VIEWER_QUERY = /* GraphQL */ `
  query Viewer {
    viewer {
      login
      name
      avatarUrl
      url
    }
  }
`

/**
 * Single batched query for the dashboard inbox. One round trip beats five
 * sequential REST calls for the landing page experience.
 */
export const INBOX_QUERY =
  PR_FIELDS_FRAGMENT +
  ISSUE_FIELDS_FRAGMENT +
  /* GraphQL */ `
    query Inbox(
      $reviewQuery: String!
      $authoredQuery: String!
      $recentQuery: String!
      $assignedQuery: String!
      $mentionsQuery: String!
      $first: Int = 25
    ) {
      reviewRequested: search(query: $reviewQuery, type: ISSUE, first: $first) {
        nodes {
          ... on PullRequest {
            ...PrFields
          }
        }
      }
      yourOpen: search(query: $authoredQuery, type: ISSUE, first: $first) {
        nodes {
          ... on PullRequest {
            ...PrFields
          }
        }
      }
      recentlyUpdated: search(query: $recentQuery, type: ISSUE, first: $first) {
        nodes {
          ... on PullRequest {
            ...PrFields
          }
        }
      }
      assignedIssues: search(
        query: $assignedQuery
        type: ISSUE
        first: $first
      ) {
        nodes {
          ... on Issue {
            ...IssueFields
          }
        }
      }
      mentioned: search(query: $mentionsQuery, type: ISSUE, first: $first) {
        nodes {
          ... on PullRequest {
            ...PrFields
          }
          ... on Issue {
            ...IssueFields
          }
        }
      }
    }
  `

/** Generic search (for the global PR / issue list pages). */
export const SEARCH_PRS_QUERY =
  PR_FIELDS_FRAGMENT +
  /* GraphQL */ `
    query SearchPrs($query: String!, $first: Int = 50) {
      search(query: $query, type: ISSUE, first: $first) {
        issueCount
        nodes {
          ... on PullRequest {
            ...PrFields
          }
        }
      }
    }
  `

export const SEARCH_ISSUES_QUERY =
  ISSUE_FIELDS_FRAGMENT +
  /* GraphQL */ `
    query SearchIssues($query: String!, $first: Int = 50) {
      search(query: $query, type: ISSUE, first: $first) {
        issueCount
        nodes {
          ... on Issue {
            ...IssueFields
          }
        }
      }
    }
  `

export const PR_DETAIL_QUERY = /* GraphQL */ `
  query PrDetail($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        id
        number
        title
        body
        url
        state
        isDraft
        createdAt
        updatedAt
        closedAt
        mergedAt
        mergeable
        reviewDecision
        additions
        deletions
        changedFiles
        headRefName
        baseRefName
        repository {
          owner {
            login
          }
          name
          nameWithOwner
        }
        author {
          login
          avatarUrl
          url
        }
        mergedBy {
          login
          avatarUrl
          url
        }
        labels(first: 20) {
          nodes {
            name
            color
          }
        }
        assignees(first: 10) {
          nodes {
            login
            avatarUrl
            url
          }
        }
        reviewRequests(first: 20) {
          nodes {
            requestedReviewer {
              ... on User {
                login
                avatarUrl
                url
              }
              ... on Team {
                name
                avatarUrl
                url
              }
            }
          }
        }
        comments {
          totalCount
        }
        commits(last: 1) {
          nodes {
            commit {
              statusCheckRollup {
                state
                contexts(first: 50) {
                  nodes {
                    __typename
                    ... on CheckRun {
                      name
                      conclusion
                      status
                      startedAt
                      completedAt
                      detailsUrl
                    }
                    ... on StatusContext {
                      context
                      state
                      targetUrl
                    }
                  }
                }
              }
            }
          }
        }
        timelineItems(
          first: 100
          itemTypes: [
            ISSUE_COMMENT
            PULL_REQUEST_REVIEW
            CLOSED_EVENT
            REOPENED_EVENT
            MERGED_EVENT
            REVIEW_REQUESTED_EVENT
            REVIEW_REQUEST_REMOVED_EVENT
            LABELED_EVENT
            UNLABELED_EVENT
            ASSIGNED_EVENT
            UNASSIGNED_EVENT
            HEAD_REF_FORCE_PUSHED_EVENT
            REFERENCED_EVENT
            CROSS_REFERENCED_EVENT
            RENAMED_TITLE_EVENT
          ]
        ) {
          nodes {
            __typename
            ... on IssueComment {
              id
              body
              createdAt
              author {
                login
                avatarUrl
                url
              }
            }
            ... on PullRequestReview {
              id
              body
              state
              submittedAt
              author {
                login
                avatarUrl
                url
              }
            }
            ... on ClosedEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
            }
            ... on ReopenedEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
            }
            ... on MergedEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
              commit {
                abbreviatedOid
              }
            }
            ... on ReviewRequestedEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
              requestedReviewer {
                ... on User {
                  login
                }
                ... on Team {
                  name
                }
              }
            }
            ... on LabeledEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
              label {
                name
                color
              }
            }
            ... on UnlabeledEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
              label {
                name
              }
            }
            ... on AssignedEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
              assignee {
                ... on User {
                  login
                }
              }
            }
            ... on HeadRefForcePushedEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
              beforeCommit {
                abbreviatedOid
              }
              afterCommit {
                abbreviatedOid
              }
            }
            ... on RenamedTitleEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
              previousTitle
              currentTitle
            }
          }
        }
        files(first: 100) {
          nodes {
            path
            additions
            deletions
            changeType
          }
        }
      }
    }
  }
`

export const ISSUE_DETAIL_QUERY = /* GraphQL */ `
  query IssueDetail($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
        id
        number
        title
        body
        url
        state
        createdAt
        updatedAt
        closedAt
        repository {
          owner {
            login
          }
          name
          nameWithOwner
        }
        author {
          login
          avatarUrl
          url
        }
        labels(first: 20) {
          nodes {
            name
            color
          }
        }
        assignees(first: 10) {
          nodes {
            login
            avatarUrl
            url
          }
        }
        comments {
          totalCount
        }
        timelineItems(
          first: 100
          itemTypes: [
            ISSUE_COMMENT
            CLOSED_EVENT
            REOPENED_EVENT
            LABELED_EVENT
            UNLABELED_EVENT
            ASSIGNED_EVENT
            UNASSIGNED_EVENT
            CROSS_REFERENCED_EVENT
            RENAMED_TITLE_EVENT
          ]
        ) {
          nodes {
            __typename
            ... on IssueComment {
              id
              body
              createdAt
              author {
                login
                avatarUrl
                url
              }
            }
            ... on ClosedEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
            }
            ... on ReopenedEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
            }
            ... on LabeledEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
              label {
                name
                color
              }
            }
            ... on UnlabeledEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
              label {
                name
              }
            }
            ... on AssignedEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
              assignee {
                ... on User {
                  login
                }
              }
            }
            ... on RenamedTitleEvent {
              id
              createdAt
              actor {
                login
                avatarUrl
                url
              }
              previousTitle
              currentTitle
            }
          }
        }
      }
    }
  }
`

export const REPOS_QUERY = /* GraphQL */ `
  query MyRepos($first: Int = 50, $after: String) {
    viewer {
      repositories(
        first: $first
        after: $after
        orderBy: { field: PUSHED_AT, direction: DESC }
        affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          nameWithOwner
          name
          description
          url
          isPrivate
          isArchived
          isFork
          pushedAt
          stargazerCount
          defaultBranchRef {
            name
          }
          owner {
            login
          }
          primaryLanguage {
            name
            color
          }
          issues(states: OPEN) {
            totalCount
          }
        }
      }
    }
  }
`

export const REPO_DETAIL_QUERY =
  PR_FIELDS_FRAGMENT +
  ISSUE_FIELDS_FRAGMENT +
  /* GraphQL */ `
    query RepoDetail($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
        nameWithOwner
        name
        description
        url
        isPrivate
        isArchived
        isFork
        pushedAt
        stargazerCount
        forkCount
        watchers {
          totalCount
        }
        defaultBranchRef {
          name
          target {
            ... on Commit {
              history(first: 10) {
                nodes {
                  oid
                  abbreviatedOid
                  message
                  committedDate
                  url
                  author {
                    name
                    user {
                      login
                      avatarUrl
                    }
                  }
                }
              }
            }
          }
        }
        owner {
          login
        }
        primaryLanguage {
          name
          color
        }
        languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
          edges {
            size
            node {
              name
              color
            }
          }
        }
        openPrs: pullRequests(
          first: 10
          states: OPEN
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          totalCount
          nodes {
            ...PrFields
          }
        }
        openIssues: issues(
          first: 10
          states: OPEN
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          totalCount
          nodes {
            ...IssueFields
          }
        }
      }
    }
  `
