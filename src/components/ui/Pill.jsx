export default function Pill({ label, active, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-1.5 rounded-full text-xs font-semibold
        tracking-wide cursor-pointer transition-all duration-150
        border
        ${active
          ? 'bg-accent text-bg border-accent'
          : 'bg-transparent text-muted border-border hover:border-accent/40 hover:text-text'
        }
        ${className}
      `}
    >
      {label}
    </button>
  )
}
