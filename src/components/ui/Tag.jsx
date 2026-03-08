const colorMap = {
  accent: 'bg-accent/15 text-accent border-accent/30',
  accent2: 'bg-accent2/15 text-accent2 border-accent2/30',
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  muted: 'bg-muted/15 text-muted border-muted/30',
}

export default function Tag({ children, color = 'accent', className = '' }) {
  return (
    <span className={`
      inline-flex items-center
      px-1.5 py-0.5 rounded text-[11px]
      font-mono font-bold tracking-wide
      border
      ${colorMap[color] || colorMap.accent}
      ${className}
    `}>
      {children}
    </span>
  )
}
