import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { normalizeDocumentMarkdown } from '@/lib/markdown'
import { markdownComponents } from './MarkdownRenderers'

export default function DocumentViewer({ content, flowchartImageUrl = null }: { content: string; flowchartImageUrl?: string | null }) {
  const normalizedContent = injectFlowchartImage(normalizeDocumentMarkdown(content), flowchartImageUrl)

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <details className="group border-b border-gray-200">
        <summary className="flex cursor-pointer list-none items-center justify-end px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700">
          Xem Markdown
        </summary>
        <pre className="max-h-96 overflow-auto border-t border-gray-100 bg-gray-50 px-5 py-4 font-mono text-sm leading-6 text-gray-800 whitespace-pre-wrap break-words">
          {normalizedContent}
        </pre>
      </details>

      <article className="document-markdown px-5 py-5 lg:px-7 lg:py-7">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{normalizedContent}</ReactMarkdown>
      </article>
    </div>
  )
}

function injectFlowchartImage(content: string, imageUrl: string | null) {
  if (!imageUrl) return content
  if (content.includes(imageUrl)) return content

  const flowchartBlock = `### 6.1 Lưu đồ\n\n![Lưu đồ quy trình](${imageUrl})`
  const section6 = content.match(/^(##\s+6\.\s+.+)$/m)
  if (!section6 || section6.index === undefined) return `${content}\n\n${flowchartBlock}`

  const insertAt = section6.index + section6[0].length
  return `${content.slice(0, insertAt)}\n\n${flowchartBlock}\n\n${content.slice(insertAt).trimStart()}`
}
