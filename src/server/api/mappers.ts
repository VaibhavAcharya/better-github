import type {
  GhActor,
  GhCheckState,
  GhIssueState,
  GhIssueSummary,
  GhLabel,
  GhMergeable,
  GhPrState,
  GhPrSummary,
  GhTimelineItem,
} from '#/lib/types'

/**
 * Mappers between GitHub's GraphQL responses and our narrower internal types.
 * Kept here (rather than inlined in each server function) so PR / issue / inbox
 * endpoints all serialise the same shape into TanStack Query, and so we have
 * one place to add fields when the UI starts asking for more.
 */

export interface GqlActor {
  login: string
  avatarUrl: string
  url?: string
}

export interface GqlLabel {
  name: string
  color: string
}

export interface GqlRepoRef {
  owner: { login: string }
  name: string
  nameWithOwner: string
}

export interface GqlPr {
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

export interface GqlIssue {
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

export function mapActor(a: GqlActor | null | undefined): GhActor | null {
  if (!a || !a.login) return null
  return { login: a.login, avatarUrl: a.avatarUrl, url: a.url }
}

export function mapLabels(
  src: { nodes: ReadonlyArray<GqlLabel> } | undefined,
): ReadonlyArray<GhLabel> {
  return src?.nodes?.map((n) => ({ name: n.name, color: n.color })) ?? []
}

export function mapPr(p: GqlPr): GhPrSummary {
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

export function mapIssue(i: GqlIssue): GhIssueSummary {
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

/**
 * Convert the GraphQL union of timeline items into our flat tagged
 * representation (`comment` / `review` / `event`). Sorted ascending by
 * timestamp so the UI just renders top-to-bottom.
 */
export function mapTimeline(
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
          state: n.state as never,
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
