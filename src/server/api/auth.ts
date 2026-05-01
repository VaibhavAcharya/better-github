import { createServerFn } from '@tanstack/react-start'
import { GhError, ghGraphql, runGh } from '#/server/gh'
import { VIEWER_QUERY } from '#/server/queries'
import type { GhAuthStatus, GhUser } from '#/lib/types'

/**
 * Reports whether the local `gh` CLI is installed and authenticated, and the
 * signed-in user. Errors are caught and surfaced as structured `errorCode`
 * + `errorMessage` + `errorHint` so the UI's AuthBanner can render specific
 * remediation instructions instead of a generic "something went wrong".
 */
export const fetchAuthStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GhAuthStatus> => {
    let ghVersion: string | null = null
    try {
      const out = await runGh(['--version'])
      ghVersion = out.split('\n')[0]?.replace(/^gh version\s*/, '') ?? null
    } catch (err) {
      if (err instanceof GhError) {
        return {
          authenticated: false,
          user: null,
          hostname: 'github.com',
          ghVersion: null,
          errorCode: err.code,
          errorMessage: err.message,
          errorHint: err.hint,
        }
      }
      throw err
    }

    try {
      const data = await ghGraphql<{ viewer: GhUser }>(VIEWER_QUERY)
      return {
        authenticated: true,
        user: data.viewer,
        hostname: 'github.com',
        ghVersion,
        errorCode: null,
        errorMessage: null,
        errorHint: null,
      }
    } catch (err) {
      if (err instanceof GhError) {
        return {
          authenticated: false,
          user: null,
          hostname: 'github.com',
          ghVersion,
          errorCode: err.code,
          errorMessage: err.message,
          errorHint: err.hint,
        }
      }
      throw err
    }
  },
)
