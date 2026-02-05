// FarmStateManager handles shared farm target state for multi-village coordination
// Stores arrival times to ensure different villages don't over-farm the same targets

import { StorageKey, Timing } from '../shared/constants'
import type { SmartFarmState, FarmAttackPlan } from '../shared/types'

// Maximum age of arrival data before cleanup (24 hours)
const ARRIVAL_MAX_AGE_MS = 24 * 60 * 60 * 1000

class FarmStateManager {
  // Shared arrivals across all villages: targetCoords -> timestamp
  private arrivals: Map<string, number> = new Map()
  // Scheduled attacks from all villages
  private scheduledAttacks: FarmAttackPlan[] = []
  // Global farm statistics
  private attacksSentToday = 0
  private lastAttackSent: number | null = null
  private enabled = true
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return

    await this.loadState()
    this.initialized = true

    // Periodic cleanup of old arrivals
    setInterval(() => this.cleanupOldArrivals(), 60000)

    console.log('FarmStateManager: Initialized')
  }

  destroy(): void {
    this.initialized = false
    console.log('FarmStateManager: Destroyed')
  }

  // ============ State Management ============

  private async loadState(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([StorageKey.FARM_STATE])

      if (result[StorageKey.FARM_STATE]) {
        const state = result[StorageKey.FARM_STATE] as SmartFarmState
        this.arrivals = new Map(Object.entries(state.arrivals || {}))
        this.scheduledAttacks = state.scheduledAttacks || []
        this.attacksSentToday = state.attacksSentToday || 0
        this.lastAttackSent = state.lastAttackSent
        this.enabled = state.enabled ?? true
      }

      console.log('FarmStateManager: Loaded state', {
        arrivalCount: this.arrivals.size,
        scheduledCount: this.scheduledAttacks.length,
      })
    } catch (error) {
      console.error('FarmStateManager: Failed to load state', error)
    }
  }

  async saveState(): Promise<void> {
    try {
      const state: SmartFarmState = {
        arrivals: Object.fromEntries(this.arrivals),
        scheduledAttacks: this.scheduledAttacks,
        attacksSentToday: this.attacksSentToday,
        lastAttackSent: this.lastAttackSent,
        enabled: this.enabled,
        targetIntervalMs: Timing.FARM_TARGET_INTERVAL_MS,
      }

      await chrome.storage.local.set({
        [StorageKey.FARM_STATE]: state,
      })
    } catch (error) {
      console.error('FarmStateManager: Failed to save state', error)
    }
  }

  // ============ Arrival Management ============

  registerArrival(targetCoords: string, arrivalTime: number, sourceVillageId: number): void {
    const existingArrival = this.arrivals.get(targetCoords) || 0

    // Only update if the new arrival is later than existing
    if (arrivalTime > existingArrival) {
      this.arrivals.set(targetCoords, arrivalTime)
      this.lastAttackSent = Date.now()
      this.attacksSentToday++

      console.log('FarmStateManager: Registered arrival', {
        target: targetCoords,
        arrival: new Date(arrivalTime).toLocaleTimeString(),
        fromVillage: sourceVillageId,
      })

      this.saveState()
    }
  }

  getArrivalTime(targetCoords: string): number | null {
    return this.arrivals.get(targetCoords) || null
  }

  getAllArrivals(): Record<string, number> {
    return Object.fromEntries(this.arrivals)
  }

  getNextAllowedArrivalTime(targetCoords: string): number {
    const lastArrival = this.arrivals.get(targetCoords) || 0
    return lastArrival + Timing.FARM_TARGET_INTERVAL_MS
  }

  canAttackTarget(targetCoords: string, proposedArrivalTime: number): boolean {
    const nextAllowed = this.getNextAllowedArrivalTime(targetCoords)
    return proposedArrivalTime >= nextAllowed
  }

  clearArrivals(): void {
    this.arrivals.clear()
    this.scheduledAttacks = []
    this.saveState()
    console.log('FarmStateManager: Cleared all arrivals')
  }

  // ============ Scheduled Attacks ============

  addScheduledAttack(attack: FarmAttackPlan): void {
    // Check if already scheduled for this target from this village
    const existing = this.scheduledAttacks.find(
      a =>
        a.targetCoords === attack.targetCoords &&
        a.sourceVillageId === attack.sourceVillageId &&
        a.status === 'pending'
    )

    if (existing) {
      console.log('FarmStateManager: Attack already scheduled', attack.targetCoords)
      return
    }

    this.scheduledAttacks.push(attack)

    // Pre-register the arrival
    this.arrivals.set(attack.targetCoords, attack.arrivalTime)

    console.log('FarmStateManager: Scheduled attack', {
      target: attack.targetCoords,
      from: attack.sourceVillageId,
      sendAt: new Date(attack.sendTime).toLocaleTimeString(),
      arriveAt: new Date(attack.arrivalTime).toLocaleTimeString(),
    })

    this.saveState()
  }

  getScheduledAttacks(villageId?: number): FarmAttackPlan[] {
    if (villageId !== undefined) {
      return this.scheduledAttacks.filter(
        a => a.sourceVillageId === villageId && a.status === 'pending'
      )
    }
    return this.scheduledAttacks.filter(a => a.status === 'pending')
  }

  markAttackSent(targetCoords: string, sourceVillageId: number): void {
    const attack = this.scheduledAttacks.find(
      a =>
        a.targetCoords === targetCoords &&
        a.sourceVillageId === sourceVillageId &&
        a.status === 'pending'
    )

    if (attack) {
      attack.status = 'sent'
      this.saveState()
    }
  }

  markAttackFailed(targetCoords: string, sourceVillageId: number): void {
    const attack = this.scheduledAttacks.find(
      a =>
        a.targetCoords === targetCoords &&
        a.sourceVillageId === sourceVillageId &&
        a.status === 'pending'
    )

    if (attack) {
      attack.status = 'failed'
      // Remove the pre-registered arrival since attack failed
      this.arrivals.delete(targetCoords)
      this.saveState()
    }
  }

  // ============ Statistics ============

  getStatistics(): {
    attacksSentToday: number
    lastAttackSent: number | null
    targetsTracked: number
    scheduledCount: number
  } {
    return {
      attacksSentToday: this.attacksSentToday,
      lastAttackSent: this.lastAttackSent,
      targetsTracked: this.arrivals.size,
      scheduledCount: this.scheduledAttacks.filter(a => a.status === 'pending').length,
    }
  }

  // ============ Cleanup ============

  private cleanupOldArrivals(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [coords, arrivalTime] of this.arrivals) {
      if (now - arrivalTime > ARRIVAL_MAX_AGE_MS) {
        this.arrivals.delete(coords)
        cleaned++
      }
    }

    // Clean up old scheduled attacks
    const initialLength = this.scheduledAttacks.length
    this.scheduledAttacks = this.scheduledAttacks.filter(a => {
      // Keep pending attacks and recently sent/failed attacks
      if (a.status === 'pending') return true
      return now - a.arrivalTime < 3600000 // Keep for 1 hour after arrival
    })

    // Reset daily counter at midnight
    const today = new Date().setHours(0, 0, 0, 0)
    if (this.lastAttackSent && this.lastAttackSent < today) {
      this.attacksSentToday = 0
    }

    if (cleaned > 0 || this.scheduledAttacks.length !== initialLength) {
      console.log('FarmStateManager: Cleaned up', {
        arrivals: cleaned,
        attacks: initialLength - this.scheduledAttacks.length,
      })
      this.saveState()
    }
  }

  // ============ Enable/Disable ============

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.saveState()
  }

  isEnabled(): boolean {
    return this.enabled
  }
}

// Singleton instance
let instance: FarmStateManager | null = null

export function getFarmStateManager(): FarmStateManager {
  if (!instance) {
    instance = new FarmStateManager()
  }
  return instance
}
