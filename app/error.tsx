'use client'

export default function Error({
  reset,
}: {
  reset: () => void
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#F7F6F3] px-4">
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-4">Đã xảy ra lỗi</p>
        <button
          onClick={reset}
          className="text-sm text-blue-600 underline"
        >
          Thử lại
        </button>
      </div>
    </div>
  )
}
