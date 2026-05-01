//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      // Server responses (GraphQL/REST) commonly include defensively-checked
      // nullability that TypeScript's structural types don't reflect — keep
      // the runtime guards rather than fighting the types.
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // The harness flags inline `import('foo')` types as needing a separate
      // `import type`, but for one-off references in a single file the inline
      // form keeps the dependency graph leaner.
      '@typescript-eslint/consistent-type-imports': 'off',
      // Hotkey deps array is dynamic on purpose (`...deps`); the rule isn't
      // tooled to follow that pattern and produces false positives.
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    ignores: ['eslint.config.js', 'prettier.config.js'],
  },
]
