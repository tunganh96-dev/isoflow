'use client'

import dynamic from 'next/dynamic'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

interface Props {
  value: string
  onChange: (val: string) => void
  minHeight?: number
}

export default function DocumentEditor({ value, onChange, minHeight = 400 }: Props) {
  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={v => onChange(v ?? '')}
        height={minHeight}
        preview="live"
      />
    </div>
  )
}
