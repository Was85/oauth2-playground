import { useState } from 'react'
import { Tag, CodeBlock, Button } from './ui'

export default function HttpLog({ entries = [], onClear }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-muted text-xs">
        Run the flow steps to see HTTP requests and responses here.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] text-muted uppercase tracking-widest">
          HTTP Request / Response Log ({entries.length})
        </span>
        <Button onClick={onClear} variant="danger" size="sm">Clear</Button>
      </div>
      {entries.map((entry, i) => (
        <LogEntry key={entry.id || i} entry={entry} defaultOpen={i === 0} />
      ))}
    </div>
  )
}

function LogEntry({ entry, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const isError = entry.isError || (entry.status && entry.status >= 400)

  return (
    <div className={`border rounded-lg overflow-hidden ${isError ? 'border-danger/30' : 'border-border'}`}>
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-3 py-2 bg-panel cursor-pointer select-none hover:bg-surface transition-colors"
      >
        <Tag color={entry.type === 'request' ? 'accent' : isError ? 'danger' : 'success'}>
          {entry.method || (entry.type === 'response' ? 'RESP' : '\u2192')}
        </Tag>
        <span className="font-mono text-xs text-text flex-1 truncate">
          {entry.label || entry.url}
        </span>
        {entry.status > 0 && (
          <Tag color={entry.status < 400 ? 'success' : 'danger'}>{entry.status}</Tag>
        )}
        {entry.duration > 0 && (
          <span className="text-[10px] text-muted">{entry.duration}ms</span>
        )}
        <span className="text-muted text-xs">{open ? '\u25B2' : '\u25BC'}</span>
      </div>
      {open && (
        <div className="px-3 py-3 bg-bg border-t border-border space-y-2">
          {entry.url && (
            <div className="text-[10px] text-muted font-mono break-all">{entry.url}</div>
          )}
          {entry.description && (
            <p className="text-[11px] text-muted leading-relaxed">{entry.description}</p>
          )}
          {entry.body && (
            <CodeBlock copyable>
              {typeof entry.body === 'string' ? entry.body : JSON.stringify(entry.body, null, 2)}
            </CodeBlock>
          )}
        </div>
      )}
    </div>
  )
}
