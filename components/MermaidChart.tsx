'use client'

import { useEffect, useId, useRef } from 'react'

export default function MermaidChart({ code }: { code: string }) {
  const id = useId().replace(/:/g, '')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !code.trim()) return

    async function render() {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' })
      try {
        const { svg } = await mermaid.render(`m${id}`, code)
        if (ref.current) ref.current.innerHTML = svg
      } catch (err) {
        if (ref.current) ref.current.innerHTML = '<p class="text-sm text-red-500">Không thể hiển thị sơ đồ</p>'
      }
    }

    render()
  }, [code, id])

  return (
    <div
      ref={ref}
      className="overflow-x-auto bg-white rounded-lg border border-gray-200 p-4 min-h-[120px] flex items-center justify-center"
    />
  )
}
