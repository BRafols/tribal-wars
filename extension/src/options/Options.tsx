import { useState, useEffect, useCallback } from 'react'
import { StorageKey, Timing } from '../shared/constants'
import type { BotConfig, TabInfo, ScheduledTask } from '../shared/types'

const DEFAULT_CONFIG: BotConfig = {
  enabled: true,
  features: {
    scavenging: true,
    farming: true,
    recruiting: true,
    building: true,
  },
  timing: {
    minActionDelay: Timing.MIN_ACTION_DELAY_MS,
    maxJitter: Timing.MAX_JITTER_MS,
  },
  villages: {},
}

interface CoordinatorStatus {
  running: boolean
  tabCount: number
  taskCount: number
}

function Options() {
  const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG)
  const [status, setStatus] = useState<CoordinatorStatus>({ running: false, tabCount: 0, taskCount: 0 })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const loadConfig = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get([StorageKey.CONFIG])
      if (result[StorageKey.CONFIG]) {
        setConfig({ ...DEFAULT_CONFIG, ...(result[StorageKey.CONFIG] as Partial<BotConfig>) })
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get([StorageKey.TAB_REGISTRY, StorageKey.TASK_QUEUE])
      const tabs = (result[StorageKey.TAB_REGISTRY] as Record<number, TabInfo>) || {}
      const tasks = (result[StorageKey.TASK_QUEUE] as ScheduledTask[]) || []

      setStatus(prev => ({
        ...prev,
        tabCount: Object.keys(tabs).length,
        taskCount: tasks.length,
      }))
    } catch (error) {
      console.error('Failed to load status:', error)
    }
  }, [])

  // Load config and status on mount
  useEffect(() => {
    loadConfig()
    loadStatus()

    // Poll status every 5 seconds
    const intervalId = setInterval(loadStatus, 5000)
    return () => clearInterval(intervalId)
  }, [loadConfig, loadStatus])

  const saveConfig = useCallback(async () => {
    try {
      await chrome.storage.local.set({ [StorageKey.CONFIG]: config })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }, [config])

  const toggleFeature = (feature: keyof BotConfig['features']) => {
    setConfig(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature],
      },
    }))
  }

  const toggleEnabled = () => {
    setConfig(prev => ({
      ...prev,
      enabled: !prev.enabled,
    }))
  }

  const updateTiming = (key: keyof BotConfig['timing'], value: number) => {
    setConfig(prev => ({
      ...prev,
      timing: {
        ...prev.timing,
        [key]: value,
      },
    }))
  }

  const clearTasks = async () => {
    if (!confirm('Are you sure you want to clear all scheduled tasks?')) return

    try {
      await chrome.storage.local.set({ [StorageKey.TASK_QUEUE]: [] })
      loadStatus()
    } catch (error) {
      console.error('Failed to clear tasks:', error)
    }
  }

  if (loading) {
    return (
      <div className="options-container">
        <div className="section">Loading...</div>
      </div>
    )
  }

  return (
    <div className="options-container">
      <header className="options-header">
        <h1>Tribal Wars Bot</h1>
        <div className={`status-badge ${config.enabled ? 'running' : 'stopped'}`}>
          <span className="status-indicator" />
          {config.enabled ? 'Running' : 'Stopped'}
        </div>
      </header>

      {/* Master Toggle */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Bot Status</h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={toggleEnabled}
            />
            <span className="toggle-slider" />
          </label>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{status.tabCount}</span>
            <span className="stat-label">Active Tabs</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{status.taskCount}</span>
            <span className="stat-label">Pending Tasks</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {Object.values(config.features).filter(Boolean).length}
            </span>
            <span className="stat-label">Features Enabled</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Automation Features</h2>
        </div>
        <div className="feature-list">
          <div className="feature-item">
            <div className="feature-info">
              <span className="feature-name">Auto Scavenging</span>
              <span className="feature-description">
                Automatically restart scavenging runs when they complete
              </span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.features.scavenging}
                onChange={() => toggleFeature('scavenging')}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="feature-item">
            <div className="feature-info">
              <span className="feature-name">Auto Farming</span>
              <span className="feature-description">
                Automatically send farm attacks from the Farm Assistant
              </span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.features.farming}
                onChange={() => toggleFeature('farming')}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="feature-item">
            <div className="feature-info">
              <span className="feature-name">Auto Recruiting</span>
              <span className="feature-description">
                Automatically queue units in barracks when resources are available
              </span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.features.recruiting}
                onChange={() => toggleFeature('recruiting')}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="feature-item">
            <div className="feature-info">
              <span className="feature-name">Auto Building</span>
              <span className="feature-description">
                Complete buildings for free when under 3 minutes remaining
              </span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.features.building}
                onChange={() => toggleFeature('building')}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </section>

      {/* Timing Settings */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Timing Settings</h2>
        </div>
        <div className="timing-grid">
          <div className="timing-item">
            <label className="timing-label">Minimum Action Delay</label>
            <div className="timing-input">
              <input
                type="number"
                min="500"
                max="10000"
                step="100"
                value={config.timing.minActionDelay}
                onChange={(e) => updateTiming('minActionDelay', parseInt(e.target.value) || 1000)}
              />
              <span className="timing-unit">ms</span>
            </div>
          </div>
          <div className="timing-item">
            <label className="timing-label">Maximum Random Jitter</label>
            <div className="timing-input">
              <input
                type="number"
                min="0"
                max="5000"
                step="100"
                value={config.timing.maxJitter}
                onChange={(e) => updateTiming('maxJitter', parseInt(e.target.value) || 500)}
              />
              <span className="timing-unit">ms</span>
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="actions">
        <button className="btn btn-danger" onClick={clearTasks}>
          Clear Tasks
        </button>
        <button className="btn btn-primary" onClick={saveConfig}>
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

export default Options
