import { useState, useMemo, useEffect } from 'react'
import { generateCode, STACKS } from '../services/code-generator'
import { Button, Input, CodeBlock, Pill } from '../components/ui'

export default function CodeExportPage() {
  const [stack, setStack] = useState('dotnet')
  const [flow, setFlow] = useState('authorization_code_pkce')
  const [issuerUrl, setIssuerUrl] = useState('')
  const [clientId, setClientId] = useState('')
  const [scope, setScope] = useState('openid profile email')
  const [redirectUri, setRedirectUri] = useState(window.location.origin + '/callback')

  // Reset flow when switching to React (no M2M support)
  useEffect(() => {
    if (stack === 'react') setFlow('authorization_code_pkce')
  }, [stack])

  const result = useMemo(() => {
    if (!issuerUrl || !clientId) return null
    return generateCode({ stack, flow, issuerUrl, clientId, scope, redirectUri })
  }, [stack, flow, issuerUrl, clientId, scope, redirectUri])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-border bg-surface px-6 py-3">
        <h1 className="text-sm font-bold">Export to Code</h1>
        <p className="text-[10px] text-muted mt-0.5">
          Generate OAuth setup code for your stack — just fill in your config
        </p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Configuration */}
        <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-surface overflow-y-auto p-4 space-y-4 flex-shrink-0">
          {/* Stack selector */}
          <div>
            <div className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-2">
              Stack
            </div>
            <div className="space-y-1.5">
              {STACKS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStack(s.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-md transition-all cursor-pointer
                    border text-xs font-semibold
                    ${stack === s.id
                      ? 'bg-accent/10 border-accent/30 text-text'
                      : 'bg-panel border-border text-muted hover:text-text hover:border-accent/20'
                    }
                  `}
                >
                  <span className="mr-2">{s.icon}</span>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Flow selector */}
          <div>
            <div className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-2">
              Flow
            </div>
            <div className="flex gap-1.5">
              <Pill label="PKCE" active={flow === 'authorization_code_pkce'} onClick={() => setFlow('authorization_code_pkce')} />
              {stack !== 'react' && (
                <Pill label="M2M" active={flow === 'client_credentials'} onClick={() => setFlow('client_credentials')} />
              )}
            </div>
          </div>

          {/* Config inputs */}
          <div className="border-t border-border pt-4 space-y-0">
            <Input
              label="Issuer URL"
              value={issuerUrl}
              onChange={e => setIssuerUrl(e.target.value)}
              placeholder="https://accounts.google.com"
              mono
            />
            <Input
              label="Client ID"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              placeholder="your-client-id"
              mono
            />
            <Input
              label="Scopes"
              value={scope}
              onChange={e => setScope(e.target.value)}
              placeholder="openid profile email"
              mono
            />
            {flow === 'authorization_code_pkce' && (
              <Input
                label="Redirect URI"
                value={redirectUri}
                onChange={e => setRedirectUri(e.target.value)}
                mono
              />
            )}
          </div>
        </div>

        {/* Right: Generated code */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {result ? (
            <>
              <div className="border-b border-border bg-panel px-4 py-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold">{result.filename}</span>
                  <span className="text-[10px] text-muted ml-2">{result.description}</span>
                </div>
                <Button
                  onClick={() => navigator.clipboard.writeText(result.code).catch(() => {})}
                  variant="secondary"
                  size="sm"
                >
                  Copy Code
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <CodeBlock copyable>{result.code}</CodeBlock>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted text-xs">
              Enter your Issuer URL and Client ID to generate code.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
