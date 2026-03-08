import { useState, useCallback, useRef } from 'react'
import { fetchDiscoveryDocument, summarizeDiscovery } from '../services/oidc-discovery'
import {
  generateCodeVerifier, generateCodeChallenge,
  generateState, generateNonce,
  buildAuthorizationUrl, clientCredentialsGrant
} from '../services/crypto'
import { decodeToken, analyzeToken, verifyToken } from '../services/token-service'

const FLOW_STATE_KEY = 'oauth-devtools:flow-state'

/**
 * Saves flow state to sessionStorage so it survives the redirect.
 */
function saveFlowState(state) {
  sessionStorage.setItem(FLOW_STATE_KEY, JSON.stringify(state))
}

export default function useOAuthFlow() {
  const [discovery, setDiscovery] = useState(null)
  const [discoveryError, setDiscoveryError] = useState(null)
  const [stepStatuses, setStepStatuses] = useState({})
  const [tokens, setTokens] = useState({})
  const [tokenAnalysis, setTokenAnalysis] = useState({})
  const [verificationResult, setVerificationResult] = useState(null)
  const [log, setLog] = useState([])
  const [error, setError] = useState(null)
  const [pkceValues, setPkceValues] = useState(null)

  const logEntry = useCallback((entry) => {
    setLog(prev => [{
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }, ...prev])
  }, [])

  const setStepStatus = useCallback((stepId, status) => {
    setStepStatuses(prev => ({ ...prev, [stepId]: status }))
  }, [])

  // ── Step: Discover ──────────────────────────────────────────────────────────
  const discover = useCallback(async (issuerUrl) => {
    setStepStatus('discover', 'active')
    setDiscoveryError(null)

    logEntry({
      type: 'request',
      method: 'GET',
      url: `${issuerUrl}/.well-known/openid-configuration`,
      label: 'OIDC Discovery',
      description: 'Fetching OpenID Connect discovery document to auto-detect endpoints.',
    })

    try {
      const doc = await fetchDiscoveryDocument(issuerUrl)
      const summary = summarizeDiscovery(doc)
      setDiscovery(summary)

      logEntry({
        type: 'response',
        status: 200,
        url: `${issuerUrl}/.well-known/openid-configuration`,
        label: 'Discovery Document',
        description: `Found ${Object.keys(doc).length} fields. PKCE: ${summary.supportsPKCE ? 'supported' : 'not declared'}`,
        body: doc,
      })

      setStepStatus('discover', 'done')
      return summary
    } catch (err) {
      setDiscoveryError(err.message)
      logEntry({
        type: 'response',
        status: 0,
        label: 'Discovery Failed',
        description: err.message,
        body: { error: err.message },
        isError: true,
      })
      setStepStatus('discover', 'error')
      return null
    }
  }, [logEntry, setStepStatus])

  // ── Step: PKCE + Redirect ───────────────────────────────────────────────────
  const startPKCEFlow = useCallback(async (config) => {
    if (!discovery) return

    setStepStatus('pkce', 'active')

    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = generateState()
    const nonce = generateNonce()

    setPkceValues({ codeVerifier, codeChallenge, state, nonce })

    const authUrl = buildAuthorizationUrl({
      authorizationEndpoint: discovery.authorizationEndpoint,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scope: config.scope,
      state,
      nonce,
      codeChallenge,
      codeChallengeMethod: 'S256',
      extraParams: config.extraParams,
    })

    logEntry({
      type: 'request',
      method: 'GET',
      url: authUrl,
      label: 'Authorization Request (Browser Redirect)',
      description: 'Redirecting browser to IDP /authorize endpoint with PKCE code_challenge.',
      body: Object.fromEntries(new URL(authUrl).searchParams),
    })

    setStepStatus('pkce', 'active')

    // Save state for after redirect
    saveFlowState({
      flow: 'authorization_code_pkce',
      codeVerifier,
      state,
      nonce,
      config,
      discovery,
    })

    // Redirect the browser
    window.location.href = authUrl
  }, [discovery, logEntry, setStepStatus])

  // ── Client Credentials Flow ─────────────────────────────────────────────────
  const startClientCredentials = useCallback(async (config) => {
    if (!discovery) return null

    setStepStatus('token', 'active')

    logEntry({
      type: 'request',
      method: 'POST',
      url: discovery.tokenEndpoint,
      label: 'Client Credentials Request',
      description: 'Machine-to-machine: authenticating with client_id + client_secret.',
      body: {
        grant_type: 'client_credentials',
        client_id: config.clientId,
        scope: config.scope,
      },
    })

    try {
      const result = await clientCredentialsGrant({
        tokenEndpoint: discovery.tokenEndpoint,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        scope: config.scope,
      })

      if (!result.success) {
        setStepStatus('token', 'error')
        logEntry({
          type: 'response',
          status: result.status,
          label: 'Client Credentials Failed',
          description: result.errorDescription,
          body: result.raw,
          isError: true,
        })
        return null
      }

      const receivedTokens = {
        access_token: result.accessToken,
        token_type: result.tokenType,
        expires_in: result.expiresIn,
        scope: result.scope,
      }

      setTokens(receivedTokens)

      if (result.accessToken) {
        setTokenAnalysis({ access_token: analyzeToken(result.accessToken) })
      }

      logEntry({
        type: 'response',
        status: 200,
        label: 'Access Token Issued',
        description: 'Client credentials accepted. No id_token or refresh_token for M2M flow.',
        body: result.raw,
      })

      setStepStatus('token', 'done')
      setStepStatus('inspect', 'done')

      return receivedTokens
    } catch (err) {
      setStepStatus('token', 'error')
      logEntry({
        type: 'response',
        status: 0,
        label: 'Client Credentials Network Error',
        description: err.message,
        body: { error: err.message },
        isError: true,
      })
      return null
    }
  }, [discovery, logEntry, setStepStatus])

  // ── Verify Token ────────────────────────────────────────────────────────────
  const verifyTokenSignature = useCallback(async (token) => {
    if (!discovery?.jwksUri) {
      setVerificationResult({ valid: false, error: 'No JWKS URI found in discovery document.' })
      return
    }

    logEntry({
      type: 'request',
      method: 'GET',
      url: discovery.jwksUri,
      label: 'JWKS Fetch (Signature Verification)',
      description: 'Fetching public keys to verify JWT signature.',
    })

    const result = await verifyToken(token, discovery.jwksUri, {
      issuer: discovery.issuer,
    })

    setVerificationResult(result)

    logEntry({
      type: 'response',
      status: result.valid ? 200 : 400,
      label: result.valid ? 'Signature Valid ✓' : 'Signature Invalid ✕',
      description: result.valid
        ? 'JWT signature verified against JWKS public key.'
        : `Verification failed: ${result.error}`,
      body: result,
      isError: !result.valid,
    })
  }, [discovery, logEntry])

  // ── Set tokens from callback (after redirect back) ─────────────────────────
  const setTokensFromCallback = useCallback((callbackTokens, callbackDiscovery) => {
    setTokens(callbackTokens)
    const analysis = {}
    if (callbackTokens.access_token) analysis.access_token = analyzeToken(callbackTokens.access_token)
    if (callbackTokens.id_token) analysis.id_token = analyzeToken(callbackTokens.id_token)
    setTokenAnalysis(analysis)
    if (callbackDiscovery) setDiscovery(callbackDiscovery)
    setStepStatuses({
      discover: 'done', pkce: 'done', inspect: 'done',
    })
  }, [])

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setStepStatuses({})
    setTokens({})
    setTokenAnalysis({})
    setVerificationResult(null)
    setLog([])
    setError(null)
    setPkceValues(null)
    // Keep discovery — don't re-fetch
  }, [])

  return {
    // State
    discovery,
    discoveryError,
    stepStatuses,
    tokens,
    tokenAnalysis,
    verificationResult,
    log,
    error,
    pkceValues,

    // Actions
    discover,
    startPKCEFlow,
    startClientCredentials,
    verifyTokenSignature,
    setTokensFromCallback,
    reset,
    clearLog: () => setLog([]),
    clearError: () => setError(null),
  }
}
