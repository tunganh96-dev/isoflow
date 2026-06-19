'use client'

import { useState } from 'react'
import type { ClipboardEvent } from 'react'
import dynamic from 'next/dynamic'
import { Columns2, Eye, Pencil } from 'lucide-react'
import { normalizeDocumentMarkdown } from '@/lib/markdown'
import { markdownComponents } from './MarkdownRenderers'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })
type EditorMode = 'edit' | 'preview' | 'live'

interface Props {
  value: string
  onChange: (val: string) => void
  minHeight?: number
}

export default function DocumentEditor({ value, onChange, minHeight = 400 }: Props) {
  const [mode, setMode] = useState<EditorMode>('edit')

  const modes: { value: EditorMode; label: string; icon: typeof Pencil }[] = [
    { value: 'edit', label: 'Soạn thảo', icon: Pencil },
    { value: 'preview', label: 'Xem mẫu', icon: Eye },
    { value: 'live', label: 'Chia đôi', icon: Columns2 },
  ]

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const html = event.clipboardData.getData('text/html')
    if (!html) return

    const markdown = normalizeDocumentMarkdown(htmlToMarkdown(html))
    if (!markdown) return

    event.preventDefault()
    const target = event.target as HTMLTextAreaElement

    if (target?.tagName === 'TEXTAREA') {
      const start = target.selectionStart ?? value.length
      const end = target.selectionEnd ?? start
      onChange(`${value.slice(0, start)}${markdown}${value.slice(end)}`)
      return
    }

    onChange(`${value}${value ? '\n\n' : ''}${markdown}`)
  }

  return (
    <div data-color-mode="light" className="h-full flex flex-col" onPaste={handlePaste}>
      <div className="shrink-0 flex items-center justify-end gap-1 border-b border-gray-200 bg-white px-3 py-2">
        {modes.map(({ value: modeValue, label, icon: Icon }) => (
          <button
            key={modeValue}
            type="button"
            onClick={() => setMode(modeValue)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              mode === modeValue
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>
      <MDEditor
        value={value}
        onChange={v => onChange(v ?? '')}
        height="100%"
        visibleDragbar={false}
        preview={mode}
        previewOptions={{ components: markdownComponents }}
        style={{ minHeight }}
      />
    </div>
  )
}

function htmlToMarkdown(html: string) {
  if (typeof window === 'undefined') return ''

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const parts = Array.from(doc.body.childNodes)
    .map(nodeToMarkdown)
    .map(part => part.trim())
    .filter(Boolean)

  return parts.join('\n\n')
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.replace(/\s+/g, ' ') ?? ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()
  const children = Array.from(el.childNodes).map(nodeToMarkdown).join('').trim()

  if (!children && tag !== 'br' && tag !== 'table') return ''

  if (/^h[1-6]$/.test(tag)) return `${'#'.repeat(Number(tag[1]))} ${children}`
  if (tag === 'strong' || tag === 'b') return `**${children}**`
  if (tag === 'em' || tag === 'i') return `*${children}*`
  if (tag === 'br') return '\n'
  if (tag === 'p' || tag === 'div' || tag === 'section') return children
  if (tag === 'ul') return listToMarkdown(el, '-')
  if (tag === 'ol') return listToMarkdown(el, '1.')
  if (tag === 'li') return children
  if (tag === 'table') return tableToMarkdown(el)

  return children
}

function listToMarkdown(el: HTMLElement, marker: '-' | '1.') {
  return Array.from(el.children)
    .filter(child => child.tagName.toLowerCase() === 'li')
    .map((child, index) => `${marker === '-' ? '-' : `${index + 1}.`} ${nodeToMarkdown(child).trim()}`)
    .join('\n')
}

function tableToMarkdown(el: HTMLElement) {
  const rows = Array.from(el.querySelectorAll('tr'))
    .map(row => Array.from(row.querySelectorAll('th,td')).map(cell => cleanCell(cell.textContent ?? '')))
    .filter(row => row.length > 0)

  if (!rows.length) return ''

  const colCount = Math.max(...rows.map(row => row.length))
  const normalized = rows.map(row => [...row, ...Array(colCount - row.length).fill('')])
  const header = normalized[0]
  const separator = Array(colCount).fill('---')
  const body = normalized.slice(1)

  return [header, separator, ...body]
    .map(row => `| ${row.join(' | ')} |`)
    .join('\n')
}

function cleanCell(value: string) {
  return value.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim()
}
