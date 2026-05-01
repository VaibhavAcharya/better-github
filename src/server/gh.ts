import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Stable error code surface for everything that can go wrong shelling out to `gh`.
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

export class GhError extends Error {
  code: GhErrorCode
  exitCode: number | null
  stderr: string
  hint: string | null

  constructor(opts: {
    message: string
    code: GhErrorCode
    exitCode?: number | null
    stderr?: string
    hint?: string | null
  }) {
    super(opts.message)
    this.name = 'GhError'
    this.code = opts.code
    this.exitCode = opts.exitCode ?? null
    this.stderr = opts.stderr ?? ''
    this.hint = opts.hint ?? null
  }
}

interface RunGhOptions {
  /** Optional stdin payload, used for things like comment bodies. */
  input?: string
  /** Override default 30s timeout for slow operations like big diffs. */
  timeoutMs?: number
  /** Larger buffer for diff/log calls that can return MBs. */
  maxBufferMB?: number
}

const DEFAULT_TIMEOUT = 30_000

/**
 * Run `gh` with strict argv (no shell expansion) and return raw stdout.
 * Maps known failure modes to GhError codes so the UI can render specific guidance.
 */
export async function runGh(
  args: ReadonlyArray<string>,
  opts: RunGhOptions = {},
): Promise<string> {
  try {
    const { stdout } = await execFileAsync('gh', args.slice(), {
      timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT,
      maxBuffer: (opts.maxBufferMB ?? 64) * 1024 * 1024,
      encoding: 'utf8',
      env: { ...process.env, GH_PROMPT_DISABLED: '1', NO_COLOR: '1' },
      ...(opts.input !== undefined ? { input: opts.input } : {}),
    } as Parameters<typeof execFileAsync>[2] & { input?: string })
    return typeof stdout === 'string' ? stdout : stdout.toString('utf8')
  } catch (err) {
    throw mapExecError(err, args)
  }
}

function mapExecError(err: unknown, args: ReadonlyArray<string>): GhError {
  // node-style error with code/signal/stderr
  const e = err as {
    code?: string | number
    killed?: boolean
    signal?: string
    stderr?: string | Buffer
    stdout?: string | Buffer
    message?: string
  }

  const stderr = (
    typeof e.stderr === 'string' ? e.stderr : e.stderr?.toString() || ''
  ).trim()
  const exitCode = typeof e.code === 'number' ? e.code : null

  if (e.code === 'ENOENT') {
    return new GhError({
      message: 'GitHub CLI not found',
      code: 'not-installed',
      hint: 'Install gh from https://cli.github.com and run `gh auth login`.',
      stderr,
    })
  }
  if (e.code === 'ETIMEDOUT' || e.killed) {
    return new GhError({
      message: `gh ${args.join(' ')} timed out`,
      code: 'timed-out',
      stderr,
    })
  }

  const lower = stderr.toLowerCase()
  if (
    lower.includes('not logged into') ||
    lower.includes('authentication required') ||
    lower.includes('gh auth login')
  ) {
    return new GhError({
      message: 'gh is not authenticated',
      code: 'not-authed',
      hint: 'Run `gh auth login` in your terminal to sign in.',
      exitCode,
      stderr,
    })
  }
  if (
    lower.includes('api rate limit exceeded') ||
    lower.includes('secondary rate limit')
  ) {
    return new GhError({
      message: 'GitHub API rate limit exceeded',
      code: 'rate-limited',
      exitCode,
      stderr,
    })
  }
  if (
    lower.includes('could not resolve host') ||
    lower.includes('network is unreachable') ||
    lower.includes('dial tcp')
  ) {
    return new GhError({
      message: 'No network connection to GitHub',
      code: 'network',
      exitCode,
      stderr,
    })
  }
  if (
    lower.includes('http 404') ||
    lower.includes('not found') ||
    lower.includes('could not find')
  ) {
    return new GhError({
      message: 'Resource not found',
      code: 'not-found',
      exitCode,
      stderr,
    })
  }
  if (lower.includes('http 403') || lower.includes('forbidden')) {
    return new GhError({
      message: 'Forbidden',
      code: 'forbidden',
      exitCode,
      stderr,
    })
  }

  return new GhError({
    message: stderr || e.message || 'gh command failed',
    code: 'unknown',
    exitCode,
    stderr,
  })
}

/** Run a `gh` command and parse stdout as JSON. */
export async function ghJson<T>(
  args: ReadonlyArray<string>,
  opts?: RunGhOptions,
): Promise<T> {
  const out = await runGh(args, opts)
  if (!out.trim()) return null as unknown as T
  try {
    return JSON.parse(out) as T
  } catch (err) {
    throw new GhError({
      message: `Failed to parse JSON from gh ${args.join(' ')}: ${(err as Error).message}`,
      code: 'parse',
      stderr: out.slice(0, 2000),
    })
  }
}

/**
 * Call the GitHub GraphQL API via `gh api graphql`. Reuses the user's existing
 * auth and never holds a token in this process.
 */
export async function ghGraphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const args = ['api', 'graphql', '-f', `query=${query}`]
  for (const [key, value] of Object.entries(variables)) {
    if (value === undefined || value === null) continue
    if (typeof value === 'number' || typeof value === 'boolean') {
      args.push('-F', `${key}=${value}`)
    } else if (typeof value === 'string') {
      args.push('-f', `${key}=${value}`)
    } else {
      args.push('-f', `${key}=${JSON.stringify(value)}`)
    }
  }
  type GraphqlEnvelope = {
    data?: T
    errors?: ReadonlyArray<{ message: string }>
  }
  const body = await ghJson<GraphqlEnvelope>(args, { timeoutMs: 60_000 })
  if (body.errors?.length) {
    throw new GhError({
      message: body.errors.map((e) => e.message).join('; '),
      code: 'unknown',
    })
  }
  if (!body.data) {
    throw new GhError({
      message: 'GraphQL response missing data',
      code: 'parse',
    })
  }
  return body.data
}

/** Call the REST API with arbitrary method/path. */
export async function ghRest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const args = ['api', '--method', method, path]
  if (body) {
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined || value === null) continue
      if (typeof value === 'number' || typeof value === 'boolean') {
        args.push('-F', `${key}=${value}`)
      } else if (typeof value === 'string') {
        args.push('-f', `${key}=${value}`)
      } else {
        args.push('--raw-field', `${key}=${JSON.stringify(value)}`)
      }
    }
  }
  if (method === 'DELETE' || method === 'PATCH' || method === 'PUT') {
    return ghJson<T>(args, { timeoutMs: 60_000 })
  }
  return ghJson<T>(args, { timeoutMs: 60_000 })
}

/**
 * Convenience: call REST endpoint and tolerate empty bodies (eg. 204 No Content).
 */
export async function ghRestVoid(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<void> {
  const args = ['api', '--method', method, '--silent', path]
  if (body) {
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined || value === null) continue
      if (typeof value === 'number' || typeof value === 'boolean') {
        args.push('-F', `${key}=${value}`)
      } else if (typeof value === 'string') {
        args.push('-f', `${key}=${value}`)
      }
    }
  }
  await runGh(args, { timeoutMs: 30_000 })
}
