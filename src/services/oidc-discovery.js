/**
 * OIDC Discovery Service
 * Fetches .well-known/openid-configuration from any issuer URL
 */

const discoveryCache = new Map()

/**
 * Fetch OIDC discovery document from an issuer URL.
 * @param {string} issuerUrl - e.g. "https://login.microsoftonline.com/{tenant}/v2.0"
 * @returns {Promise<object>} The discovery document
 */
export async function fetchDiscoveryDocument(issuerUrl) {
  const normalized = issuerUrl.replace(/\/+$/, '')

  if (discoveryCache.has(normalized)) {
    const cached = discoveryCache.get(normalized)
    if (Date.now() - cached.fetchedAt < 5 * 60 * 1000) {
      return cached.document
    }
  }

  const url = `${normalized}/.well-known/openid-configuration`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Discovery failed: ${response.status} ${response.statusText} from ${url}`)
  }

  const document = await response.json()

  // Validate required fields
  const required = ['issuer', 'authorization_endpoint', 'token_endpoint']
  for (const field of required) {
    if (!document[field]) {
      throw new Error(`Discovery document missing required field: ${field}`)
    }
  }

  discoveryCache.set(normalized, { document, fetchedAt: Date.now() })
  return document
}

/**
 * Extract the most useful info from a discovery document.
 */
export function summarizeDiscovery(doc) {
  return {
    issuer: doc.issuer,
    authorizationEndpoint: doc.authorization_endpoint,
    tokenEndpoint: doc.token_endpoint,
    userinfoEndpoint: doc.userinfo_endpoint || null,
    jwksUri: doc.jwks_uri || null,
    endSessionEndpoint: doc.end_session_endpoint || null,
    supportedScopes: doc.scopes_supported || [],
    supportedResponseTypes: doc.response_types_supported || [],
    supportedGrantTypes: doc.grant_types_supported || ['authorization_code'],
    supportedCodeChallengeMethods: doc.code_challenge_methods_supported || [],
    supportsPKCE: (doc.code_challenge_methods_supported || []).includes('S256'),
    supportsClientCredentials: (doc.grant_types_supported || []).includes('client_credentials'),
  }
}

export function clearDiscoveryCache() {
  discoveryCache.clear()
}
