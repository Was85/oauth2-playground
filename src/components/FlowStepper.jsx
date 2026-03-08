import { Button, StatusBadge } from './ui'

export default function FlowStepper({ steps, currentStep, stepStatuses, onRunStep }) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const status = stepStatuses[step.id] || 'idle'
        const canRun = status === 'idle' && (i === 0 || stepStatuses[steps[i - 1]?.id] === 'done')
        const isActive = status === 'active'

        return (
          <div
            key={step.id}
            className={`
              flex items-center gap-3 px-3.5 py-2.5 rounded-lg border transition-all
              ${status === 'done' ? 'bg-success/5 border-success/30' :
                status === 'error' ? 'bg-danger/5 border-danger/30' :
                isActive ? 'bg-warning/5 border-warning/30' :
                'bg-panel border-border'}
            `}
          >
            <StepIndicator num={i + 1} status={status} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold">{step.label}</div>
              {step.description && (
                <div className="text-[10px] text-muted mt-0.5 truncate">{step.description}</div>
              )}
            </div>
            <div className="flex-shrink-0">
              {status === 'idle' && (
                <Button onClick={() => onRunStep(step.id)} disabled={!canRun} size="sm">
                  Run &rarr;
                </Button>
              )}
              {status === 'active' && (
                <StatusBadge status="active" label="Running..." />
              )}
              {status === 'done' && (
                <StatusBadge status="done" />
              )}
              {status === 'error' && (
                <StatusBadge status="error" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StepIndicator({ num, status }) {
  const colors = {
    idle: 'text-muted border-muted/30',
    active: 'text-warning border-warning animate-pulse',
    done: 'text-success border-success bg-success/10',
    error: 'text-danger border-danger bg-danger/10',
  }

  return (
    <div className={`
      w-7 h-7 rounded-full flex items-center justify-center
      text-[11px] font-bold border-2 flex-shrink-0
      ${colors[status] || colors.idle}
    `}>
      {status === 'done' ? '\u2713' : status === 'error' ? '\u2715' : num}
    </div>
  )
}
