const statusConfig = {
  idle: { color: 'text-muted border-muted/30 bg-muted/10', label: 'Idle' },
  active: { color: 'text-warning border-warning/30 bg-warning/10', label: 'In Progress' },
  done: { color: 'text-success border-success/30 bg-success/10', label: 'Complete' },
  error: { color: 'text-danger border-danger/30 bg-danger/10', label: 'Error' },
}

export default function StatusBadge({ status = 'idle', label, className = '' }) {
  const config = statusConfig[status] || statusConfig.idle
  return (
    <span className={`
      inline-flex items-center gap-1.5
      px-2 py-0.5 rounded-full text-[10px] font-semibold
      tracking-wide uppercase border
      ${config.color} ${className}
    `}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'active' ? 'bg-warning animate-pulse' :
        status === 'done' ? 'bg-success' :
        status === 'error' ? 'bg-danger' : 'bg-muted'
      }`} />
      {label || config.label}
    </span>
  )
}
