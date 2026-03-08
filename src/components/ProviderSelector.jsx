import { getProviderList } from '../config/providers'
import { Card } from './ui'

export default function ProviderSelector({ selectedId, onSelect }) {
  const providers = getProviderList()

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-3">
        Identity Provider
      </div>
      <div className="grid gap-2">
        {providers.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`
              w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150
              border cursor-pointer
              ${selectedId === p.id
                ? 'bg-accent/10 border-accent/40 text-text'
                : 'bg-panel border-border text-muted hover:border-accent/20 hover:text-text'
              }
            `}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{p.logo}</span>
              <div>
                <div className="text-xs font-semibold">{p.name}</div>
                <div className="text-[10px] text-muted">{p.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
