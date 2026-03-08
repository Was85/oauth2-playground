import { useState } from 'react'

export default function Card({
  title, children, className = '', headerRight, collapsible, defaultOpen = true
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`bg-panel border border-border rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div
          className={`flex items-center justify-between px-3 py-2.5 ${collapsible ? 'cursor-pointer hover:bg-surface' : ''}`}
          onClick={collapsible ? () => setOpen(!open) : undefined}
        >
          <span className="text-[10px] text-muted uppercase tracking-widest font-semibold">{title}</span>
          <div className="flex items-center gap-2">
            {headerRight}
            {collapsible && (
              <span className="text-muted text-xs">{open ? '\u25B2' : '\u25BC'}</span>
            )}
          </div>
        </div>
      )}
      {(!collapsible || open) && (
        <div className={title ? 'px-3 pb-3' : 'p-3'}>
          {children}
        </div>
      )}
    </div>
  )
}
