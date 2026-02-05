// Service for auto-building based on a configurable build order queue
// Extends the building system to queue buildings when resources are available

import type { BuildQueueConfig, BuildQueueItem } from '../shared/types'
import { StorageKey, Threshold } from '../shared/constants'
import { BuildingNames, BuildingDependencies, generateQueueItemId } from '../shared/buildings'
import { getContentTicker } from './Ticker'

interface VillageResources {
  wood: number
  stone: number
  iron: number
  storage: number
}

interface VillageBuildingLevels {
  [building: string]: number
}

type AutoBuildListener = (config: BuildQueueConfig, status: AutoBuildStatus) => void

export interface AutoBuildStatus {
  enabled: boolean
  paused: boolean
  currentItem: BuildQueueItem | null
  queueLength: number
  completedCount: number
  lastQueuedBuilding: string | null
  lastQueuedTime: number | null
  reason: string | null // Why we're not building (e.g., "Waiting for resources", "Dependencies not met")
}

// Default configuration
const DEFAULT_CONFIG: BuildQueueConfig = {
  enabled: false,
  paused: false,
  queue: [],
  resourceThresholdPct: Threshold.BUILD_RESOURCE_THRESHOLD_PCT,
}

class AutoBuildQueueService {
  private config: BuildQueueConfig = DEFAULT_CONFIG
  private status: AutoBuildStatus = {
    enabled: false,
    paused: false,
    currentItem: null,
    queueLength: 0,
    completedCount: 0,
    lastQueuedBuilding: null,
    lastQueuedTime: null,
    reason: null,
  }
  private listeners: Set<AutoBuildListener> = new Set()
  private initialized = false
  private lastCheckTime = 0
  private checkCooldown = 5000 // Check every 5 seconds
  private messageHandler: ((event: MessageEvent) => void) | null = null
  private villageResources: VillageResources | null = null
  private villageBuildingLevels: VillageBuildingLevels | null = null
  private buildingQueue: number = 0 // Number of buildings currently queued
  private maxBuildingQueue: number = 2 // Max buildings in queue (depends on premium)

  async init(): Promise<void> {
    if (this.initialized) return

    // Load configuration from storage
    await this.loadConfig()

    // Set up message listener for data from page context
    this.messageHandler = this.handleMessage.bind(this)
    window.addEventListener('message', this.messageHandler)

    // Register with ticker for periodic checks (check every 5 seconds)
    const ticker = getContentTicker()
    ticker.register('autoBuildQueue', () => this.checkAndQueueBuilding(), 5000, { priority: 3 })

    // Listen for storage changes to sync config
    chrome.storage.onChanged.addListener(this.handleStorageChange.bind(this))

    this.initialized = true
    console.log('AutoBuildQueueService: Initialized')
  }

  destroy(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler)
      this.messageHandler = null
    }

    const ticker = getContentTicker()
    ticker.unregister('autoBuildQueue')

    this.listeners.clear()
    this.initialized = false

    console.log('AutoBuildQueueService: Destroyed')
  }

  subscribe(listener: AutoBuildListener): () => void {
    this.listeners.add(listener)
    listener(this.config, this.status)
    return () => this.listeners.delete(listener)
  }

  getConfig(): BuildQueueConfig {
    return { ...this.config }
  }

  getStatus(): AutoBuildStatus {
    return { ...this.status }
  }

  async updateConfig(config: Partial<BuildQueueConfig>): Promise<void> {
    this.config = { ...this.config, ...config }
    await this.saveConfig()
    this.updateStatus()
    this.notifyListeners()
  }

  async setQueue(queue: BuildQueueItem[]): Promise<void> {
    this.config.queue = queue
    await this.saveConfig()
    this.updateStatus()
    this.notifyListeners()
  }

  async addToQueue(building: string, targetLevel: number): Promise<void> {
    const item: BuildQueueItem = {
      id: generateQueueItemId(),
      building,
      targetLevel,
      completed: false,
    }
    this.config.queue.push(item)
    await this.saveConfig()
    this.updateStatus()
    this.notifyListeners()
  }

  async removeFromQueue(itemId: string): Promise<void> {
    this.config.queue = this.config.queue.filter(item => item.id !== itemId)
    await this.saveConfig()
    this.updateStatus()
    this.notifyListeners()
  }

  async reorderQueue(fromIndex: number, toIndex: number): Promise<void> {
    const queue = [...this.config.queue]
    const [removed] = queue.splice(fromIndex, 1)
    if (removed) {
      queue.splice(toIndex, 0, removed)
      this.config.queue = queue
      await this.saveConfig()
      this.updateStatus()
      this.notifyListeners()
    }
  }

  async skipCurrentItem(): Promise<void> {
    const currentIndex = this.config.queue.findIndex(item => !item.completed)
    if (currentIndex >= 0) {
      this.config.queue[currentIndex].completed = true
      await this.saveConfig()
      this.updateStatus()
      this.notifyListeners()
    }
  }

  async clearQueue(): Promise<void> {
    this.config.queue = []
    await this.saveConfig()
    this.updateStatus()
    this.notifyListeners()
  }

  async togglePause(): Promise<void> {
    this.config.paused = !this.config.paused
    await this.saveConfig()
    this.updateStatus()
    this.notifyListeners()
  }

  async toggleEnabled(): Promise<void> {
    this.config.enabled = !this.config.enabled
    await this.saveConfig()
    this.updateStatus()
    this.notifyListeners()
  }

  private async loadConfig(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([StorageKey.BUILD_QUEUE_CONFIG])
      if (result[StorageKey.BUILD_QUEUE_CONFIG]) {
        this.config = { ...DEFAULT_CONFIG, ...(result[StorageKey.BUILD_QUEUE_CONFIG] as Partial<BuildQueueConfig>) }
      }
    } catch (error) {
      console.error('AutoBuildQueueService: Failed to load config:', error)
    }
    this.updateStatus()
  }

  private async saveConfig(): Promise<void> {
    try {
      await chrome.storage.local.set({ [StorageKey.BUILD_QUEUE_CONFIG]: this.config })
    } catch (error) {
      console.error('AutoBuildQueueService: Failed to save config:', error)
    }
  }

  private handleStorageChange(changes: { [key: string]: chrome.storage.StorageChange }): void {
    if (changes[StorageKey.BUILD_QUEUE_CONFIG]) {
      const newConfig = changes[StorageKey.BUILD_QUEUE_CONFIG].newValue as BuildQueueConfig
      if (newConfig) {
        this.config = { ...DEFAULT_CONFIG, ...newConfig }
        this.updateStatus()
        this.notifyListeners()
      }
    }
  }

  private handleMessage(event: MessageEvent): void {
    if (!event.data?.type?.startsWith('TW_BOT_')) return

    switch (event.data.type) {
      case 'TW_BOT_GAME_DATA': {
        const data = event.data.data
        if (data?.village) {
          this.villageBuildingLevels = data.village.buildings || {}
        }
        break
      }
      case 'TW_BOT_BUILDING_DATA': {
        const data = event.data.data
        if (data) {
          this.villageResources = {
            wood: data.wood || 0,
            stone: data.stone || 0,
            iron: data.iron || 0,
            storage: data.storage || 1,
          }
          this.buildingQueue = data.queueCount || 0
          this.maxBuildingQueue = data.maxQueue || 2
        }
        break
      }
      case 'TW_BOT_BUILD_RESULT': {
        const result = event.data.data
        if (result?.success) {
          this.status.lastQueuedBuilding = result.building || null
          this.status.lastQueuedTime = Date.now()
          console.log(`AutoBuildQueueService: Successfully queued ${result.building}`)
        } else if (result?.error) {
          console.warn(`AutoBuildQueueService: Failed to queue building: ${result.error}`)
        }
        break
      }
    }
  }

  private checkAndQueueBuilding(): void {
    // Skip if not enabled or paused
    if (!this.config.enabled || this.config.paused) {
      this.status.reason = this.config.paused ? 'Paused' : 'Disabled'
      return
    }

    // Rate limiting
    const now = Date.now()
    if (now - this.lastCheckTime < this.checkCooldown) {
      return
    }
    this.lastCheckTime = now

    // Request building data from page
    window.postMessage({ type: 'TW_BOT_REQUEST_BUILDING_DATA' }, '*')

    // Find first incomplete item in queue
    const currentItem = this.config.queue.find(item => !item.completed)
    if (!currentItem) {
      this.status.currentItem = null
      this.status.reason = 'Queue empty'
      return
    }

    this.status.currentItem = currentItem

    // Check if building has reached target level
    const currentLevel = this.villageBuildingLevels?.[currentItem.building] || 0
    if (currentLevel >= currentItem.targetLevel) {
      // Mark as completed and check next
      currentItem.completed = true
      this.saveConfig()
      this.updateStatus()
      this.notifyListeners()
      return
    }

    // Check if building queue is full
    if (this.buildingQueue >= this.maxBuildingQueue) {
      this.status.reason = 'Build queue full'
      return
    }

    // Check building dependencies
    if (!this.checkDependencies(currentItem.building)) {
      this.status.reason = `Dependencies not met for ${BuildingNames[currentItem.building] || currentItem.building}`
      return
    }

    // Request building cost from page
    window.postMessage({
      type: 'TW_BOT_REQUEST_BUILDING_COST',
      data: { building: currentItem.building }
    }, '*')

    // For now, always try to queue if we have any resources
    // The page script will validate and report back
    if (this.canAffordWithThreshold()) {
      this.queueBuilding(currentItem.building)
      this.status.reason = null
    } else {
      this.status.reason = `Waiting for resources (keeping ${this.config.resourceThresholdPct}% reserve)`
    }
  }

  private checkDependencies(building: string): boolean {
    const deps = BuildingDependencies[building]
    if (!deps || deps.length === 0) return true

    for (const dep of deps) {
      const currentLevel = this.villageBuildingLevels?.[dep.building] || 0
      if (currentLevel < dep.level) {
        return false
      }
    }
    return true
  }

  private canAffordWithThreshold(): boolean {
    // If we don't have resource data yet, optimistically assume we can afford it
    // The page script will do the actual validation
    if (!this.villageResources) return true

    // For simplicity, we'll let the page script handle the actual cost calculation
    // This is because building costs vary by level and we'd need to maintain that data
    return true
  }

  private queueBuilding(building: string): void {
    console.log(`AutoBuildQueueService: Requesting to queue ${BuildingNames[building] || building}`)
    window.postMessage({
      type: 'TW_BOT_QUEUE_BUILDING',
      data: {
        buildingId: building,
        resourceThreshold: this.config.resourceThresholdPct
      }
    }, '*')
  }

  private updateStatus(): void {
    const currentItem = this.config.queue.find(item => !item.completed) || null
    const completedCount = this.config.queue.filter(item => item.completed).length

    this.status = {
      ...this.status,
      enabled: this.config.enabled,
      paused: this.config.paused,
      currentItem,
      queueLength: this.config.queue.length,
      completedCount,
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.config, this.status)
      } catch (error) {
        console.error('AutoBuildQueueService: Error in listener:', error)
      }
    }
  }
}

// Singleton instance
let instance: AutoBuildQueueService | null = null

export function getAutoBuildQueueService(): AutoBuildQueueService {
  if (!instance) {
    instance = new AutoBuildQueueService()
  }
  return instance
}
