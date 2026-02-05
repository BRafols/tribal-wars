// StateManager handles persisting coordinator state to chrome.storage.local
// This ensures state survives MV3 service worker suspension

import { StorageKey, Timing } from '../shared/constants'
import type { CoordinatorState, TabInfo, ScheduledTask, BotConfig } from '../shared/types'

// Default bot configuration
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

// Default coordinator state
const DEFAULT_STATE: CoordinatorState = {
  tabs: {},
  tasks: [],
  lastActionTime: 0,
  isRunning: false,
  lastUpdated: Date.now(),
}

class StateManager {
  private state: CoordinatorState = DEFAULT_STATE
  private config: BotConfig = DEFAULT_CONFIG
  private dirty = false
  private persistIntervalId: ReturnType<typeof setInterval> | null = null
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return

    await this.loadState()
    await this.loadConfig()
    this.startPersistInterval()
    this.initialized = true

    console.log('StateManager: Initialized')
  }

  destroy(): void {
    if (this.persistIntervalId) {
      clearInterval(this.persistIntervalId)
      this.persistIntervalId = null
    }
    this.initialized = false
    console.log('StateManager: Destroyed')
  }

  // ============ State Management ============

  getState(): CoordinatorState {
    return this.state
  }

  getTabs(): Record<number, TabInfo> {
    return this.state.tabs
  }

  getTab(tabId: number): TabInfo | undefined {
    return this.state.tabs[tabId]
  }

  setTab(tabId: number, tabInfo: TabInfo): void {
    this.state.tabs[tabId] = tabInfo
    this.markDirty()
  }

  removeTab(tabId: number): void {
    delete this.state.tabs[tabId]
    this.markDirty()
  }

  getTasks(): ScheduledTask[] {
    return this.state.tasks
  }

  setTasks(tasks: ScheduledTask[]): void {
    this.state.tasks = tasks
    this.markDirty()
  }

  addTask(task: ScheduledTask): void {
    this.state.tasks.push(task)
    this.markDirty()
  }

  removeTask(taskId: string): void {
    this.state.tasks = this.state.tasks.filter(t => t.id !== taskId)
    this.markDirty()
  }

  getLastActionTime(): number {
    return this.state.lastActionTime
  }

  setLastActionTime(time: number): void {
    this.state.lastActionTime = time
    this.markDirty()
  }

  isRunning(): boolean {
    return this.state.isRunning
  }

  setRunning(running: boolean): void {
    this.state.isRunning = running
    this.markDirty()
  }

  // ============ Config Management ============

  getConfig(): BotConfig {
    return this.config
  }

  async setConfig(config: Partial<BotConfig>): Promise<void> {
    this.config = { ...this.config, ...config }
    await this.saveConfig()
  }

  isFeatureEnabled(feature: keyof BotConfig['features']): boolean {
    return this.config.enabled && this.config.features[feature]
  }

  // ============ Persistence ============

  private async loadState(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        StorageKey.TAB_REGISTRY,
        StorageKey.TASK_QUEUE,
        StorageKey.LAST_ACTION_TIME,
      ])

      this.state = {
        tabs: (result[StorageKey.TAB_REGISTRY] as Record<number, TabInfo>) || {},
        tasks: (result[StorageKey.TASK_QUEUE] as ScheduledTask[]) || [],
        lastActionTime: (result[StorageKey.LAST_ACTION_TIME] as number) || 0,
        isRunning: false, // Always start stopped after suspension
        lastUpdated: Date.now(),
      }

      // Clean up stale tabs (those that haven't sent heartbeat recently)
      const now = Date.now()
      const staleThreshold = Timing.TAB_DEAD_THRESHOLD_MS
      for (const tabId of Object.keys(this.state.tabs)) {
        const tab = this.state.tabs[parseInt(tabId)]
        if (now - tab.lastHeartbeat > staleThreshold) {
          delete this.state.tabs[parseInt(tabId)]
        }
      }

      console.log('StateManager: Loaded state', {
        tabCount: Object.keys(this.state.tabs).length,
        taskCount: this.state.tasks.length,
      })
    } catch (error) {
      console.error('StateManager: Failed to load state', error)
      this.state = DEFAULT_STATE
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([StorageKey.CONFIG])
      if (result[StorageKey.CONFIG]) {
        this.config = { ...DEFAULT_CONFIG, ...(result[StorageKey.CONFIG] as Partial<BotConfig>) }
      }
      console.log('StateManager: Loaded config', this.config)
    } catch (error) {
      console.error('StateManager: Failed to load config', error)
      this.config = DEFAULT_CONFIG
    }
  }

  private async saveState(): Promise<void> {
    if (!this.dirty) return

    try {
      this.state.lastUpdated = Date.now()
      await chrome.storage.local.set({
        [StorageKey.TAB_REGISTRY]: this.state.tabs,
        [StorageKey.TASK_QUEUE]: this.state.tasks,
        [StorageKey.LAST_ACTION_TIME]: this.state.lastActionTime,
      })
      this.dirty = false
    } catch (error) {
      console.error('StateManager: Failed to save state', error)
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [StorageKey.CONFIG]: this.config,
      })
      console.log('StateManager: Saved config')
    } catch (error) {
      console.error('StateManager: Failed to save config', error)
    }
  }

  private markDirty(): void {
    this.dirty = true
  }

  async forceSave(): Promise<void> {
    this.markDirty()
    await this.saveState()
  }

  private startPersistInterval(): void {
    // Periodically save state to storage
    this.persistIntervalId = setInterval(() => {
      this.saveState()
    }, Timing.STATE_PERSIST_INTERVAL_MS)
  }
}

// Singleton instance
let instance: StateManager | null = null

export function getStateManager(): StateManager {
  if (!instance) {
    instance = new StateManager()
  }
  return instance
}
