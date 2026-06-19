'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { DOCUMENT_ANALYSIS_PROMPT } from '@/lib/ai-prompts'
import { vi } from '@/lib/i18n/vi'

interface Props {
  content: string
  docType: string
  title: string
}

export default function AiChatPanel({ content, docType, title }: Props) {
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAnalyze() {
    if (loading) return

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/documents/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: DOCUMENT_ANALYSIS_PROMPT,
          current_content: content,
          doc_type: docType,
          title,
          analysis_only: true,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Không thể phân tích tài liệu')
      } else {
        setAnalysis(cleanAssistantText(data.explanation))
      }
    } catch {
      setError(vi.error_connection)
    }

    setLoading(false)
  }

  useEffect(() => {
    handleAnalyze()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <Sparkles size={16} className="text-blue-600" />
        <span className="text-sm font-semibold text-gray-900">Phân tích AI</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading || !content.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {analysis ? 'Phân tích lại với AI' : 'Phân tích với AI'}
          </button>
        </div>

        {error && (
          <div className="mb-3 flex gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !analysis && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={15} className="animate-spin" />
            Đang phân tích...
          </div>
        )}

        {analysis && (
          <div className="rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-700">
            <div className="mb-2 flex items-center justify-between border-b border-gray-200 pb-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Kết quả phân tích</span>
              {loading && <RefreshCw size={13} className="animate-spin text-gray-400" />}
            </div>
            <AssistantText value={analysis} />
          </div>
        )}
      </div>
    </div>
  )
}

function cleanAssistantText(value: string): string {
  const cleaned = (value ?? '')
    .trim()
    .replace(/^`{2,3}\s*json\s*/i, '')
    .replace(/^`{2,3}\s*/i, '')
    .replace(/`{2,3}\s*$/i, '')
    .trim()

  if (!cleaned.includes('"explanation"')) return cleaned
  return extractJsonStringField(cleaned, 'explanation') || cleaned
}

function AssistantText({ value }: { value: string }) {
  const text = cleanAssistantText(value)
  if (!looksLikeMarkdown(text)) return <p className="leading-5 whitespace-pre-wrap">{text}</p>

  return (
    <div className="ai-chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  )
}

function looksLikeMarkdown(value: string) {
  return /(^|\n)#{1,4}\s+\S/.test(value)
    || /(^|\n)\s*[-*]\s+\S/.test(value)
    || /(^|\n)\s*\d+\.\s+\S/.test(value)
    || value.includes('|---')
}

function extractJsonStringField(raw: string, field: string): string {
  const key = `"${field}"`
  const keyIndex = raw.indexOf(key)
  if (keyIndex < 0) return ''

  const colonIndex = raw.indexOf(':', keyIndex + key.length)
  const firstQuote = raw.indexOf('"', colonIndex + 1)
  if (colonIndex < 0 || firstQuote < 0) return ''

  let escaped = false
  for (let i = firstQuote + 1; i < raw.length; i++) {
    const char = raw[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      const rawValue = raw.slice(firstQuote + 1, i)
      try {
        return JSON.parse(`"${rawValue}"`)
      } catch {
        return rawValue.replace(/\\n/g, '\n').replace(/\\"/g, '"')
      }
    }
  }

  return ''
}
