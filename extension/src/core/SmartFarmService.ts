// SmartFarmService handles intelligent farm scheduling with arrival time coordination
// Calculates travel times and schedules attacks to arrive at optimal intervals

import { StorageKey, Timing } from '../shared/constants'
import type {
  FarmTarget,
  FarmAttackPlan,
  FarmAttackTemplate,
  SmartFarmState,
  WorldConfig,
  UnitType,
} from '../shared/types'
import { UNIT_SPEEDS } from '../shared/types'
import {
  createFarmRegisterArrivalMessage,
  createFarmGetArrivalsMessage,
  createFarmClearArrivalsMessage,
  type FarmArrivalsResponsePayload,
} from '../shared/messages'
import { getContentTicker } from './Ticker'
import { getGameDataService } from './GameDataService'

// Default world speeds (fallback if API fetch fails)
const DEFAULT_WORLD_SPEED = 1
const DEFAULT_UNIT_SPEED = 1

// Farm Assistant page selectors
const FARM_SELECTORS = {
  farmTable: '#plunder_list, .vis.w100',
  farmRow: 'tr[data-id], tr.row_a, tr.row_b',
  attackButtonA: 'a.farm_icon_a',
  attackButtonB: 'a.farm_icon_b',
  villageLink: 'a[href*="info_village"]',
  distanceCell: 'td:nth-child(4)',
  coordsCell: 'td:nth-child(3)',
  wallCell: 'td:nth-child(7)',
  lastReportCell: 'td:nth-child(8)',
}

class SmartFarmService {
  private initialized = false
  private targets: Map<string, FarmTarget> = new Map()
  private scheduledAttacks: FarmAttackPlan[] = []
  private arrivals: Map<string, number> = new Map()
  private worldConfig: WorldConfig | null = null
  private sourceVillageId: number | null = null
  private templates: { A: FarmAttackTemplate | null; B: FarmAttackTemplate | null } = {
    A: null,
    B: null,
  }
  private lastAttackTime = 0
  private enabled = true
  private listeners: Set<(state: SmartFarmState) => void> = new Set()

  async init(): Promise<void> {
    if (this.initialized) return

    // Load persisted state
    await this.loadState()

    // Get current village info from game data
    const gameDataService = getGameDataService()
    const gameData = gameDataService.getData()
    if (gameData) {
      this.updateSourceVillage(gameData)
    }
    gameDataService.subscribe(data => this.updateSourceVillage(data))

    // Fetch world config and unit info (cached)
    await this.fetchWorldConfig()

    // Register with ticker for periodic checks
    const ticker = getContentTicker()
    ticker.register('smartFarm:check', () => this.checkAndScheduleAttacks(), 5000, { priority: 4 })
    ticker.register('smartFarm:process', () => this.processScheduledAttacks(), 1000, { priority: 3 })

    // Set up message listener for page script communication
    window.addEventListener('message', this.handlePageMessage.bind(this))

    this.initialized = true
    console.log('SmartFarmService: Initialized')

    // Initial check if on farm page
    if (this.isOnFarmPage()) {
      this.parseTargetsFromDOM()
      this.parseTemplatesFromDOM()
    }
  }

  destroy(): void {
    if (!this.initialized) return

    const ticker = getContentTicker()
    ticker.unregister('smartFarm:check')
    ticker.unregister('smartFarm:process')

    this.listeners.clear()
    this.initialized = false
    console.log('SmartFarmService: Destroyed')
  }

  // ============ State Management ============

  private async loadState(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        StorageKey.WORLD_CONFIG,
        StorageKey.UNIT_INFO,
      ])

      if (result[StorageKey.WORLD_CONFIG]) {
        this.worldConfig = result[StorageKey.WORLD_CONFIG] as WorldConfig
      }

      // Fetch shared arrivals from background service worker
      await this.syncArrivalsFromBackground()

      console.log('SmartFarmService: Loaded state', {
        arrivalCount: this.arrivals.size,
        scheduledCount: this.scheduledAttacks.length,
      })
    } catch (error) {
      console.error('SmartFarmService: Failed to load state', error)
    }
  }

  private async syncArrivalsFromBackground(): Promise<void> {
    try {
      const message = createFarmGetArrivalsMessage({})
      const response = await chrome.runtime.sendMessage(message) as FarmArrivalsResponsePayload | { arrivals: Record<string, number> }

      if (response && 'arrivals' in response) {
        this.arrivals = new Map(Object.entries(response.arrivals))
        console.log('SmartFarmService: Synced arrivals from background', {
          count: this.arrivals.size,
        })
      }
    } catch (error) {
      console.warn('SmartFarmService: Failed to sync arrivals from background', error)
    }
  }

  private async saveState(): Promise<void> {
    try {
      const state: SmartFarmState = {
        arrivals: Object.fromEntries(this.arrivals),
        scheduledAttacks: this.scheduledAttacks,
        attacksSentToday: this.getAttacksSentToday(),
        lastAttackSent: this.lastAttackTime || null,
        enabled: this.enabled,
        targetIntervalMs: Timing.FARM_TARGET_INTERVAL_MS,
      }

      await chrome.storage.local.set({
        [StorageKey.FARM_STATE]: state,
      })
    } catch (error) {
      console.error('SmartFarmService: Failed to save state', error)
    }
  }

  // ============ World Config & Unit Info ============

  private async fetchWorldConfig(): Promise<void> {
    // Check if we have recent cached config (< 1 hour old)
    if (this.worldConfig && Date.now() - this.worldConfig.fetchedAt < 3600000) {
      console.log('SmartFarmService: Using cached world config')
      return
    }

    try {
      // Request world config from page script
      window.postMessage({ type: 'TW_BOT_REQUEST_WORLD_CONFIG' }, '*')

      // Wait for response with timeout
      const config = await this.waitForMessage<WorldConfig>('TW_BOT_WORLD_CONFIG', 5000)

      if (config) {
        this.worldConfig = {
          ...config,
          fetchedAt: Date.now(),
        }
        await chrome.storage.local.set({ [StorageKey.WORLD_CONFIG]: this.worldConfig })
        console.log('SmartFarmService: Fetched world config', this.worldConfig)
      }
    } catch (error) {
      console.warn('SmartFarmService: Failed to fetch world config, using defaults', error)
      this.worldConfig = {
        speed: DEFAULT_WORLD_SPEED,
        unitSpeed: DEFAULT_UNIT_SPEED,
        worldId: '',
        fetchedAt: Date.now(),
      }
    }
  }

  private waitForMessage<T>(type: string, timeout: number): Promise<T | null> {
    return new Promise(resolve => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === type) {
          window.removeEventListener('message', handler)
          resolve(event.data.data as T)
        }
      }

      window.addEventListener('message', handler)

      // Timeout fallback
      setTimeout(() => {
        window.removeEventListener('message', handler)
        resolve(null)
      }, timeout)
    })
  }

  // ============ Village Info ============

  private updateSourceVillage(gameData: { villageCoords?: string }): void {
    if (!gameData.villageCoords) return

    // Get village ID from URL or game data
    const urlMatch = window.location.href.match(/village=(\d+)/)
    if (urlMatch) {
      this.sourceVillageId = parseInt(urlMatch[1], 10)
    }
  }

  // ============ Target Parsing ============

  parseTargetsFromDOM(): void {
    if (!this.isOnFarmPage()) return

    const table = document.querySelector(FARM_SELECTORS.farmTable)
    if (!table) {
      console.warn('SmartFarmService: Farm table not found')
      return
    }

    const rows = table.querySelectorAll(FARM_SELECTORS.farmRow)
    const newTargets: FarmTarget[] = []

    rows.forEach(row => {
      if (row.querySelector('th')) return

      const villageLink = row.querySelector(FARM_SELECTORS.villageLink) as HTMLAnchorElement | null
      if (!villageLink) return

      const villageIdMatch = villageLink.href.match(/id=(\d+)/)
      if (!villageIdMatch) return

      const villageId = parseInt(villageIdMatch[1], 10)

      // Extract coordinates
      const coordsText = villageLink.textContent || ''
      const coordsMatch = coordsText.match(/\((\d+)\|(\d+)\)/)
      if (!coordsMatch) return

      const x = parseInt(coordsMatch[1], 10)
      const y = parseInt(coordsMatch[2], 10)
      const coords = `${x}|${y}`

      // Parse distance
      const distanceCell = row.querySelector(FARM_SELECTORS.distanceCell)
      const distanceText = distanceCell?.textContent?.trim() || '0'
      const distance = parseFloat(distanceText.replace(',', '.')) || 0

      // Parse wall level if available
      const wallCell = row.querySelector(FARM_SELECTORS.wallCell)
      const wallText = wallCell?.textContent?.trim() || ''
      const wallLevel = wallText ? parseInt(wallText, 10) || null : null

      // Check button availability
      const attackBtnA = row.querySelector(FARM_SELECTORS.attackButtonA) as HTMLElement | null
      const attackBtnB = row.querySelector(FARM_SELECTORS.attackButtonB) as HTMLElement | null
      const hasAttackButton =
        (attackBtnA && !attackBtnA.classList.contains('farm_icon_disabled')) ||
        (attackBtnB && !attackBtnB.classList.contains('farm_icon_disabled'))

      const status: FarmTarget['status'] = hasAttackButton ? 'available' : 'cooldown'

      newTargets.push({
        villageId,
        coords,
        x,
        y,
        distance,
        wallLevel,
        lastAttacked: null,
        status,
      })
    })

    // Update targets map
    for (const target of newTargets) {
      this.targets.set(target.coords, target)
    }

    console.log('SmartFarmService: Parsed targets', {
      total: newTargets.length,
      available: newTargets.filter(t => t.status === 'available').length,
    })

    this.notifyListeners()
  }

  parseTemplatesFromDOM(): void {
    // Templates are accessed via Accountmanager.farm.templates in page context
    // Request from page script
    window.postMessage({ type: 'TW_BOT_REQUEST_FARM_TEMPLATES' }, '*')
  }

  // ============ Travel Time Calculation ============

  calculateTravelTimeMs(distance: number, slowestUnit: UnitType): number {
    const worldSpeed = this.worldConfig?.speed || DEFAULT_WORLD_SPEED
    const unitSpeedMod = this.worldConfig?.unitSpeed || DEFAULT_UNIT_SPEED

    const unitSpeed = UNIT_SPEEDS[slowestUnit]
    const travelMinutes = (distance * unitSpeed) / (worldSpeed * unitSpeedMod)

    return travelMinutes * 60 * 1000
  }

  calculateArrivalTime(distance: number, slowestUnit: UnitType): number {
    const travelTimeMs = this.calculateTravelTimeMs(distance, slowestUnit)
    return Date.now() + travelTimeMs
  }

  getSlowestUnit(template: FarmAttackTemplate): UnitType {
    if (template.slowestUnit) return template.slowestUnit

    let slowest: UnitType = 'spy' // Fastest unit as default
    let slowestSpeed = 0

    for (const [unit, count] of Object.entries(template.units)) {
      if (count && count > 0) {
        const speed = UNIT_SPEEDS[unit as UnitType]
        if (speed > slowestSpeed) {
          slowestSpeed = speed
          slowest = unit as UnitType
        }
      }
    }

    return slowest
  }

  // ============ Attack Scheduling ============

  private async checkAndScheduleAttacks(): Promise<void> {
    if (!this.enabled || !this.isOnFarmPage()) return

    // Re-parse targets to get fresh status
    this.parseTargetsFromDOM()

    // Sync arrivals from background for multi-village coordination
    await this.syncArrivalsFromBackground()

    const now = Date.now()

    for (const [coords, target] of this.targets) {
      if (target.status !== 'available') continue

      // Get last arrival time for this target (from shared state)
      const lastArrival = this.arrivals.get(coords) || 0
      const nextAllowedArrival = lastArrival + Timing.FARM_TARGET_INTERVAL_MS

      // Determine which template to use
      const template = this.selectTemplate()
      if (!template) {
        console.log('SmartFarmService: No template available')
        continue
      }

      const slowestUnit = this.getSlowestUnit(template)
      const travelTimeMs = this.calculateTravelTimeMs(target.distance, slowestUnit)

      // Calculate when we need to send to arrive at next allowed time
      const requiredSendTime = nextAllowedArrival - travelTimeMs

      // Check if attack is already scheduled for this target
      const existingScheduled = this.scheduledAttacks.find(
        a => a.targetCoords === coords && a.status === 'pending'
      )
      if (existingScheduled) continue

      // Schedule the attack
      if (requiredSendTime <= now) {
        // Can send immediately
        this.scheduleAttack(target, template, now, now + travelTimeMs)
      } else {
        // Schedule for later
        this.scheduleAttack(target, template, requiredSendTime, requiredSendTime + travelTimeMs)
      }
    }

    this.saveState()
    this.notifyListeners()
  }

  private scheduleAttack(
    target: FarmTarget,
    template: FarmAttackTemplate,
    sendTime: number,
    arrivalTime: number
  ): void {
    if (!this.sourceVillageId) {
      console.warn('SmartFarmService: No source village ID')
      return
    }

    const slowestUnit = this.getSlowestUnit(template)
    const travelTimeMs = this.calculateTravelTimeMs(target.distance, slowestUnit)

    const plan: FarmAttackPlan = {
      targetId: target.villageId.toString(),
      targetCoords: target.coords,
      sourceVillageId: this.sourceVillageId,
      template: template.id,
      sendTime,
      arrivalTime,
      travelTimeMs,
      status: 'pending',
    }

    this.scheduledAttacks.push(plan)

    // Pre-register the expected arrival
    this.arrivals.set(target.coords, arrivalTime)

    console.log('SmartFarmService: Scheduled attack', {
      target: target.coords,
      template: template.id,
      sendIn: Math.round((sendTime - Date.now()) / 1000) + 's',
      arrivalIn: Math.round((arrivalTime - Date.now()) / 1000) + 's',
    })
  }

  private async processScheduledAttacks(): Promise<void> {
    if (!this.enabled || !this.isOnFarmPage()) return

    const now = Date.now()

    // Enforce minimum delay between attacks
    if (now - this.lastAttackTime < Timing.MIN_ACTION_DELAY_MS) return

    // Find attacks that are due
    const dueAttacks = this.scheduledAttacks.filter(a => a.status === 'pending' && a.sendTime <= now)

    if (dueAttacks.length === 0) return

    // Process first due attack
    const attack = dueAttacks[0]
    const success = this.executeAttack(attack)

    if (success) {
      attack.status = 'sent'
      this.lastAttackTime = now

      // Update actual arrival time based on when we sent
      const actualArrivalTime = now + attack.travelTimeMs
      this.arrivals.set(attack.targetCoords, actualArrivalTime)

      // Register arrival with background service worker for multi-village coordination
      await this.registerArrivalWithBackground(attack.targetCoords, actualArrivalTime)

      console.log('SmartFarmService: Sent attack', {
        target: attack.targetCoords,
        template: attack.template,
        arrival: new Date(actualArrivalTime).toLocaleTimeString(),
      })
    } else {
      attack.status = 'failed'
      console.warn('SmartFarmService: Failed to send attack', attack.targetCoords)
    }

    // Clean up completed/failed attacks
    this.scheduledAttacks = this.scheduledAttacks.filter(
      a => a.status === 'pending' || (a.status === 'sent' && now - a.arrivalTime < 60000)
    )

    this.saveState()
    this.notifyListeners()
  }

  private async registerArrivalWithBackground(targetCoords: string, arrivalTime: number): Promise<void> {
    if (!this.sourceVillageId) return

    try {
      const message = createFarmRegisterArrivalMessage({
        targetCoords,
        arrivalTime,
        sourceVillageId: this.sourceVillageId,
      })
      await chrome.runtime.sendMessage(message)
    } catch (error) {
      console.warn('SmartFarmService: Failed to register arrival with background', error)
    }
  }

  private executeAttack(plan: FarmAttackPlan): boolean {
    const table = document.querySelector(FARM_SELECTORS.farmTable)
    if (!table) return false

    // Find the row for this target
    const rows = table.querySelectorAll(FARM_SELECTORS.farmRow)
    let targetRow: Element | null = null

    for (const row of rows) {
      const link = row.querySelector(FARM_SELECTORS.villageLink) as HTMLAnchorElement | null
      if (link && link.textContent?.includes(`(${plan.targetCoords})`)) {
        targetRow = row
        break
      }
    }

    if (!targetRow) {
      console.warn('SmartFarmService: Target row not found', plan.targetCoords)
      return false
    }

    // Click the appropriate attack button
    const selector =
      plan.template === 'A' ? FARM_SELECTORS.attackButtonA : FARM_SELECTORS.attackButtonB
    const attackBtn = targetRow.querySelector(selector) as HTMLElement | null

    if (!attackBtn || attackBtn.classList.contains('farm_icon_disabled')) {
      console.warn('SmartFarmService: Attack button not available', plan.targetCoords)
      return false
    }

    attackBtn.click()
    return true
  }

  private selectTemplate(): FarmAttackTemplate | null {
    // Prefer template A, fall back to B
    // In future, check troop availability
    if (this.templates.A) return this.templates.A
    if (this.templates.B) return this.templates.B

    // Default template if none parsed
    return {
      id: 'A',
      units: { spear: 10 },
      slowestUnit: 'spear',
    }
  }

  // ============ Page Message Handler ============

  private handlePageMessage(event: MessageEvent): void {
    if (!event.data?.type?.startsWith('TW_BOT_')) return

    switch (event.data.type) {
      case 'TW_BOT_FARM_TEMPLATES':
        this.handleTemplatesData(event.data.data)
        break
      case 'TW_BOT_WORLD_CONFIG':
        // Handled in fetchWorldConfig
        break
    }
  }

  private handleTemplatesData(data: {
    A?: Partial<Record<UnitType, number>>
    B?: Partial<Record<UnitType, number>>
  }): void {
    if (data.A) {
      this.templates.A = {
        id: 'A',
        units: data.A,
        slowestUnit: null,
      }
      this.templates.A.slowestUnit = this.getSlowestUnit(this.templates.A)
    }

    if (data.B) {
      this.templates.B = {
        id: 'B',
        units: data.B,
        slowestUnit: null,
      }
      this.templates.B.slowestUnit = this.getSlowestUnit(this.templates.B)
    }

    console.log('SmartFarmService: Templates loaded', {
      A: this.templates.A?.slowestUnit,
      B: this.templates.B?.slowestUnit,
    })
  }

  // ============ Public API ============

  isOnFarmPage(): boolean {
    return window.location.href.includes('screen=am_farm')
  }

  getState(): SmartFarmState {
    return {
      arrivals: Object.fromEntries(this.arrivals),
      scheduledAttacks: this.scheduledAttacks,
      attacksSentToday: this.getAttacksSentToday(),
      lastAttackSent: this.lastAttackTime || null,
      enabled: this.enabled,
      targetIntervalMs: Timing.FARM_TARGET_INTERVAL_MS,
    }
  }

  getTargets(): FarmTarget[] {
    return Array.from(this.targets.values())
  }

  getScheduledAttacks(): FarmAttackPlan[] {
    return this.scheduledAttacks.filter(a => a.status === 'pending')
  }

  getNextAttack(): FarmAttackPlan | null {
    const pending = this.scheduledAttacks
      .filter(a => a.status === 'pending')
      .sort((a, b) => a.sendTime - b.sendTime)
    return pending[0] || null
  }

  private getAttacksSentToday(): number {
    const today = new Date().setHours(0, 0, 0, 0)
    return this.scheduledAttacks.filter(a => a.status === 'sent' && a.sendTime >= today).length
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.saveState()
    this.notifyListeners()
  }

  subscribe(listener: (state: SmartFarmState) => void): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    const state = this.getState()
    for (const listener of this.listeners) {
      try {
        listener(state)
      } catch (error) {
        console.error('SmartFarmService: Error in listener', error)
      }
    }
  }

  // Clear arrival history (useful for testing or resetting)
  async clearArrivals(): Promise<void> {
    this.arrivals.clear()
    this.scheduledAttacks = []

    // Clear arrivals in background service worker too
    try {
      const message = createFarmClearArrivalsMessage()
      await chrome.runtime.sendMessage(message)
    } catch (error) {
      console.warn('SmartFarmService: Failed to clear arrivals in background', error)
    }

    this.saveState()
    this.notifyListeners()
  }
}

// Singleton instance
let instance: SmartFarmService | null = null

export function getSmartFarmService(): SmartFarmService {
  if (!instance) {
    instance = new SmartFarmService()
  }
  return instance
}
