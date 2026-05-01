import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { ghJson, ghRestVoid } from '#/server/gh'
import type { GhNotification } from '#/lib/types'

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

/**
 * Map a notification subject's REST API URL into a github.com web URL. The
 * REST endpoint returns paths like `/repos/foo/bar/pulls/123` even though the
 * canonical web URL uses `/pull/123` (singular). We normalise that here so
 * "open on github" links never 404.
 */
function toWebUrl(apiUrl: string | null, type: string): string | null {
  if (!apiUrl) return null
  const match =
    /\/repos\/([^/]+)\/([^/]+)\/(pulls|issues|discussions)\/(\d+)/.exec(apiUrl)
  if (match) {
    const segment =
      type === 'PullRequest' ? 'pull' : match[3] === 'pulls' ? 'pull' : match[3]
    return `https://github.com/${match[1]}/${match[2]}/${segment}/${match[4]}`
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
