// Service for managing game data extraction and updates
// Uses the Ticker for periodic updates and provides event-based notifications

import type { WorldInfo } from '../types/game'
import { getContentTicker } from './Ticker'

type GameDataListener = (data: WorldInfo) => void

// Shape of the game's global data object
interface RawGameData {
  player: {
    name: string
    rank: number
    points: string
  }
  village: {
    name: string
    coord: string
    wood: number
    stone: number
    iron: number
    storage_max: number
    pop: number
    pop_max: number
    wood_prod: number
    stone_prod: number
    iron_prod: number
  }
  world: string
}

class GameDataService {
  private data: WorldInfo | null = null
  private lastUpdated: number | null = null
  private listeners: Set<GameDataListener> = new Set()
  private injected = false
  private messageHandler: ((event: MessageEvent) => void) | null = null

  /**
   * Initialize the service - call once when content script loads
   */
  init(): void {
    if (this.injected) return

    // Set up message listener for data from page context
    this.messageHandler = this.handleMessage.bind(this)
    window.addEventListener('message', this.messageHandler)

    // Inject script to read game_data
    this.injectReader()
    this.injected = true

    // Register with ticker for periodic updates
    const ticker = getContentTicker()
    ticker.register('gameData', () => this.requestUpdate(), 1000, { priority: 1 })
    ticker.start()

    console.log('GameDataService: Initialized')
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
    ticker.unregister('gameData')

    this.listeners.clear()
    this.data = null
    this.injected = false

    console.log('GameDataService: Destroyed')
  }

  /**
   * Get current game data (may be null if not yet loaded)
   */
  getData(): WorldInfo | null {
    return this.data
  }

  /**
   * Get timestamp of last data update
   */
  getLastUpdated(): number | null {
    return this.lastUpdated
  }

  /**
   * Subscribe to data updates
   */
  subscribe(listener: GameDataListener): () => void {
    this.listeners.add(listener)

    // Immediately call with current data if available
    if (this.data) {
      listener(this.data)
    }

    // Return unsubscribe function
    return () => this.listeners.delete(listener)
  }

  /**
   * Request a data update from the page
   */
  requestUpdate(): void {
    window.postMessage({ type: 'TW_BOT_REQUEST_GAME_DATA' }, '*')
  }

  /**
   * Handle messages from the injected script
   */
  private handleMessage(event: MessageEvent): void {
    if (event.data?.type !== 'TW_BOT_GAME_DATA' || !event.data.data) return

    const raw = event.data.data as RawGameData
    const newData = this.transformData(raw)

    // Check if data actually changed
    if (this.hasDataChanged(newData)) {
      this.data = newData
      this.lastUpdated = Date.now()
      this.notifyListeners()
    }
  }

  /**
   * Transform raw game data to our WorldInfo format
   */
  private transformData(raw: RawGameData): WorldInfo {
    return {
      world: raw.world.toUpperCase(),
      username: raw.player.name,
      points: parseInt(raw.player.points, 10) || 0,
      rank: raw.player.rank,
      villageName: raw.village.name,
      villageCoords: raw.village.coord,
      resources: {
        wood: Math.floor(raw.village.wood),
        clay: Math.floor(raw.village.stone),
        iron: Math.floor(raw.village.iron),
        storage: raw.village.storage_max,
      },
      population: {
        current: raw.village.pop,
        max: raw.village.pop_max,
      },
      production: {
        wood: Math.round(raw.village.wood_prod * 3600),
        clay: Math.round(raw.village.stone_prod * 3600),
        iron: Math.round(raw.village.iron_prod * 3600),
      },
    }
  }

  /**
   * Check if data has meaningfully changed
   */
  private hasDataChanged(newData: WorldInfo): boolean {
    if (!this.data) return true

    // Compare key fields that change frequently
    return (
      this.data.resources.wood !== newData.resources.wood ||
      this.data.resources.clay !== newData.resources.clay ||
      this.data.resources.iron !== newData.resources.iron ||
      this.data.population.current !== newData.population.current ||
      this.data.points !== newData.points ||
      this.data.villageName !== newData.villageName
    )
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
        console.error('GameDataService: Error in listener:', error)
      }
    }
  }

  /**
   * Inject script into page context to read game_data
   * Uses shared external script to avoid CSP inline script violations
   */
  private injectReader(): void {
    // Check if script is already injected (shared with BuildingQueueService)
    if (document.getElementById('tw-bot-page-script')) {
      console.log('GameDataService: Page script already injected')
      return
    }

    const script = document.createElement('script')
    script.id = 'tw-bot-page-script'
    script.src = chrome.runtime.getURL('src/page-scripts/game-data-reader.js')
    script.onload = () => {
      console.log('GameDataService: Page script loaded successfully')
    }
    script.onerror = (error) => {
      console.error('GameDataService: Failed to load page script:', error)
    }
    document.documentElement.appendChild(script)
  }
}

// Singleton instance
let instance: GameDataService | null = null

export function getGameDataService(): GameDataService {
  if (!instance) {
    instance = new GameDataService()
  }
  return instance
}
