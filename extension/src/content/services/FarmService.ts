// FarmService handles detection and automation of farm attacks
// Runs in the content script on the Farm Assistant page (am_farm)

import { TaskType, Timing } from '../../shared/constants'
import type { ScheduledTask, TaskCompletePayload, FarmTarget, FarmState } from '../../shared/types'
import { getTabAgent } from '../TabAgent'
import { getContentTicker } from '../../core/Ticker'

// Farm Assistant page selectors
const FARM_SELECTORS = {
  farmTable: '#plunder_list, .vis.w100',
  farmRow: 'tr[data-id], tr.row_a, tr.row_b',
  attackButtonA: 'a.farm_icon_a',
  attackButtonB: 'a.farm_icon_b',
  villageLink: 'a[href*="info_village"]',
  distanceCell: 'td:nth-child(4)',
  lastAttackCell: 'td:last-child',
  pagination: '.paged-nav, .vis_item',
  nextPageButton: 'a[href*="page"]:last-child, .paged-nav-item:last-child a',
}

class FarmService {
  private initialized = false
  private state: FarmState | null = null
  private lastAttackTime = 0
  private attackQueue: number[] = [] // Village IDs to attack

  init(): void {
    if (this.initialized) return

    // Register task handlers with TabAgent
    const tabAgent = getTabAgent()
    tabAgent.registerTaskHandler(TaskType.FARM_CHECK, this.handleCheckTask.bind(this))
    tabAgent.registerTaskHandler(TaskType.FARM_ATTACK, this.handleAttackTask.bind(this))

    // Register periodic check with ticker
    const ticker = getContentTicker()
    ticker.register('farm:check', () => this.checkFarmStatus(), Timing.FARM_CHECK_INTERVAL_MS, { priority: 5 })

    this.initialized = true
    console.log('FarmService: Initialized')

    // Initial check
    this.checkFarmStatus()
  }

  destroy(): void {
    if (!this.initialized) return

    const ticker = getContentTicker()
    ticker.unregister('farm:check')

    const tabAgent = getTabAgent()
    tabAgent.unregisterTaskHandler(TaskType.FARM_CHECK)
    tabAgent.unregisterTaskHandler(TaskType.FARM_ATTACK)

    this.initialized = false
    console.log('FarmService: Destroyed')
  }

  // ============ Status Detection ============

  private checkFarmStatus(): void {
    if (!this.isOnFarmPage()) {
      return
    }

    const targets = this.parseTargets()
    const pageInfo = this.parsePageInfo()

    this.state = {
      targets,
      lastPage: pageInfo.currentPage,
      totalPages: pageInfo.totalPages,
      lastChecked: Date.now(),
    }

    console.log('FarmService: Status check', {
      targetCount: targets.length,
      availableTargets: targets.filter(t => t.status === 'available').length,
      page: `${pageInfo.currentPage}/${pageInfo.totalPages}`,
    })

    // Auto-attack available targets
    this.processAttackQueue()
  }

  private parseTargets(): FarmTarget[] {
    const targets: FarmTarget[] = []
    const table = document.querySelector(FARM_SELECTORS.farmTable)

    if (!table) {
      console.warn('FarmService: Farm table not found')
      return targets
    }

    const rows = table.querySelectorAll(FARM_SELECTORS.farmRow)

    rows.forEach(row => {
      // Skip header rows
      if (row.querySelector('th')) return

      const villageLink = row.querySelector(FARM_SELECTORS.villageLink) as HTMLAnchorElement | null
      const attackBtnA = row.querySelector(FARM_SELECTORS.attackButtonA) as HTMLElement | null
      const attackBtnB = row.querySelector(FARM_SELECTORS.attackButtonB) as HTMLElement | null

      if (!villageLink) return

      // Extract village ID from link
      const villageIdMatch = villageLink.href.match(/id=(\d+)/)
      if (!villageIdMatch) return

      const villageId = parseInt(villageIdMatch[1], 10)

      // Extract coordinates from link text
      const coordsMatch = villageLink.textContent?.match(/\((\d+)\|(\d+)\)/)
      const coords = coordsMatch ? `${coordsMatch[1]}|${coordsMatch[2]}` : ''
      const x = coordsMatch ? parseInt(coordsMatch[1], 10) : 0
      const y = coordsMatch ? parseInt(coordsMatch[2], 10) : 0

      // Parse distance
      const distanceCell = row.querySelector(FARM_SELECTORS.distanceCell)
      const distanceText = distanceCell?.textContent?.trim() || '0'
      const distance = parseFloat(distanceText.replace(',', '.')) || 0

      // Check if buttons are available
      const hasAttackButton = (attackBtnA && !attackBtnA.classList.contains('farm_icon_disabled')) ||
                             (attackBtnB && !attackBtnB.classList.contains('farm_icon_disabled'))

      // Determine status
      let status: FarmTarget['status'] = 'cooldown'
      if (hasAttackButton) {
        status = 'available'
      }

      targets.push({
        villageId,
        coords,
        x,
        y,
        distance,
        wallLevel: null,
        lastAttacked: null, // Would need to parse from page
        status,
      })
    })

    return targets
  }

  private parsePageInfo(): { currentPage: number; totalPages: number } {
    const pagination = document.querySelector(FARM_SELECTORS.pagination)

    if (!pagination) {
      return { currentPage: 1, totalPages: 1 }
    }

    // Try to find current page from pagination elements
    const activeElement = pagination.querySelector('.active, .paged-nav-item-current')
    const currentPage = parseInt(activeElement?.textContent || '1', 10)

    // Count total pages
    const pageLinks = pagination.querySelectorAll('a[href*="page"]')
    let totalPages = 1
    pageLinks.forEach(link => {
      const pageMatch = link.getAttribute('href')?.match(/page=(\d+)/)
      if (pageMatch) {
        const pageNum = parseInt(pageMatch[1], 10)
        if (pageNum > totalPages) totalPages = pageNum
      }
    })

    return { currentPage, totalPages }
  }

  // ============ Attack Logic ============

  private processAttackQueue(): void {
    if (!this.state) return

    // Find available targets
    const availableTargets = this.state.targets
      .filter(t => t.status === 'available')
      .sort((a, b) => a.distance - b.distance) // Closest first

    if (availableTargets.length === 0) {
      console.log('FarmService: No available targets')
      return
    }

    // Add to queue if not already queued
    for (const target of availableTargets) {
      if (!this.attackQueue.includes(target.villageId)) {
        this.attackQueue.push(target.villageId)
      }
    }

    // Process first target in queue
    this.attackNextTarget()
  }

  private attackNextTarget(): void {
    if (this.attackQueue.length === 0) return

    // Check cooldown
    const now = Date.now()
    if (now - this.lastAttackTime < Timing.MIN_ACTION_DELAY_MS) {
      // Schedule retry
      setTimeout(() => this.attackNextTarget(), Timing.MIN_ACTION_DELAY_MS)
      return
    }

    const villageId = this.attackQueue.shift()
    if (!villageId) return

    const success = this.attackTarget(villageId, 'A')

    if (success) {
      this.lastAttackTime = now
      // Schedule next attack with delay
      setTimeout(() => this.attackNextTarget(), Timing.MIN_ACTION_DELAY_MS)
    }
  }

  private attackTarget(villageId: number, template: 'A' | 'B'): boolean {
    const table = document.querySelector(FARM_SELECTORS.farmTable)
    if (!table) return false

    // Find the row for this village
    const rows = table.querySelectorAll(FARM_SELECTORS.farmRow)
    let targetRow: Element | null = null

    for (const row of rows) {
      const link = row.querySelector(FARM_SELECTORS.villageLink) as HTMLAnchorElement | null
      if (link && link.href.includes(`id=${villageId}`)) {
        targetRow = row
        break
      }
    }

    if (!targetRow) {
      console.warn('FarmService: Target row not found', villageId)
      return false
    }

    // Find and click the attack button
    const selector = template === 'A' ? FARM_SELECTORS.attackButtonA : FARM_SELECTORS.attackButtonB
    const attackBtn = targetRow.querySelector(selector) as HTMLElement | null

    if (!attackBtn) {
      console.warn('FarmService: Attack button not found', { villageId, template })
      return false
    }

    if (attackBtn.classList.contains('farm_icon_disabled')) {
      console.warn('FarmService: Attack button is disabled', { villageId, template })
      return false
    }

    console.log('FarmService: Attacking', { villageId, template })
    attackBtn.click()
    return true
  }

  // ============ Task Handlers ============

  private async handleCheckTask(task: ScheduledTask): Promise<TaskCompletePayload> {
    this.checkFarmStatus()

    // Schedule next check
    const nextScheduledTime = Date.now() + Timing.FARM_CHECK_INTERVAL_MS

    return {
      taskId: task.id,
      success: true,
      data: { state: this.state },
      nextScheduledTime,
    }
  }

  private async handleAttackTask(task: ScheduledTask): Promise<TaskCompletePayload> {
    const villageId = task.payload.villageId as number
    const template = (task.payload.template as 'A' | 'B') || 'A'

    if (!villageId) {
      return {
        taskId: task.id,
        success: false,
        error: 'No village ID specified',
      }
    }

    const success = this.attackTarget(villageId, template)

    if (success) {
      return {
        taskId: task.id,
        success: true,
      }
    }

    return {
      taskId: task.id,
      success: false,
      error: `Failed to attack village ${villageId}`,
    }
  }

  // ============ Navigation ============

  goToNextPage(): boolean {
    const nextBtn = document.querySelector(FARM_SELECTORS.nextPageButton) as HTMLElement | null

    if (!nextBtn) {
      console.warn('FarmService: Next page button not found')
      return false
    }

    nextBtn.click()
    return true
  }

  // ============ Public API ============

  getState(): FarmState | null {
    return this.state
  }

  isOnFarmPage(): boolean {
    return window.location.href.includes('screen=am_farm')
  }

  getAttackQueueLength(): number {
    return this.attackQueue.length
  }
}

// Singleton instance
let instance: FarmService | null = null

export function getFarmService(): FarmService {
  if (!instance) {
    instance = new FarmService()
  }
  return instance
}
