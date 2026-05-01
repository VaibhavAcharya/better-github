/**
 * Client-safe error vocabulary. The actual `GhError` class lives in
 * `src/server/gh.ts` and reaches for `node:child_process`, so we cannot
 * import it (or its types) from any module that ends up in the browser
 * bundle. This file holds the bits the UI needs: the stable error code
 * union, plus a structural type guard that works for the deserialized
 * error shapes TanStack Start hands back across the RPC boundary.
 */

export type GhErrorCode =
  | 'not-installed'
  | 'not-authed'
  | 'rate-limited'
  | 'network'
  | 'not-found'
  | 'forbidden'
  | 'timed-out'
  | 'parse'
  | 'unknown'

const GH_ERROR_CODES: ReadonlyArray<GhErrorCode> = [
  'not-installed',
  'not-authed',
  'rate-limited',
  'network',
  'not-found',
  'forbidden',
  'timed-out',
  'parse',
  'unknown',
]

export interface GhErrorShape {
  code: GhErrorCode
  message: string
  hint: string | null
}

/**
 * Duck-type check for an error originating from the gh CLI wrapper. The
 * server throws `GhError` instances; TanStack Start's RPC layer serializes
 * them to JSON and the client receives a plain object, so `instanceof`
 * would always be false here — we structurally check the shape instead.
 */
export function isGhErrorShape(value: unknown): value is GhErrorShape {
  if (!value || typeof value !== 'object') return false
  const v = value as { code?: unknown; message?: unknown }
  if (typeof v.code !== 'string') return false
  if (typeof v.message !== 'string') return false
  return (GH_ERROR_CODES as ReadonlyArray<string>).includes(v.code)
}
