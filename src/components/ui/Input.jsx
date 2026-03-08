import { forwardRef } from 'react'

const Input = forwardRef(function Input({
  label, hint, error, mono, className = '', ...props
}, ref) {
  return (
    <div className={`mb-2.5 ${className}`}>
      {(label || hint) && (
        <div className="flex justify-between items-baseline mb-1">
          {label && (
            <label className="text-[11px] text-muted uppercase tracking-widest">
              {label}
            </label>
          )}
          {hint && (
            <span className="text-[10px] text-accent2">{hint}</span>
          )}
        </div>
      )}
      <input
        ref={ref}
        className={`
          w-full px-2.5 py-1.5 text-xs rounded-md
          bg-panel border border-border
          text-text placeholder:text-muted/50
          outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20
          transition-colors duration-150
          read-only:bg-bg read-only:text-muted read-only:cursor-default
          ${mono ? 'font-mono' : ''}
          ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-[10px] text-danger">{error}</p>
      )}
    </div>
  )
})

export default Input
