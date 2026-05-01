# better-github

An opinionated, local-first GitHub dashboard, powered by your local [`gh`](https://cli.github.com) CLI.

> Status: early, active development. APIs, screens and config are all expected to change. Not yet published to npm.

## Why

The GitHub web UI does a lot but is not optimized for the workflows individual engineers actually run day to day. better-github is an opinionated dashboard that talks to GitHub through your already-authenticated `gh` CLI, so:

- nothing leaves your machine
- there is no separate auth, no tokens to manage, no third-party server
- you get a UI tailored to triaging PRs, reviews and issues the way you want it

## What's in the box

- **Inbox** — review-requested PRs, your open PRs, assigned issues, mentions and recent activity, all on one page, grouped and collapsible.
- **Notifications** — a unified feed grouped by repo with bulk mark-read, filters by repo / type / state, and live unread counts in the sidebar.
- **Pull requests** — searchable list with scope/state/sort filters; detail view with conversation, files, raw diff and checks tabs, plus inline approve / request-changes / comment / merge actions.
- **Issues** — list with the same filtering model, detail with timeline, comment, close-with-comment, and reopen.
- **Repositories** — one-click pin to scope the inbox; detail view with open PRs/issues, recent commits and language breakdown.
- **Command palette (⌘K)** — jump to any nav target, repo, or `owner/repo#123` instantly.
- **Keyboard-first** — `g i / g n / g p / g s / g r` for navigation, `j / k / enter` to drive the notifications list, `?` for help.
- **Settings** — refresh interval, density, default merge method, hidden authors, repo scope, all persisted to localStorage. Nothing is ever sent over the network.

## Goal

Once published, you should be able to launch the dashboard with a single command:

```bash
npx better-github
```

That will start a local server using the bundled build and open the dashboard in your browser. All GitHub data is fetched on demand by shelling out to `gh`.

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
