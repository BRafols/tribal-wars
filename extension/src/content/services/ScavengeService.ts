// ScavengeService handles detection and automation of scavenging runs
// Runs in the content script on the scavenging page (place&mode=scavenge)

import { TaskType, Timing } from '../../shared/constants'
import type { ScheduledTask, TaskCompletePayload, ScavengeTier, ScavengeState } from '../../shared/types'
import { getTabAgent } from '../TabAgent'
import { getContentTicker } from '../../core/Ticker'

// Scavenge tier configuration
const TIER_SELECTORS = {
  container: '.scavenge-option',
  startButton: 'a.btn.free_send_button, a.btn-scavenge',
  timerElement: '.return-countdown, span.timer',
  lockIcon: '.locked-icon, .premium-locked',
}

// Parse time string (e.g., "1:23:45" or "23:45") to seconds
function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(p => parseInt(p, 10))
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}

class ScavengeService {
  private initialized = false
  private state: ScavengeState | null = null
  private messageHandler: ((event: MessageEvent) => void) | null = null

  init(): void {
    if (this.initialized) return

    // Set up message listener for data from page context
    this.messageHandler = this.handleMessage.bind(this)
    window.addEventListener('message', this.messageHandler)

    // Register task handlers with TabAgent
    const tabAgent = getTabAgent()
    tabAgent.registerTaskHandler(TaskType.SCAVENGE_CHECK, this.handleCheckTask.bind(this))
    tabAgent.registerTaskHandler(TaskType.SCAVENGE_START, this.handleStartTask.bind(this))

    // Register periodic check with ticker
    const ticker = getContentTicker()
    ticker.register('scavenge:check', () => this.checkScavengeStatus(), Timing.SCAVENGE_CHECK_INTERVAL_MS, { priority: 5 })

    this.initialized = true
    console.log('ScavengeService: Initialized')

    // Initial check
    this.checkScavengeStatus()
  }

  destroy(): void {
    if (!this.initialized) return

    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler)
      this.messageHandler = null
    }

    const ticker = getContentTicker()
    ticker.unregister('scavenge:check')

    const tabAgent = getTabAgent()
    tabAgent.unregisterTaskHandler(TaskType.SCAVENGE_CHECK)
    tabAgent.unregisterTaskHandler(TaskType.SCAVENGE_START)

    this.initialized = false
    console.log('ScavengeService: Destroyed')
  }

  // ============ Status Detection ============

  private checkScavengeStatus(): void {
    const tiers = this.detectTiers()

    if (tiers.length === 0) {
      // Not on scavenge page or no tiers available
      return
    }

    const villageId = this.getVillageId()
    if (!villageId) return

    this.state = {
      villageId,
      tiers,
      lastChecked: Date.now(),
    }

    console.log('ScavengeService: Status check', this.state)

    // Auto-start scavenging if any tier can be started
    this.autoStartScavenging()
  }

  private detectTiers(): ScavengeTier[] {
    const tiers: ScavengeTier[] = []

    // Find all scavenge option containers
    const containers = document.querySelectorAll(TIER_SELECTORS.container)

    containers.forEach((container, index) => {
      const tierNum = index + 1

      // Check if tier is locked (premium feature)
      const isLocked = container.querySelector(TIER_SELECTORS.lockIcon) !== null

      if (isLocked) {
        return // Skip locked tiers
      }

      // Check for active timer (scavenging in progress)
      const timerElement = container.querySelector(TIER_SELECTORS.timerElement)
      const isRunning = timerElement !== null && timerElement.textContent?.trim() !== ''

      let remainingSeconds: number | null = null
      if (isRunning && timerElement) {
        const timeText = timerElement.textContent?.trim() || ''
        remainingSeconds = parseTimeToSeconds(timeText)
      }

      // Check for start button
      const startButton = container.querySelector(TIER_SELECTORS.startButton) as HTMLElement | null
      const canStart = !isRunning && startButton !== null && !startButton.classList.contains('btn-disabled')

      tiers.push({
        tier: tierNum,
        isRunning,
        remainingSeconds,
        canStart,
      })
    })

    return tiers
  }

  private getVillageId(): number | null {
    const tabAgent = getTabAgent()
    return tabAgent.getCurrentVillageId()
  }

  // ============ Auto-Start Logic ============

  private autoStartScavenging(): void {
    if (!this.state) return

    // Find tiers that can be started, prioritize higher tiers
    const startableTiers = this.state.tiers
      .filter(t => t.canStart)
      .sort((a, b) => b.tier - a.tier) // Higher tier first

    if (startableTiers.length === 0) {
      console.log('ScavengeService: No tiers available to start')
      return
    }

    // Start the highest available tier
    const tierToStart = startableTiers[0]
    console.log('ScavengeService: Auto-starting tier', tierToStart.tier)

    this.startScavengeTier(tierToStart.tier)
  }

  private startScavengeTier(tierNum: number): boolean {
    const containers = document.querySelectorAll(TIER_SELECTORS.container)
    const container = containers[tierNum - 1]

    if (!container) {
      console.warn('ScavengeService: Tier container not found', tierNum)
      return false
    }

    const startButton = container.querySelector(TIER_SELECTORS.startButton) as HTMLElement | null

    if (!startButton) {
      console.warn('ScavengeService: Start button not found for tier', tierNum)
      return false
    }

    if (startButton.classList.contains('btn-disabled')) {
      console.warn('ScavengeService: Start button is disabled for tier', tierNum)
      return false
    }

    console.log('ScavengeService: Clicking start button for tier', tierNum)
    startButton.click()
    return true
  }

  // ============ Task Handlers ============

  private async handleCheckTask(task: ScheduledTask): Promise<TaskCompletePayload> {
    this.checkScavengeStatus()

    // Calculate next check time
    let nextScheduledTime = Date.now() + Timing.SCAVENGE_CHECK_INTERVAL_MS

    // If any tier is running, schedule check for when it completes
    if (this.state) {
      const runningTiers = this.state.tiers.filter(t => t.isRunning && t.remainingSeconds)
      if (runningTiers.length > 0) {
        const soonestCompletion = Math.min(...runningTiers.map(t => t.remainingSeconds!))
        // Add a small buffer (5 seconds) after completion
        const completionTime = Date.now() + (soonestCompletion * 1000) + 5000
        nextScheduledTime = Math.min(nextScheduledTime, completionTime)
      }
    }

    return {
      taskId: task.id,
      success: true,
      data: { state: this.state },
      nextScheduledTime,
    }
  }

  private async handleStartTask(task: ScheduledTask): Promise<TaskCompletePayload> {
    const tierNum = (task.payload.tier as number) || 1

    const success = this.startScavengeTier(tierNum)

    if (success) {
      // Schedule a check to verify the scavenging started
      return {
        taskId: task.id,
        success: true,
        nextScheduledTime: Date.now() + 2000, // Check in 2 seconds
      }
    }

    return {
      taskId: task.id,
      success: false,
      error: `Failed to start scavenge tier ${tierNum}`,
    }
  }

  // ============ Message Handling ============

  private handleMessage(event: MessageEvent): void {
    if (event.data?.type !== 'TW_BOT_SCAVENGE_DATA') return

    const data = event.data.data
    if (data) {
      // Update state from page script data if needed
      console.log('ScavengeService: Received scavenge data from page', data)
    }
  }

  // ============ Public API ============

  getState(): ScavengeState | null {
    return this.state
  }

  isOnScavengePage(): boolean {
    return window.location.href.includes('mode=scavenge')
  }
}

// Singleton instance
let instance: ScavengeService | null = null

export function getScavengeService(): ScavengeService {
  if (!instance) {
    instance = new ScavengeService()
  }
  return instance
}
