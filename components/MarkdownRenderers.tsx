import React from 'react'
import type { Components } from 'react-markdown'

export const markdownComponents: Components = {
  img({ src, alt }) {
    return (
      <img
        src={src}
        alt={alt ?? ''}
        className="mx-auto my-4 max-h-[78vh] max-w-full rounded-md border border-gray-200 object-contain"
      />
    )
  },
  ul({ children }) {
    return (
      <div className="my-3 space-y-1">
        {React.Children.map(children, child => {
          if (!React.isValidElement(child)) return child
          const listItem = child as React.ReactElement<{ children?: React.ReactNode }>
          return (
            <div className="flex gap-2">
              <span className="shrink-0 select-text">-</span>
              <div className="min-w-0">{listItem.props.children}</div>
            </div>
          )
        })}
      </div>
    )
  },
}
