import { useState, useEffect } from 'react'
import { Button, Input, Tag } from './ui'
import {
  saveConfig, loadAllConfigs, loadConfig, deleteConfig,
  setActiveConfig, getActiveConfig, exportData, importData,
} from '../services/storage'

export default function ConfigManager({ currentConfig, onLoadConfig }) {
  const [configs, setConfigs] = useState({})
  const [saveName, setSaveName] = useState('')
  const [showSave, setShowSave] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [importText, setImportText] = useState('')
  const [activeConfig, setActive] = useState(null)

  useEffect(() => {
    setConfigs(loadAllConfigs())
    setActive(getActiveConfig())
  }, [])

  const handleSave = () => {
    if (!saveName.trim()) return
    saveConfig(saveName.trim(), currentConfig)
    setActiveConfig(saveName.trim())
    setActive(saveName.trim())
    setConfigs(loadAllConfigs())
    setSaveName('')
    setShowSave(false)
  }

  const handleLoad = (name) => {
    const config = loadConfig(name)
    if (config) {
      setActiveConfig(name)
      setActive(name)
      onLoadConfig(config)
    }
  }

  const handleDelete = (name) => {
    deleteConfig(name)
    setConfigs(loadAllConfigs())
    if (activeConfig === name) setActive(null)
  }

  const handleShare = () => {
    const encoded = btoa(JSON.stringify(currentConfig))
    const url = `${window.location.origin}?config=${encodeURIComponent(encoded)}`
    setShareUrl(url)
    setShowShare(true)
  }

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
  }

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'oauth-devtools-configs.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    try {
      const data = JSON.parse(importText)
      importData(data)
      setConfigs(loadAllConfigs())
      setImportText('')
    } catch {
      // invalid JSON, ignore
    }
  }

  const configNames = Object.keys(configs)

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-muted uppercase tracking-widest font-semibold">
        Saved Configurations
      </div>

      {/* Saved configs list */}
      {configNames.length === 0 ? (
        <div className="text-[11px] text-muted py-2">No saved configurations yet.</div>
      ) : (
        <div className="space-y-1.5">
          {configNames.map(name => (
            <div
              key={name}
              className={`
                flex items-center gap-2 px-2.5 py-1.5 rounded-md border transition-all
                ${activeConfig === name
                  ? 'bg-accent/10 border-accent/30'
                  : 'bg-panel border-border hover:border-accent/20'
                }
              `}
            >
              <button
                onClick={() => handleLoad(name)}
                className="flex-1 text-left text-[11px] font-semibold truncate cursor-pointer text-text hover:text-accent transition-colors"
              >
                {name}
              </button>
              {activeConfig === name && (
                <Tag color="accent">active</Tag>
              )}
              <button
                onClick={() => handleDelete(name)}
                className="text-[10px] text-muted hover:text-danger cursor-pointer transition-colors px-1"
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Save button / form */}
      {showSave ? (
        <div className="flex gap-1.5">
          <input
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Config name..."
            autoFocus
            className="flex-1 px-2 py-1 text-[11px] rounded bg-panel border border-border text-text placeholder:text-muted/50 outline-none focus:border-accent/50 font-mono"
          />
          <Button onClick={handleSave} size="sm" disabled={!saveName.trim()}>Save</Button>
          <Button onClick={() => setShowSave(false)} size="sm" variant="ghost">✕</Button>
        </div>
      ) : (
        <Button onClick={() => setShowSave(true)} size="sm" variant="secondary" className="w-full">
          Save Current Config
        </Button>
      )}

      {/* Share */}
      {showShare ? (
        <div className="space-y-1.5">
          <div className="text-[10px] text-muted uppercase tracking-widest">Share URL</div>
          <div className="flex gap-1.5">
            <input
              value={shareUrl}
              readOnly
              className="flex-1 px-2 py-1 text-[10px] rounded bg-bg border border-border text-code font-mono outline-none truncate"
            />
            <Button onClick={handleCopyShareUrl} size="sm" variant="secondary">Copy</Button>
          </div>
          <Button onClick={() => setShowShare(false)} size="sm" variant="ghost" className="w-full">Close</Button>
        </div>
      ) : (
        <Button onClick={handleShare} size="sm" variant="ghost" className="w-full">
          Share Config via URL
        </Button>
      )}

      {/* Export / Import */}
      <div className="flex gap-1.5">
        <Button onClick={handleExport} size="sm" variant="ghost" className="flex-1">
          Export All
        </Button>
        <Button
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.json'
            input.onchange = (e) => {
              const file = e.target.files[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = (ev) => {
                try {
                  const data = JSON.parse(ev.target.result)
                  importData(data)
                  setConfigs(loadAllConfigs())
                } catch { /* ignore */ }
              }
              reader.readAsText(file)
            }
            input.click()
          }}
          size="sm"
          variant="ghost"
          className="flex-1"
        >
          Import
        </Button>
      </div>
    </div>
  )
}
