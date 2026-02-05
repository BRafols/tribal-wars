// Service for auto-recruiting units in Auto-Main villages
// Works on mass training screen (screen=train&mode=mass)

import type {
  RecruitmentData,
  UnitConfig,
  BuildingType,
  UnitType,
} from '../types/game'
import { getContentTicker } from './Ticker'

type RecruitmentListener = (data: RecruitmentData) => void

// Unit configuration for Auto-Main villages
// Priority: lower number = higher priority
const AUTO_MAIN_UNIT_CONFIG: UnitConfig[] = [
  { unitType: 'light', building: 'stable', priority: 1 },
  { unitType: 'spear', building: 'barracks', priority: 2 },
]

// Map of building types to their unit types
const BUILDING_UNITS: Record<BuildingType, UnitType[]> = {
  barracks: ['spear', 'sword', 'axe', 'archer'],
  stable: ['spy', 'light', 'marcher', 'heavy'],
  garage: ['ram', 'catapult'],
}

// Minimum queue threshold - add units when queue <= this value
const QUEUE_THRESHOLD = 1

// Interval between recruitment checks (ms)
const CHECK_INTERVAL = 5000

// Cooldown between recruitment actions (ms)
const ACTION_COOLDOWN = 3000

class RecruitmentService {
  private data: RecruitmentData | null = null
  private listeners: Set<RecruitmentListener> = new Set()
  private injected = false
  private messageHandler: ((event: MessageEvent) => void) | null = null
  private lastActionTime = 0
  private enabled = true

  /**
   * Initialize the service - call once when content script loads
   */
  init(): void {
    if (this.injected) return

    this.messageHandler = this.handleMessage.bind(this)
    window.addEventListener('message', this.messageHandler)

    this.injected = true

    // Register with ticker for periodic checks
    const ticker = getContentTicker()
    ticker.register('recruitment', () => this.tick(), CHECK_INTERVAL, { priority: 3 })

    console.log('RecruitmentService: Initialized')
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
    ticker.unregister('recruitment')

    this.listeners.clear()
    this.data = null
    this.injected = false

    console.log('RecruitmentService: Destroyed')
  }

  /**
   * Enable or disable auto-recruitment
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    console.log(`RecruitmentService: ${enabled ? 'Enabled' : 'Disabled'}`)
  }

  /**
   * Check if auto-recruitment is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Get current recruitment data
   */
  getData(): RecruitmentData | null {
    return this.data
  }

  /**
   * Subscribe to recruitment data updates
   */
  subscribe(listener: RecruitmentListener): () => void {
    this.listeners.add(listener)

    if (this.data) {
      listener(this.data)
    }

    return () => this.listeners.delete(listener)
  }

  /**
   * Request recruitment data from the page
   */
  requestUpdate(): void {
    window.postMessage({ type: 'TW_BOT_REQUEST_RECRUITMENT' }, '*')
  }

  /**
   * Main tick function - called periodically by the Ticker
   */
  private tick(): void {
    if (!this.enabled) return

    // First request updated data
    this.requestUpdate()
  }

  /**
   * Handle messages from the injected script
   */
  private handleMessage(event: MessageEvent): void {
    if (event.data?.type !== 'TW_BOT_RECRUITMENT_DATA') return

    const rawData = event.data.data
    if (!rawData) return

    // Check if we're on the mass training screen
    if (rawData.screen !== 'train' || rawData.mode !== 'mass') {
      return
    }

    this.data = this.parseRecruitmentData(rawData)
    this.notifyListeners()

    // Process auto-recruitment if enabled
    if (this.enabled) {
      this.processAutoRecruitment()
    }
  }

  /**
   * Parse raw recruitment data from page
   */
  private parseRecruitmentData(raw: {
    screen: string
    mode: string
    villageId: number
    buildings: Record<string, string>
    groupId: string | null
    queue: Array<{ count: number; unit: string }>
  }): RecruitmentData {
    // For mass training screen, we need to parse the DOM for village data
    // The raw data from page script gives us current village info
    // We'll request village-specific data via DOM parsing

    return {
      screen: raw.screen,
      mode: raw.mode,
      groupId: raw.groupId,
      villages: [], // Will be populated by DOM parsing in page script
    }
  }

  /**
   * Process auto-recruitment logic
   */
  private processAutoRecruitment(): void {
    if (!this.data) return

    const now = Date.now()
    if (now - this.lastActionTime < ACTION_COOLDOWN) {
      return // Still in cooldown
    }

    // Request the page to check and fill recruitment
    window.postMessage(
      {
        type: 'TW_BOT_AUTO_RECRUIT',
        config: {
          units: AUTO_MAIN_UNIT_CONFIG,
          threshold: QUEUE_THRESHOLD,
          buildingUnits: BUILDING_UNITS,
        },
      },
      '*'
    )

    this.lastActionTime = now
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
        console.error('RecruitmentService: Error in listener:', error)
      }
    }
  }
}

// Singleton instance
let instance: RecruitmentService | null = null

export function getRecruitmentService(): RecruitmentService {
  if (!instance) {
    instance = new RecruitmentService()
  }
  return instance
}
