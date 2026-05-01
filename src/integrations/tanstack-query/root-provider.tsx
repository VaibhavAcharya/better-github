import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // Avoid hammering when gh isn't installed/authed.
          const code = (error as { code?: string }).code
          if (
            code === 'not-installed' ||
            code === 'not-authed' ||
            code === 'forbidden' ||
            code === 'not-found'
          ) {
            return false
          }
          return failureCount < 2
        },
        refetchOnWindowFocus: false,
        gcTime: 5 * 60 * 1000,
      },
    },
  })

  return {
    queryClient,
  }
}

export default function TanstackQueryProvider() {}
