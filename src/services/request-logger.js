/**
 * Request Logger
 * Wraps fetch to capture request/response details for the log panel
 */

/**
 * @typedef {object} LogEntry
 * @property {string} id
 * @property {'request'|'response'} type
 * @property {string} method
 * @property {string} url
 * @property {number} [status]
 * @property {object} [headers]
 * @property {any} [body]
 * @property {string} timestamp
 * @property {number} [duration]
 * @property {string} [label]
 * @property {string} [description]
 * @property {boolean} [isError]
 */

let logListeners = []

/**
 * Subscribe to log events.
 * @param {function} listener
 * @returns {function} unsubscribe
 */
export function onLog(listener) {
  logListeners.push(listener)
  return () => {
    logListeners = logListeners.filter(l => l !== listener)
  }
}

function emit(entry) {
  for (const listener of logListeners) {
    listener(entry)
  }
}

/**
 * Create a log entry for a request.
 */
export function logRequest({ method, url, headers, body, label, description }) {
  const entry = {
    id: crypto.randomUUID(),
    type: 'request',
    method,
    url,
    headers: headers || {},
    body: body || null,
    label: label || `${method} ${url}`,
    description,
    timestamp: new Date().toISOString(),
  }
  emit(entry)
  return entry
}

/**
 * Create a log entry for a response.
 */
export function logResponse({ status, url, headers, body, label, description, duration, isError }) {
  const entry = {
    id: crypto.randomUUID(),
    type: 'response',
    status,
    url,
    headers: headers || {},
    body: body || null,
    label: label || `${status} ${url}`,
    description,
    timestamp: new Date().toISOString(),
    duration,
    isError: isError || status >= 400,
  }
  emit(entry)
  return entry
}

/**
 * Perform a fetch and log both request and response.
 * @param {string} url
 * @param {object} options - fetch options + { label, description }
 * @returns {Promise<Response>}
 */
export async function loggedFetch(url, options = {}) {
  const { label, description, ...fetchOptions } = options
  const method = (fetchOptions.method || 'GET').toUpperCase()

  // Parse body for logging
  let logBody = null
  if (fetchOptions.body) {
    if (typeof fetchOptions.body === 'string') {
      try {
        // Try to parse as URL-encoded
        logBody = Object.fromEntries(new URLSearchParams(fetchOptions.body))
      } catch {
        logBody = fetchOptions.body
      }
    }
  }

  logRequest({
    method,
    url,
    headers: fetchOptions.headers,
    body: logBody,
    label: label || `${method} ${url}`,
    description,
  })

  const startTime = performance.now()

  try {
    const response = await fetch(url, fetchOptions)
    const duration = Math.round(performance.now() - startTime)

    // Clone response so we can read the body for logging
    const cloned = response.clone()
    let responseBody
    try {
      responseBody = await cloned.json()
    } catch {
      responseBody = await cloned.text()
    }

    logResponse({
      status: response.status,
      url,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      label: label ? `${response.status} ${label}` : undefined,
      description,
      duration,
      isError: !response.ok,
    })

    return response
  } catch (err) {
    logResponse({
      status: 0,
      url,
      body: { error: err.message },
      label: `FAILED ${label || url}`,
      description: err.message,
      duration: Math.round(performance.now() - startTime),
      isError: true,
    })
    throw err
  }
}
