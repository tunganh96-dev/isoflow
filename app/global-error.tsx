'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-dvh flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">Đã xảy ra lỗi nghiêm trọng</p>
            <button onClick={reset} className="text-sm text-blue-600 underline">
              Thử lại
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
