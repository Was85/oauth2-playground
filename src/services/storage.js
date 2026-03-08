/**
 * Storage Service
 * Persists OAuth configurations and history to localStorage
 */

const STORAGE_KEYS = {
  CONFIGS: 'oauth-devtools:configs',
  ACTIVE_CONFIG: 'oauth-devtools:active-config',
  HISTORY: 'oauth-devtools:history',
}

/**
 * Save a named OAuth configuration.
 * @param {string} name
 * @param {object} config
 */
export function saveConfig(name, config) {
  const configs = loadAllConfigs()
  configs[name] = { ...config, savedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify(configs))
}

/**
 * Load all saved configurations.
 * @returns {object}
 */
export function loadAllConfigs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIGS) || '{}')
  } catch {
    return {}
  }
}

/**
 * Load a specific configuration by name.
 * @param {string} name
 * @returns {object|null}
 */
export function loadConfig(name) {
  const configs = loadAllConfigs()
  return configs[name] || null
}

/**
 * Delete a saved configuration.
 * @param {string} name
 */
export function deleteConfig(name) {
  const configs = loadAllConfigs()
  delete configs[name]
  localStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify(configs))
}

/**
 * Save the active configuration name.
 */
export function setActiveConfig(name) {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_CONFIG, name)
}

/**
 * Get the active configuration name.
 */
export function getActiveConfig() {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_CONFIG)
}

/**
 * Add a request/response entry to history.
 * @param {object} entry
 */
export function addToHistory(entry) {
  const history = loadHistory()
  history.unshift({
    ...entry,
    timestamp: new Date().toISOString(),
    id: crypto.randomUUID(),
  })
  // Keep last 100 entries
  if (history.length > 100) history.length = 100
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history))
}

/**
 * Load request/response history.
 * @returns {Array}
 */
export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]')
  } catch {
    return []
  }
}

/**
 * Clear all history.
 */
export function clearHistory() {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]))
}

/**
 * Export all data as JSON for backup/sharing.
 */
export function exportData() {
  return {
    configs: loadAllConfigs(),
    activeConfig: getActiveConfig(),
    exportedAt: new Date().toISOString(),
  }
}

/**
 * Import data from a JSON export.
 */
export function importData(data) {
  if (data.configs) {
    const existing = loadAllConfigs()
    const merged = { ...existing, ...data.configs }
    localStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify(merged))
  }
  if (data.activeConfig) {
    setActiveConfig(data.activeConfig)
  }
}
