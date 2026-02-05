// TabRegistry manages registration and lifecycle of game tabs
// Tracks which tabs are active, their roles, and handles heartbeat monitoring

import { Timing, TabRole, GameScreen, ScreenUrlPattern } from '../shared/constants'
import type { TabInfo, TabRegisterPayload, TabHeartbeatPayload, TabRoleType } from '../shared/types'
import { getStateManager } from './StateManager'

// Map game screens to tab roles
function screenToRole(screen: string): TabRoleType | null {
  if (screen === GameScreen.PLACE_SCAVENGE || screen.includes('mode=scavenge')) {
    return TabRole.SCAVENGE
  }
  if (screen === GameScreen.AM_FARM) {
    return TabRole.FARM
  }
  if (screen === GameScreen.TRAIN || screen.includes('screen=train')) {
    return TabRole.RECRUIT
  }
  if (screen === GameScreen.MAIN) {
    return TabRole.BUILD
  }
  if (screen === GameScreen.OVERVIEW) {
    return TabRole.OVERVIEW
  }
  return null
}

// Map roles to URL patterns
function roleToUrlPattern(role: TabRoleType): string {
  switch (role) {
    case TabRole.SCAVENGE:
      return ScreenUrlPattern.SCAVENGE
    case TabRole.FARM:
      return ScreenUrlPattern.FARM
    case TabRole.RECRUIT:
      return ScreenUrlPattern.TRAIN
    case TabRole.BUILD:
      return ScreenUrlPattern.MAIN
    case TabRole.OVERVIEW:
      return ScreenUrlPattern.OVERVIEW
    default:
      return ScreenUrlPattern.MAIN
  }
}

class TabRegistry {
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return

    // Listen for tab close events
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this))

    // Start cleanup interval for dead tabs
    this.startCleanupInterval()

    this.initialized = true
    console.log('TabRegistry: Initialized')
  }

  destroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
    }
    this.initialized = false
    console.log('TabRegistry: Destroyed')
  }

  // ============ Tab Registration ============

  registerTab(tabId: number, payload: TabRegisterPayload): TabInfo {
    const stateManager = getStateManager()
    const now = Date.now()
    const role = screenToRole(payload.screen)

    const tabInfo: TabInfo = {
      tabId,
      role,
      url: payload.url,
      villageId: payload.villageId,
      worldId: payload.worldId,
      lastHeartbeat: now,
      registeredAt: now,
      isActive: true,
    }

    stateManager.setTab(tabId, tabInfo)

    console.log('TabRegistry: Registered tab', { tabId, role, villageId: payload.villageId })
    return tabInfo
  }

  unregisterTab(tabId: number): void {
    const stateManager = getStateManager()
    stateManager.removeTab(tabId)
    console.log('TabRegistry: Unregistered tab', tabId)
  }

  updateHeartbeat(tabId: number, payload: TabHeartbeatPayload): TabInfo | null {
    const stateManager = getStateManager()
    const existing = stateManager.getTab(tabId)

    if (!existing) {
      // Tab not registered, register it now
      return this.registerTab(tabId, {
        url: payload.url,
        screen: payload.screen,
        villageId: payload.villageId,
        worldId: payload.worldId,
      })
    }

    const role = screenToRole(payload.screen)
    const updated: TabInfo = {
      ...existing,
      url: payload.url,
      role,
      villageId: payload.villageId,
      worldId: payload.worldId,
      lastHeartbeat: Date.now(),
      isActive: payload.isVisible,
    }

    stateManager.setTab(tabId, updated)
    return updated
  }

  // ============ Tab Queries ============

  getTab(tabId: number): TabInfo | undefined {
    return getStateManager().getTab(tabId)
  }

  getAllTabs(): TabInfo[] {
    const tabs = getStateManager().getTabs()
    return Object.values(tabs)
  }

  getTabsByRole(role: TabRoleType): TabInfo[] {
    return this.getAllTabs().filter(tab => tab.role === role)
  }

  getTabsByVillage(villageId: number): TabInfo[] {
    return this.getAllTabs().filter(tab => tab.villageId === villageId)
  }

  getActiveTabForRole(role: TabRoleType, villageId?: number): TabInfo | null {
    const tabs = this.getTabsByRole(role)
      .filter(tab => tab.isActive)
      .filter(tab => villageId === undefined || tab.villageId === villageId)

    if (tabs.length === 0) return null

    // Return the most recently active tab
    return tabs.reduce((best, tab) =>
      tab.lastHeartbeat > best.lastHeartbeat ? tab : best
    )
  }

  hasTabForRole(role: TabRoleType, villageId?: number): boolean {
    return this.getActiveTabForRole(role, villageId) !== null
  }

  // ============ Tab Management ============

  async openTabForRole(role: TabRoleType, baseUrl: string, villageId?: number): Promise<number | null> {
    const urlPattern = roleToUrlPattern(role)

    // Build the full URL
    let url = baseUrl
    if (!url.includes('?')) {
      url += '?' + urlPattern
    } else {
      // Replace screen parameter if exists
      url = url.replace(/screen=[^&]*/, urlPattern)
      if (!url.includes(urlPattern)) {
        url += '&' + urlPattern
      }
    }

    // Add village parameter if specified
    if (villageId && !url.includes('village=')) {
      url += '&village=' + villageId
    }

    try {
      const tab = await chrome.tabs.create({ url, active: false })
      console.log('TabRegistry: Opened new tab', { tabId: tab.id, role, url })
      return tab.id ?? null
    } catch (error) {
      console.error('TabRegistry: Failed to open tab', error)
      return null
    }
  }

  async navigateTab(tabId: number, url: string): Promise<boolean> {
    try {
      await chrome.tabs.update(tabId, { url })
      console.log('TabRegistry: Navigated tab', { tabId, url })
      return true
    } catch (error) {
      console.error('TabRegistry: Failed to navigate tab', error)
      return false
    }
  }

  // ============ Cleanup ============

  private handleTabRemoved(tabId: number): void {
    const stateManager = getStateManager()
    if (stateManager.getTab(tabId)) {
      this.unregisterTab(tabId)
    }
  }

  private startCleanupInterval(): void {
    // Periodically clean up dead tabs
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupDeadTabs()
    }, Timing.TAB_HEARTBEAT_INTERVAL_MS)
  }

  private cleanupDeadTabs(): void {
    const stateManager = getStateManager()
    const now = Date.now()
    const threshold = Timing.TAB_DEAD_THRESHOLD_MS

    for (const tab of this.getAllTabs()) {
      if (now - tab.lastHeartbeat > threshold) {
        console.log('TabRegistry: Removing dead tab', tab.tabId)
        stateManager.removeTab(tab.tabId)
      }
    }
  }
}

// Singleton instance
let instance: TabRegistry | null = null

export function getTabRegistry(): TabRegistry {
  if (!instance) {
    instance = new TabRegistry()
  }
  return instance
}
