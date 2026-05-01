import * as React from 'react'
import { cn } from '#/lib/utils'

/**
 * Lightweight, dependency-free GitHub-flavored markdown renderer. We deliberately
 * avoid pulling in remark/rehype — the dashboard mostly displays short comment
 * bodies, and code that ships in `npx better-github` should stay tiny. Heavy
 * markdown in PR descriptions degrades gracefully (we render plaintext with
 * minimal formatting and line breaks intact).
 */

interface MarkdownProps {
  body: string
  className?: string
}

export function Markdown({ body, className }: MarkdownProps) {
  const blocks = React.useMemo(() => parseBlocks(body), [body])

  if (blocks.length === 0) {
    return (
      <p className={cn('text-xs text-muted-foreground italic', className)}>
        no description provided
      </p>
    )
  }

  return (
    <div className={cn('space-y-3 text-xs leading-relaxed', className)}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  )
}

type Block =
  | { type: 'h1' | 'h2' | 'h3' | 'h4'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; ordered: boolean; items: ReadonlyArray<string> }
  | { type: 'task'; items: ReadonlyArray<{ checked: boolean; text: string }> }
  | { type: 'code'; lang: string | null; text: string }
  | { type: 'rule' }

function parseBlocks(input: string): ReadonlyArray<Block> {
  const lines = input.replace(/\r\n/g, '\n').split('\n')
  const blocks: Array<Block> = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''

    if (line.trim() === '') {
      i++
      continue
    }

    // fenced code block
    const fence = /^```(\w+)?\s*$/.exec(line)
    if (fence) {
      const lang = fence[1] || null
      const buf: Array<string> = []
      i++
      while (i < lines.length && !/^```/.test(lines[i] ?? '')) {
        buf.push(lines[i] ?? '')
        i++
      }
      i++ // skip closing fence
      blocks.push({ type: 'code', lang, text: buf.join('\n') })
      continue
    }

    // horizontal rule
    if (/^([-*_]\s*){3,}$/.test(line.trim())) {
      blocks.push({ type: 'rule' })
      i++
      continue
    }

    // heading
    const heading = /^(#{1,4})\s+(.+)$/.exec(line)
    if (heading) {
      const level = (heading[1]?.length ?? 1) as 1 | 2 | 3 | 4
      blocks.push({
        type: `h${level}`,
        text: heading[2] ?? '',
      })
      i++
      continue
    }

    // blockquote
    if (line.startsWith('>')) {
      const buf: Array<string> = []
      while (i < lines.length && (lines[i] ?? '').startsWith('>')) {
        buf.push((lines[i] ?? '').replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'quote', text: buf.join('\n') })
      continue
    }

    // task list
    if (/^[-*]\s+\[[\sxX]\]\s+/.test(line)) {
      const items: Array<{ checked: boolean; text: string }> = []
      while (i < lines.length && /^[-*]\s+\[[\sxX]\]\s+/.test(lines[i] ?? '')) {
        const m = /^[-*]\s+\[([\sxX])\]\s+(.+)$/.exec(lines[i] ?? '')
        items.push({
          checked: (m?.[1] ?? '').toLowerCase() === 'x',
          text: m?.[2] ?? '',
        })
        i++
      }
      blocks.push({ type: 'task', items })
      continue
    }

    // unordered list
    if (/^[-*+]\s+/.test(line)) {
      const items: Array<string> = []
      while (i < lines.length && /^[-*+]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^[-*+]\s+/, ''))
        i++
      }
      blocks.push({ type: 'list', ordered: false, items })
      continue
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: Array<string> = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'list', ordered: true, items })
      continue
    }

    // paragraph (collect until blank line / next block marker)
    const buf: Array<string> = [line]
    i++
    while (
      i < lines.length &&
      lines[i]?.trim() !== '' &&
      !/^(#{1,4}\s+|[-*+]\s+|\d+\.\s+|>|`{3,})/.test(lines[i] ?? '')
    ) {
      buf.push(lines[i] ?? '')
      i++
    }
    blocks.push({ type: 'paragraph', text: buf.join('\n') })
  }

  return blocks
}

function renderBlock(block: Block, key: number): React.ReactNode {
  switch (block.type) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
      return (
        <p
          key={key}
          className={cn(
            'mt-2 font-medium',
            block.type === 'h1' && 'text-base',
            block.type === 'h2' && 'text-sm',
            (block.type === 'h3' || block.type === 'h4') && 'text-xs',
          )}
        >
          {renderInline(block.text)}
        </p>
      )
    case 'paragraph':
      return (
        <p key={key} className="text-foreground/90 whitespace-pre-wrap">
          {renderInline(block.text)}
        </p>
      )
    case 'quote':
      return (
        <blockquote
          key={key}
          className="border-l-2 border-border pl-3 text-muted-foreground whitespace-pre-wrap"
        >
          {renderInline(block.text)}
        </blockquote>
      )
    case 'list':
      return (
        <ul
          key={key}
          className={cn(
            'space-y-1 pl-4',
            block.ordered ? 'list-decimal' : 'list-disc',
          )}
        >
          {block.items.map((item, idx) => (
            <li
              key={idx}
              className="text-foreground/90 marker:text-muted-foreground"
            >
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )
    case 'task':
      return (
        <ul key={key} className="space-y-1 pl-1">
          {block.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-foreground/90">
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 inline-flex size-3 shrink-0 items-center justify-center border',
                  item.checked
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                    : 'border-border bg-transparent',
                )}
              >
                {item.checked ? '✓' : ''}
              </span>
              <span className={item.checked ? 'line-through opacity-70' : ''}>
                {renderInline(item.text)}
              </span>
            </li>
          ))}
        </ul>
      )
    case 'code':
      return (
        <pre
          key={key}
          className="overflow-x-auto border border-border bg-muted/40 p-2 text-[11px] leading-relaxed"
        >
          <code className="block whitespace-pre">{block.text}</code>
        </pre>
      )
    case 'rule':
      return <hr key={key} className="border-border" />
  }
}

/** Inline parser for code spans, bold, italic, and links. */
function renderInline(text: string): React.ReactNode {
  // codespan first — inside backticks no other formatting applies
  const segments: Array<React.ReactNode> = []
  let cursor = 0
  const codeRe = /`([^`\n]+)`/g
  let match: RegExpExecArray | null
  let segKey = 0
  while ((match = codeRe.exec(text)) !== null) {
    const before = text.slice(cursor, match.index)
    if (before) segments.push(...formatText(before, segKey++))
    segments.push(
      <code
        key={`code-${segKey++}`}
        className="border border-border bg-muted/40 px-1 py-0.5 text-[11px]"
      >
        {match[1]}
      </code>,
    )
    cursor = match.index + match[0].length
  }
  const tail = text.slice(cursor)
  if (tail) segments.push(...formatText(tail, segKey++))
  return segments
}

function formatText(
  input: string,
  baseKey: number,
): ReadonlyArray<React.ReactNode> {
  // Simple, ordered: links → bold → italic → @mentions / #refs
  const out: Array<React.ReactNode> = []
  let cursor = 0
  let key = baseKey * 1000

  // [text](url)
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(input)) !== null) {
    if (m.index > cursor) {
      out.push(...emphasize(input.slice(cursor, m.index), key++))
    }
    out.push(
      <a
        key={`a-${key++}`}
        href={m[2]}
        target="_blank"
        rel="noreferrer noopener"
        className="text-primary underline-offset-2 hover:underline"
      >
        {m[1]}
      </a>,
    )
    cursor = m.index + m[0].length
  }
  if (cursor < input.length) {
    out.push(...emphasize(input.slice(cursor), key++))
  }
  return out
}

function emphasize(
  input: string,
  baseKey: number,
): ReadonlyArray<React.ReactNode> {
  const out: Array<React.ReactNode> = []
  let cursor = 0
  let key = baseKey * 1000
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g
  let m: RegExpExecArray | null
  while ((m = re.exec(input)) !== null) {
    if (m.index > cursor)
      out.push(textWithMentions(input.slice(cursor, m.index), key++))
    if (m[1] !== undefined) {
      out.push(
        <strong key={`b-${key++}`} className="font-medium text-foreground">
          {m[1]}
        </strong>,
      )
    } else {
      out.push(
        <em key={`i-${key++}`} className="italic">
          {m[2] ?? m[3] ?? ''}
        </em>,
      )
    }
    cursor = m.index + m[0].length
  }
  if (cursor < input.length)
    out.push(textWithMentions(input.slice(cursor), key++))
  return out
}

function textWithMentions(input: string, baseKey: number): React.ReactNode {
  const out: Array<React.ReactNode> = []
  let cursor = 0
  let key = baseKey * 100
  const re = /@([A-Za-z0-9-]{1,39})|#(\d+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(input)) !== null) {
    if (m.index > cursor) out.push(input.slice(cursor, m.index))
    if (m[1]) {
      out.push(
        <span key={`m-${key++}`} className="font-medium text-primary">
          @{m[1]}
        </span>,
      )
    } else if (m[2]) {
      out.push(
        <span key={`r-${key++}`} className="text-primary">
          #{m[2]}
        </span>,
      )
    }
    cursor = m.index + m[0].length
  }
  if (cursor < input.length) out.push(input.slice(cursor))
  return out.length === 1 ? (
    out[0]
  ) : (
    <React.Fragment key={baseKey}>{out}</React.Fragment>
  )
}
