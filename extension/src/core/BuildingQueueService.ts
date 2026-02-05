// Service for monitoring building queue and auto-completing buildings
// when free completion (Finalizar) button is available (< 3 minutes remaining)

import type { BuildingQueueData } from '../types/game'
import { getContentTicker } from './Ticker'

type BuildingQueueListener = (data: BuildingQueueData) => void

// Threshold in seconds for free completion (3 minutes)
const FREE_COMPLETION_THRESHOLD = 180

class BuildingQueueService {
  private data: BuildingQueueData | null = null
  private listeners: Set<BuildingQueueListener> = new Set()
  private injected = false
  private messageHandler: ((event: MessageEvent) => void) | null = null
  private lastClickTime = 0
  private clickCooldown = 2000 // Minimum ms between click attempts

  /**
   * Initialize the service - call once when content script loads
   */
  init(): void {
    if (this.injected) return

    // Set up message listener for data from page context
    this.messageHandler = this.handleMessage.bind(this)
    window.addEventListener('message', this.messageHandler)

    // Inject script to read building queue data
    this.injectReader()
    this.injected = true

    // Register with ticker for periodic updates (check every 1 second)
    const ticker = getContentTicker()
    ticker.register('buildingQueue', () => this.requestUpdate(), 1000, { priority: 2 })

    console.log('BuildingQueueService: Initialized')
  }

  /**
   * Clean up the service
   */
  destroy(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler)
      this.messageHandler = null
    }

    const ticker = getContentTicker()
    ticker.unregister('buildingQueue')

    this.listeners.clear()
    this.data = null
    this.injected = false

    console.log('BuildingQueueService: Destroyed')
  }

  /**
   * Get current building queue data
   */
  getData(): BuildingQueueData | null {
    return this.data
  }

  /**
   * Subscribe to building queue updates
   */
  subscribe(listener: BuildingQueueListener): () => void {
    this.listeners.add(listener)

    // Immediately call with current data if available
    if (this.data) {
      listener(this.data)
    }

    return () => this.listeners.delete(listener)
  }

  /**
   * Request a data update from the page
   */
  requestUpdate(): void {
    window.postMessage({ type: 'TW_BOT_REQUEST_BUILDING_QUEUE' }, '*')
  }

  /**
   * Handle messages from the injected script
   */
  private handleMessage(event: MessageEvent): void {
    if (event.data?.type !== 'TW_BOT_BUILDING_QUEUE_DATA') return

    const data = event.data.data as BuildingQueueData | null
    if (!data) return

    this.data = data
    this.notifyListeners()
    this.checkForFreeCompletion()
  }

  /**
   * Check if any building can be completed for free and click the button
   */
  private checkForFreeCompletion(): void {
    if (!this.data || this.data.queue.length === 0) return

    console.log('checkForFreeCompletion')
    // Only check on the building screen
    if (this.data.screen !== 'main') {
      console.log('BuildingQueueService: Not on building screen, skipping auto-complete check')
      return
    }

    // Check the first building in queue (the one actively being built)
    const firstBuilding = this.data.queue[0]
    if (!firstBuilding) return

    // Check if remaining time is less than threshold
    if (firstBuilding.remainingSeconds > 0 && firstBuilding.remainingSeconds < FREE_COMPLETION_THRESHOLD) {
      console.log(`BuildingQueueService: Building completion in ${firstBuilding.remainingSeconds}s, looking for free completion button`)
      this.attemptFreeCompletion()
    }
  }

  /**
   * Attempt to click the free completion button
   */
  private attemptFreeCompletion(): void {
    const now = Date.now()
    if (now - this.lastClickTime < this.clickCooldown) {
      return // Still in cooldown
    }

    // Request the page context to click the button
    window.postMessage({ type: 'TW_BOT_CLICK_FREE_COMPLETION' }, '*')
    this.lastClickTime = now
  }

  /**
   * Notify all listeners of data update
   */
  private notifyListeners(): void {
    if (!this.data) return

    for (const listener of this.listeners) {
      try {
        listener(this.data)
      } catch (error) {
        console.error('BuildingQueueService: Error in listener:', error)
      }
    }
  }

  /**
   * Inject script into page context to read building queue data
   * Uses external script file to avoid CSP inline script violations
   */
  private injectReader(): void {
    // Check if script is already injected
    if (document.getElementById('tw-bot-page-script')) {
      console.log('BuildingQueueService: Page script already injected')
      return
    }

    const script = document.createElement('script')
    script.id = 'tw-bot-page-script'
    script.src = chrome.runtime.getURL('src/page-scripts/game-data-reader.js')
    script.onload = () => {
      console.log('BuildingQueueService: Page script loaded successfully')
    }
    script.onerror = (error) => {
      console.error('BuildingQueueService: Failed to load page script:', error)
    }
    document.documentElement.appendChild(script)
  }
}

// Singleton instance
let instance: BuildingQueueService | null = null

export function getBuildingQueueService(): BuildingQueueService {
  if (!instance) {
    instance = new BuildingQueueService()
  }
  return instance
}
