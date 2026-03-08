/**
 * OAuth Crypto Utilities
 * PKCE code_verifier/code_challenge generation, state/nonce helpers
 */

/**
 * Base64url encode a buffer.
 */
function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Generate a cryptographically random string of given byte length.
 * @param {number} [byteLength=32]
 * @returns {string} Base64url-encoded random string
 */
export function generateRandom(byteLength = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(byteLength)))
}

/**
 * Generate a PKCE code_verifier (43-128 chars, RFC 7636).
 * @returns {string}
 */
export function generateCodeVerifier() {
  return generateRandom(32)
}

/**
 * Generate a PKCE code_challenge from a code_verifier using S256.
 * @param {string} verifier
 * @returns {Promise<string>}
 */
export async function generateCodeChallenge(verifier) {
  const encoded = new TextEncoder().encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', encoded)
  return base64url(hash)
}

/**
 * Generate a state parameter for CSRF protection.
 * @returns {string}
 */
export function generateState() {
  return generateRandom(16)
}

/**
 * Generate a nonce for OpenID Connect.
 * @returns {string}
 */
export function generateNonce() {
  return generateRandom(16)
}

/**
 * Build the full authorization URL with all parameters.
 * @param {object} params
 * @param {string} params.authorizationEndpoint
 * @param {string} params.clientId
 * @param {string} params.redirectUri
 * @param {string} params.scope
 * @param {string} params.state
 * @param {string} [params.nonce]
 * @param {string} [params.codeChallenge]
 * @param {string} [params.codeChallengeMethod]
 * @param {string} [params.responseType]
 * @param {object} [params.extraParams]
 * @returns {string}
 */
export function buildAuthorizationUrl({
  authorizationEndpoint,
  clientId,
  redirectUri,
  scope,
  state,
  nonce,
  codeChallenge,
  codeChallengeMethod = 'S256',
  responseType = 'code',
  extraParams = {},
}) {
  const params = new URLSearchParams({
    response_type: responseType,
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  })

  if (nonce) params.set('nonce', nonce)
  if (codeChallenge) {
    params.set('code_challenge', codeChallenge)
    params.set('code_challenge_method', codeChallengeMethod)
  }

  for (const [key, value] of Object.entries(extraParams)) {
    if (value) params.set(key, value)
  }

  return `${authorizationEndpoint}?${params.toString()}`
}

/**
 * Base64-encode a UTF-8 string (safe for non-ASCII characters).
 */
function base64EncodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(str)))
}

/**
 * Exchange an authorization code for tokens.
 * @param {object} params
 * @param {string} params.tokenEndpoint
 * @param {string} params.code
 * @param {string} params.redirectUri
 * @param {string} params.clientId
 * @param {string} [params.codeVerifier]
 * @param {string} [params.clientSecret]
 * @returns {Promise<object>} Token response
 */
export async function exchangeCodeForTokens({
  tokenEndpoint,
  code,
  redirectUri,
  clientId,
  codeVerifier,
  clientSecret,
}) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
  })

  if (codeVerifier) body.set('code_verifier', codeVerifier)

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' }

  // If client_secret is provided, use Basic auth
  if (clientSecret) {
    const credentials = base64EncodeUtf8(`${clientId}:${clientSecret}`)
    headers['Authorization'] = `Basic ${credentials}`
    body.delete('client_id') // client_id is in the auth header
  }

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers,
    body: body.toString(),
  })

  const data = await response.json()

  if (!response.ok || data.error) {
    return {
      success: false,
      status: response.status,
      error: data.error || 'token_exchange_failed',
      errorDescription: data.error_description || response.statusText,
      raw: data,
    }
  }

  return {
    success: true,
    status: response.status,
    accessToken: data.access_token,
    idToken: data.id_token || null,
    refreshToken: data.refresh_token || null,
    tokenType: data.token_type,
    expiresIn: data.expires_in,
    scope: data.scope,
    raw: data,
  }
}

/**
 * Request tokens using Client Credentials grant.
 * @param {object} params
 * @param {string} params.tokenEndpoint
 * @param {string} params.clientId
 * @param {string} params.clientSecret
 * @param {string} [params.scope]
 * @returns {Promise<object>} Token response
 */
export async function clientCredentialsGrant({
  tokenEndpoint,
  clientId,
  clientSecret,
  scope,
}) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
  })

  if (scope) body.set('scope', scope)

  const credentials = btoa(`${clientId}:${clientSecret}`)

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: body.toString(),
  })

  const data = await response.json()

  if (!response.ok || data.error) {
    return {
      success: false,
      status: response.status,
      error: data.error || 'client_credentials_failed',
      errorDescription: data.error_description || response.statusText,
      raw: data,
    }
  }

  return {
    success: true,
    status: response.status,
    accessToken: data.access_token,
    tokenType: data.token_type,
    expiresIn: data.expires_in,
    scope: data.scope,
    raw: data,
  }
}
