import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProvider } from '../config/providers'
import { FLOWS, createDefaultConfig, DEFAULT_REDIRECT_URI } from '../config/defaults'
import useOAuthFlow from '../hooks/useOAuthFlow'
import ProviderSelector from '../components/ProviderSelector'
import TokenInspector from '../components/TokenInspector'
import HttpLog from '../components/HttpLog'
import FlowStepper from '../components/FlowStepper'
import { Button, Input, Pill, Card, Tag } from '../components/ui'

export default function FlowPage() {
  const [providerId, setProviderId] = useState('custom')
  const [flowId, setFlowId] = useState('authorization_code_pkce')
  const [tab, setTab] = useState('flow')
  const [fields, setFields] = useState({})
  const [scope, setScope] = useState('openid profile email')

  const provider = getProvider(providerId)
  const flow = FLOWS.find(f => f.id === flowId)

  const [searchParams] = useSearchParams()

  const {
    discovery, discoveryError, stepStatuses, tokens, log, error, pkceValues,
    discover, startPKCEFlow, startClientCredentials, verifyTokenSignature,
    reset, clearLog, clearError, setTokensFromCallback,
  } = useOAuthFlow()

  // Pick up tokens from callback redirect
  useEffect(() => {
    if (searchParams.get('from') === 'callback') {
      const raw = sessionStorage.getItem('oauth-devtools:callback-tokens')
      if (raw) {
        sessionStorage.removeItem('oauth-devtools:callback-tokens')
        try {
          const callbackTokens = JSON.parse(raw)
          setTokensFromCallback(callbackTokens)
        } catch { /* ignore */ }
      }
    }
  }, [searchParams, setTokensFromCallback])

  // Build issuer URL from provider fields
  const issuerUrl = provider?.buildIssuerUrl?.(fields) || fields.issuerUrl || ''
  const clientId = fields.clientId || ''
  const clientSecret = fields.clientSecret || ''
  const redirectUri = DEFAULT_REDIRECT_URI

  const setField = (key) => (e) => {
    const value = typeof e === 'string' ? e : e.target.value
    setFields(prev => ({ ...prev, [key]: value }))
  }

  // Handle flow step execution
  const handleRunStep = async (stepId) => {
    clearError()

    if (stepId === 'discover') {
      if (!issuerUrl) return
      await discover(issuerUrl)
    }
    else if (stepId === 'pkce') {
      await startPKCEFlow({
        clientId,
        redirectUri,
        scope,
        extraParams: {},
      })
    }
    else if (stepId === 'token') {
      await startClientCredentials({
        clientId,
        clientSecret,
        scope: scope.replace(/openid|profile|email/g, '').trim() || 'read write',
      })
    }
  }

  // Switch flow resets state
  useEffect(() => {
    reset()
  }, [flowId, providerId])

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* LEFT SIDEBAR: Provider + Config */}
      <div className="w-64 border-r border-border bg-surface overflow-y-auto p-4 flex-shrink-0 space-y-4">
        <ProviderSelector selectedId={providerId} onSelect={setProviderId} />

        <div className="border-t border-border pt-4">
          <div className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-3">
            Configuration
          </div>

          {provider?.fields.map(f => (
            <Input
              key={f.key}
              label={f.label}
              placeholder={f.placeholder}
              value={fields[f.key] || ''}
              onChange={(e) => setField(f.key)(e)}
              mono
              type={f.sensitive ? 'password' : 'text'}
              hint={f.required ? '' : 'optional'}
            />
          ))}

          <Input
            label="Redirect URI"
            value={redirectUri}
            readOnly
            mono
            hint="auto-configured"
          />

          <Input
            label="Scopes"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            mono
            placeholder="openid profile email"
          />
        </div>

        {/* PKCE Values display */}
        {pkceValues && (
          <Card title="PKCE Values">
            <div className="space-y-2">
              {[
                ['code_verifier', pkceValues.codeVerifier],
                ['code_challenge', pkceValues.codeChallenge],
                ['state', pkceValues.state],
                ['nonce', pkceValues.nonce],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-[10px] text-muted">{k}</div>
                  <div className="text-[10px] text-code font-mono break-all">{v}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Provider setup guide */}
        {provider?.setupGuide && (
          <Card title="Setup Guide" collapsible defaultOpen={false}>
            <div className="space-y-2">
              {provider.setupGuide.steps.map((step, i) => (
                <div key={i} className="flex gap-2 text-[11px] text-muted leading-relaxed">
                  <span className="text-accent font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{step.replace('{redirectUri}', redirectUri).replace('{origin}', window.location.origin)}</span>
                </div>
              ))}
              {provider.setupGuide.docUrl && (
                <a
                  href={provider.setupGuide.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[11px] text-accent hover:underline mt-2"
                >
                  Official docs →
                </a>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* CENTER: Flow + Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Flow selector + tabs */}
        <div className="border-b border-border bg-surface px-4 py-2 flex items-center gap-6">
          {/* Flow pills */}
          <div className="flex gap-2">
            {FLOWS.map(f => (
              <Pill
                key={f.id}
                label={f.shortName}
                active={flowId === f.id}
                onClick={() => setFlowId(f.id)}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Tab bar */}
          <div className="flex gap-1">
            {[
              ['flow', 'Flow'],
              ['log', `Log${log.length > 0 ? ` (${log.length})` : ''}`],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`
                  px-3 py-1.5 text-xs font-semibold cursor-pointer
                  border-b-2 transition-colors
                  ${tab === id
                    ? 'text-accent border-accent'
                    : 'text-muted border-transparent hover:text-text'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <Button onClick={reset} variant="ghost" size="sm">Reset</Button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Error banner */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-danger/10 border border-danger/30 rounded-lg flex items-start gap-3">
              <span className="text-danger text-sm">✕</span>
              <div className="flex-1">
                <div className="text-xs font-semibold text-danger">Error</div>
                <div className="text-[11px] text-muted mt-1">{error}</div>
              </div>
              <Button onClick={clearError} variant="ghost" size="sm">Dismiss</Button>
            </div>
          )}

          {tab === 'flow' && (
            <div className="max-w-2xl">
              <div className="mb-4">
                <h2 className="text-sm font-bold">{flow?.name}</h2>
                <p className="text-[11px] text-muted mt-1">{flow?.description}</p>
              </div>

              {/* Discovery info */}
              {discovery && (
                <Card title="Discovered Endpoints" className="mb-4" collapsible defaultOpen={false}>
                  <div className="space-y-1.5">
                    {[
                      ['Authorization', discovery.authorizationEndpoint],
                      ['Token', discovery.tokenEndpoint],
                      ['UserInfo', discovery.userinfoEndpoint],
                      ['JWKS', discovery.jwksUri],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex gap-2 items-baseline">
                        <span className="text-[10px] text-muted w-20 flex-shrink-0">{k}</span>
                        <span className="text-[10px] text-code font-mono break-all">{v}</span>
                      </div>
                    ))}
                    {discovery.supportsPKCE && (
                      <div className="mt-2">
                        <Tag color="success">PKCE Supported</Tag>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <FlowStepper
                steps={flow?.steps || []}
                stepStatuses={stepStatuses}
                onRunStep={handleRunStep}
              />

              {/* All done message */}
              {flow?.steps.every(s => stepStatuses[s.id] === 'done') && (
                <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-lg text-center">
                  <div className="text-success font-bold text-sm">Flow Complete!</div>
                  <div className="text-[11px] text-muted mt-1">
                    Check the token inspector on the right, or view the full HTTP log.
                  </div>
                  <div className="flex gap-2 justify-center mt-3">
                    <Button onClick={() => setTab('log')} variant="secondary" size="sm">View Log</Button>
                    <Button onClick={reset} variant="danger" size="sm">Reset</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'log' && (
            <HttpLog entries={log} onClear={clearLog} />
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: Token Inspector */}
      <div className="w-80 border-l border-border bg-surface overflow-y-auto p-4 flex-shrink-0">
        <div className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-3">
          Token Inspector
        </div>
        <TokenInspector
          tokens={tokens}
          onVerify={verifyTokenSignature}
        />
      </div>
    </div>
  )
}
