# better-github

An opinionated, local-first GitHub dashboard, powered by your local [`gh`](https://cli.github.com) CLI.

> Status: early, active development. APIs, screens, and config will change.

## Why

The GitHub web UI does a lot but is not optimized for the workflows individual engineers actually run day to day. better-github is an opinionated dashboard that talks to GitHub through your already-authenticated `gh` CLI, so:

- nothing leaves your machine
- there is no separate auth, no tokens to manage, no third-party server
- you get a UI tailored to triaging PRs, reviews and issues the way you want it

## Goal

Once published, you should be able to launch the dashboard with a single command:

```bash
npx better-github
```

That will start a local server using the bundled build and open the dashboard in your browser. All GitHub data is fetched on demand by shelling out to `gh`.

## Design

Terminal-adjacent: dense, monospace, dark-first.

- Monochrome only. Color is reserved for destructive actions and PR state (open/merged/closed).
- Lucide icons
- Motion sparingly. Subtle, fast.

## Voice

- Direct. Lowercase-friendly. No marketing.
- Reads like `--help`.
- Empty, loading, and error states are plain sentences.

## Interaction

- Every action should have a keyboard shortcut.
- Density over whitespace.
- TanStack Query/Router for data. Show real loading and error states; don't hide them.
- All GitHub calls go through the local `gh` CLI. Never hit the API directly. Never collect tokens.

## Requirements

- [GitHub CLI](https://cli.github.com) authenticated via `gh auth login`
- Node 20+ to run the published CLI

## Development

```bash
bun install
bun --bun run dev
```

The dev server runs on http://localhost:8765.

### Other scripts

```bash
bun --bun run build     # production build
bun --bun run preview   # preview the production build
bun --bun run test      # run vitest
bun --bun run lint      # eslint
bun --bun run format    # prettier + eslint --fix
bun --bun run check     # prettier check
```

## Stack

- [TanStack Start](https://tanstack.com/start) (file-based routing, SSR, server functions)
- [TanStack Query](https://tanstack.com/query), [Form](https://tanstack.com/form), [Table](https://tanstack.com/table)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)

## License

MIT
