#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Command, Option } from 'commander'
import { serve } from 'srvx'

const here = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(resolve(here, '..', 'package.json'), 'utf8'),
)
const distDir = resolve(here, '..', 'dist')
const clientDir = join(distDir, 'client')
const serverEntry = join(distDir, 'server', 'server.js')

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function tryStaticFile(pathname) {
  if (pathname === '/' || pathname.endsWith('/')) return null
  const filePath = join(clientDir, pathname)
  if (!filePath.startsWith(clientDir + '/')) return null
  if (!existsSync(filePath)) return null
  const stat = statSync(filePath)
  if (!stat.isFile()) return null
  const stream = Readable.toWeb(createReadStream(filePath))
  return new Response(stream, {
    headers: {
      'Content-Type':
        mimeTypes[extname(pathname).toLowerCase()] ??
        'application/octet-stream',
      'Content-Length': String(stat.size),
    },
  })
}

function openInBrowser(url) {
  const command =
    process.platform === 'darwin'
      ? { cmd: 'open', args: [url] }
      : process.platform === 'win32'
        ? { cmd: 'cmd', args: ['/c', 'start', '""', url] }
        : { cmd: 'xdg-open', args: [url] }
  try {
    spawn(command.cmd, command.args, {
      stdio: 'ignore',
      detached: true,
    }).unref()
  } catch {
    /* swallow — not being able to open a browser is not fatal */
  }
}

const program = new Command()
  .name('better-github')
  .description(pkg.description)
  .version(pkg.version, '-v, --version')
  .addOption(
    new Option('-p, --port <port>', 'port to listen on')
      .default('8765')
      .env('PORT'),
  )
  .addOption(
    new Option('-H, --host <host>', 'host to bind to')
      .default('127.0.0.1')
      .env('HOST'),
  )
  .option('--no-open', 'do not open the dashboard in a browser')
  .action(async ({ port, host, open }) => {
    if (!existsSync(serverEntry)) {
      console.error(
        `better-github: build output not found at ${serverEntry}\n` +
          'This usually means the package was published without a build. ' +
          'Please open an issue at https://github.com/VaibhavAcharya/better-github/issues',
      )
      process.exit(1)
    }

    process.env.NODE_ENV ??= 'production'

    const ssrModule = await import(pathToFileURL(serverEntry).href)
    const ssrFetch = ssrModule.default?.fetch ?? ssrModule.fetch
    if (typeof ssrFetch !== 'function') {
      console.error(
        'better-github: server entry did not export a fetch handler',
      )
      process.exit(1)
    }

    await serve({
      port: Number(port),
      hostname: host,
      async fetch(request) {
        const { pathname } = new URL(request.url)
        const staticResponse = tryStaticFile(pathname)
        if (staticResponse) return staticResponse
        return ssrFetch(request)
      },
    }).ready()

    if (open) openInBrowser(`http://${host}:${port}`)
  })

program.parseAsync().catch((error) => {
  console.error(error)
  process.exit(1)
})
