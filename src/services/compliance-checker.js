/**
 * OAuth/OIDC Compliance Checker
 * Validates IDP configuration and tokens against best practices.
 */

/**
 * @typedef {object} CheckResult
 * @property {string} id
 * @property {string} category - 'security' | 'configuration' | 'best-practice'
 * @property {'pass'|'fail'|'warn'|'info'} status
 * @property {string} title
 * @property {string} description
 * @property {string} [recommendation]
 * @property {string} [reference] - RFC or spec reference
 */

/**
 * Run all compliance checks against a discovery document.
 * @param {object} discoveryDoc - The OIDC discovery document
 * @returns {CheckResult[]}
 */
export function checkDiscoveryCompliance(discoveryDoc) {
  const results = []

  // ── Security Checks ────────────────────────────────────────────────

  // HTTPS on all endpoints
  results.push({
    id: 'https-issuer',
    category: 'security',
    status: discoveryDoc.issuer?.startsWith('https://') ? 'pass' : 'fail',
    title: 'Issuer uses HTTPS',
    description: discoveryDoc.issuer?.startsWith('https://')
      ? 'Issuer URL is served over HTTPS.'
      : 'Issuer URL is not using HTTPS. This is a critical security requirement.',
    recommendation: 'All OAuth endpoints must use HTTPS in production.',
    reference: 'RFC 6749 Section 3.1',
  })

  results.push({
    id: 'https-endpoints',
    category: 'security',
    status: checkAllEndpointsHttps(discoveryDoc) ? 'pass' : 'fail',
    title: 'All endpoints use HTTPS',
    description: checkAllEndpointsHttps(discoveryDoc)
      ? 'All discovered endpoints use HTTPS.'
      : 'Some endpoints are not using HTTPS.',
    recommendation: 'Token, authorization, and userinfo endpoints must all use HTTPS.',
    reference: 'RFC 6749 Section 3.1',
  })

  // PKCE support
  const supportsPKCE = (discoveryDoc.code_challenge_methods_supported || []).includes('S256')
  results.push({
    id: 'pkce-s256',
    category: 'security',
    status: supportsPKCE ? 'pass' : 'warn',
    title: 'PKCE S256 supported',
    description: supportsPKCE
      ? 'Server supports S256 code challenge method.'
      : 'S256 PKCE code challenge method not declared in discovery.',
    recommendation: 'PKCE with S256 is required for public clients (OAuth 2.1).',
    reference: 'RFC 7636, OAuth 2.1 Draft',
  })

  // Plain PKCE (should not be used)
  const supportsPlain = (discoveryDoc.code_challenge_methods_supported || []).includes('plain')
  if (supportsPlain) {
    results.push({
      id: 'pkce-no-plain',
      category: 'security',
      status: 'warn',
      title: 'Plain PKCE method supported',
      description: 'Server supports "plain" code challenge method which provides weaker security.',
      recommendation: 'Only S256 should be used. Plain method offers minimal protection.',
      reference: 'RFC 7636 Section 4.2',
    })
  }

  // Implicit flow (deprecated in OAuth 2.1)
  const responseTypes = discoveryDoc.response_types_supported || []
  const supportsImplicit = responseTypes.some(rt => rt.includes('token') && !rt.includes('code'))
  results.push({
    id: 'no-implicit',
    category: 'security',
    status: supportsImplicit ? 'warn' : 'pass',
    title: supportsImplicit ? 'Implicit flow still supported' : 'Implicit flow not supported',
    description: supportsImplicit
      ? 'Server still supports the Implicit flow (response_type=token). This is deprecated in OAuth 2.1.'
      : 'Server does not support the deprecated Implicit flow.',
    recommendation: 'Migrate to Authorization Code + PKCE. Implicit flow exposes tokens in URLs.',
    reference: 'OAuth 2.1 Draft Section 2.1.2',
  })

  // ── Configuration Checks ───────────────────────────────────────────

  // JWKS URI
  results.push({
    id: 'jwks-uri',
    category: 'configuration',
    status: discoveryDoc.jwks_uri ? 'pass' : 'fail',
    title: 'JWKS URI present',
    description: discoveryDoc.jwks_uri
      ? `JWKS endpoint: ${discoveryDoc.jwks_uri}`
      : 'No jwks_uri found. Token signature verification will not be possible.',
    recommendation: 'JWKS URI is required for JWT signature verification.',
    reference: 'OpenID Connect Discovery 1.0',
  })

  // Token endpoint auth methods
  const authMethods = discoveryDoc.token_endpoint_auth_methods_supported || []
  results.push({
    id: 'token-auth-methods',
    category: 'configuration',
    status: authMethods.length > 0 ? 'pass' : 'info',
    title: 'Token endpoint auth methods',
    description: authMethods.length > 0
      ? `Supported: ${authMethods.join(', ')}`
      : 'Token endpoint auth methods not declared.',
    reference: 'RFC 6749 Section 2.3',
  })

  // UserInfo endpoint
  results.push({
    id: 'userinfo-endpoint',
    category: 'configuration',
    status: discoveryDoc.userinfo_endpoint ? 'pass' : 'info',
    title: 'UserInfo endpoint',
    description: discoveryDoc.userinfo_endpoint
      ? `Available: ${discoveryDoc.userinfo_endpoint}`
      : 'No UserInfo endpoint declared.',
    reference: 'OpenID Connect Core Section 5.3',
  })

  // Scopes
  const scopes = discoveryDoc.scopes_supported || []
  results.push({
    id: 'openid-scope',
    category: 'configuration',
    status: scopes.includes('openid') ? 'pass' : 'info',
    title: 'OpenID scope support',
    description: scopes.includes('openid')
      ? `Supported scopes: ${scopes.join(', ')}`
      : 'OpenID scope not declared (may still be supported).',
    reference: 'OpenID Connect Core Section 3.1.2.1',
  })

  // ── Best Practice Checks ───────────────────────────────────────────

  // Signing algorithms
  const sigAlgs = discoveryDoc.id_token_signing_alg_values_supported || []
  const usesAsymmetric = sigAlgs.some(a => a.startsWith('RS') || a.startsWith('ES') || a.startsWith('PS'))
  const usesHS256 = sigAlgs.includes('HS256')
  results.push({
    id: 'signing-algorithm',
    category: 'best-practice',
    status: usesAsymmetric ? 'pass' : usesHS256 ? 'warn' : 'info',
    title: 'ID token signing algorithms',
    description: sigAlgs.length > 0
      ? `Supported: ${sigAlgs.join(', ')}`
      : 'No signing algorithms declared.',
    recommendation: usesHS256 && !usesAsymmetric
      ? 'Consider using asymmetric algorithms (RS256, ES256) for better security.'
      : undefined,
    reference: 'OpenID Connect Core Section 3.1.3.7',
  })

  // Grant types
  const grantTypes = discoveryDoc.grant_types_supported || ['authorization_code']
  results.push({
    id: 'grant-types',
    category: 'best-practice',
    status: 'info',
    title: 'Supported grant types',
    description: `${grantTypes.join(', ')}`,
    reference: 'RFC 6749 Section 4',
  })

  // End session endpoint (logout)
  results.push({
    id: 'end-session',
    category: 'best-practice',
    status: discoveryDoc.end_session_endpoint ? 'pass' : 'info',
    title: 'Logout endpoint',
    description: discoveryDoc.end_session_endpoint
      ? 'End-session (logout) endpoint available.'
      : 'No end-session endpoint. Logout may not be supported via standard flow.',
    reference: 'OpenID Connect RP-Initiated Logout',
  })

  // Revocation endpoint
  results.push({
    id: 'revocation',
    category: 'best-practice',
    status: discoveryDoc.revocation_endpoint ? 'pass' : 'info',
    title: 'Token revocation endpoint',
    description: discoveryDoc.revocation_endpoint
      ? 'Token revocation endpoint available.'
      : 'No token revocation endpoint declared.',
    recommendation: !discoveryDoc.revocation_endpoint
      ? 'Token revocation allows clients to invalidate tokens they no longer need.'
      : undefined,
    reference: 'RFC 7009',
  })

  return results
}

/**
 * Run compliance checks against a JWT token.
 * @param {object} decoded - { header, payload } from decodeToken
 * @returns {CheckResult[]}
 */
export function checkTokenCompliance(decoded) {
  if (!decoded) return []

  const { header, payload } = decoded
  const results = []
  const now = Math.floor(Date.now() / 1000)

  // Algorithm
  results.push({
    id: 'token-algorithm',
    category: 'security',
    status: header.alg === 'none' ? 'fail' : header.alg?.startsWith('HS') ? 'warn' : 'pass',
    title: `Algorithm: ${header.alg || 'missing'}`,
    description: header.alg === 'none'
      ? 'Token uses "none" algorithm — it is unsigned and should never be trusted.'
      : header.alg?.startsWith('HS')
        ? 'Token uses symmetric HMAC algorithm. Asymmetric (RS256, ES256) is preferred for distributed systems.'
        : `Token uses ${header.alg} which is a strong asymmetric algorithm.`,
    reference: 'RFC 7518 Section 3',
  })

  // Expiration
  results.push({
    id: 'token-exp',
    category: 'security',
    status: payload.exp ? (payload.exp > now ? 'pass' : 'fail') : 'warn',
    title: payload.exp
      ? (payload.exp > now ? 'Token not expired' : 'Token expired')
      : 'No expiration claim',
    description: payload.exp
      ? `Expires: ${new Date(payload.exp * 1000).toLocaleString()}`
      : 'Token has no exp claim. Tokens without expiration are a security risk.',
    recommendation: !payload.exp ? 'Always set an expiration time on tokens.' : undefined,
    reference: 'RFC 7519 Section 4.1.4',
  })

  // Token lifetime
  if (payload.exp && payload.iat) {
    const lifetime = payload.exp - payload.iat
    const isLong = lifetime > 86400 // more than 24 hours
    results.push({
      id: 'token-lifetime',
      category: 'best-practice',
      status: isLong ? 'warn' : 'pass',
      title: `Token lifetime: ${formatDuration(lifetime)}`,
      description: isLong
        ? 'Token has a long lifetime (> 24 hours). Short-lived tokens reduce risk.'
        : 'Token lifetime is reasonable.',
      recommendation: isLong ? 'Consider shorter token lifetimes (1 hour) with refresh tokens.' : undefined,
      reference: 'OAuth 2.0 Security Best Current Practice',
    })
  }

  // Issuer
  results.push({
    id: 'token-iss',
    category: 'configuration',
    status: payload.iss ? 'pass' : 'warn',
    title: payload.iss ? `Issuer: ${payload.iss}` : 'No issuer claim',
    description: payload.iss
      ? 'Token has an issuer claim for validation.'
      : 'Token is missing the iss (issuer) claim.',
    reference: 'RFC 7519 Section 4.1.1',
  })

  // Audience
  results.push({
    id: 'token-aud',
    category: 'configuration',
    status: payload.aud ? 'pass' : 'warn',
    title: payload.aud ? 'Audience claim present' : 'No audience claim',
    description: payload.aud
      ? `Audience: ${Array.isArray(payload.aud) ? payload.aud.join(', ') : payload.aud}`
      : 'Token is missing the aud (audience) claim. This makes it harder to prevent token misuse.',
    reference: 'RFC 7519 Section 4.1.3',
  })

  // Key ID
  results.push({
    id: 'token-kid',
    category: 'best-practice',
    status: header.kid ? 'pass' : 'info',
    title: header.kid ? `Key ID: ${header.kid}` : 'No key ID in header',
    description: header.kid
      ? 'Token header includes kid for key rotation support.'
      : 'No kid in header. Key rotation requires the kid claim.',
    reference: 'RFC 7515 Section 4.1.4',
  })

  return results
}

function checkAllEndpointsHttps(doc) {
  const endpoints = [
    doc.authorization_endpoint,
    doc.token_endpoint,
    doc.userinfo_endpoint,
    doc.jwks_uri,
    doc.end_session_endpoint,
    doc.revocation_endpoint,
  ].filter(Boolean)

  return endpoints.every(url => url.startsWith('https://'))
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
}

/**
 * Get a summary of compliance check results.
 */
export function summarizeResults(results) {
  return {
    total: results.length,
    pass: results.filter(r => r.status === 'pass').length,
    fail: results.filter(r => r.status === 'fail').length,
    warn: results.filter(r => r.status === 'warn').length,
    info: results.filter(r => r.status === 'info').length,
    score: Math.round(
      (results.filter(r => r.status === 'pass').length /
       results.filter(r => r.status !== 'info').length) * 100
    ) || 0,
  }
}
