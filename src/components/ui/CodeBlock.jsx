import { useState } from 'react'

export default function CodeBlock({ children, className = '', copyable }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(typeof children === 'string' ? children : '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`relative group ${className}`}>
      <pre className="bg-bg border border-border rounded-md p-3 text-[11px] text-code leading-relaxed overflow-x-auto whitespace-pre-wrap break-all font-mono">
        {children}
      </pre>
      {copyable && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 px-2 py-1 text-[10px] rounded
            bg-panel border border-border text-muted
            opacity-0 group-hover:opacity-100 transition-opacity
            hover:text-accent hover:border-accent/40 cursor-pointer"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      )}
    </div>
  )
}
