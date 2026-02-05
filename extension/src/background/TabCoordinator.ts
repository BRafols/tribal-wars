// TabCoordinator is the main orchestrator for multi-tab automation
// It coordinates between StateManager, TabRegistry, and TaskScheduler

import { MessageType, Timing, TabRole, TaskType } from '../shared/constants'
import type {
  TabRegisterPayload,
  TabHeartbeatPayload,
  TaskCompletePayload,
  ErrorReportPayload,
  ScheduledTask,
  TabRoleType,
  DashboardState,
  ActionLogEntry,
} from '../shared/types'
import {
  isCoordinatorMessage,
  isTabRegisterMessage,
  isTabHeartbeatMessage,
  isTaskCompleteMessage,
  isDashboardStateRequestMessage,
  isDashboardToggleBotMessage,
  createTaskExecuteMessage,
  createDashboardStateResponseMessage,
} from '../shared/messages'
import { getStateManager } from './StateManager'
import { getTabRegistry } from './TabRegistry'
import { getTaskScheduler } from './TaskScheduler'

// Task type to role mapping
const TASK_TYPE_TO_ROLE: Record<string, TabRoleType> = {
  [TaskType.SCAVENGE_START]: TabRole.SCAVENGE,
  [TaskType.SCAVENGE_CHECK]: TabRole.SCAVENGE,
  [TaskType.FARM_ATTACK]: TabRole.FARM,
  [TaskType.FARM_CHECK]: TabRole.FARM,
  [TaskType.RECRUIT_QUEUE]: TabRole.RECRUIT,
  [TaskType.RECRUIT_CHECK]: TabRole.RECRUIT,
  [TaskType.BUILD_QUEUE]: TabRole.BUILD,
  [TaskType.BUILD_CHECK]: TabRole.BUILD,
}

class TabCoordinator {
  private processIntervalId: ReturnType<typeof setInterval> | null = null
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return

    // Initialize dependencies
    const stateManager = getStateManager()
    await stateManager.init()

    const tabRegistry = getTabRegistry()
    await tabRegistry.init()

    const taskScheduler = getTaskScheduler()
    await taskScheduler.init()

    // Set up message listener
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this))

    // Start the task processing loop
    this.startProcessingLoop()

    // Mark as running
    stateManager.setRunning(true)

    this.initialized = true
    console.log('TabCoordinator: Initialized')
  }

  destroy(): void {
    if (this.processIntervalId) {
      clearInterval(this.processIntervalId)
      this.processIntervalId = null
    }

    const stateManager = getStateManager()
    stateManager.setRunning(false)
    stateManager.destroy()

    getTabRegistry().destroy()
    getTaskScheduler().destroy()

    this.initialized = false
    console.log('TabCoordinator: Destroyed')
  }

  // ============ Message Handling ============

  private handleMessage(
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean {
    // Handle legacy messages (GAME_READY, etc.)
    if (typeof message === 'object' && message !== null && 'type' in message) {
      const legacyMessage = message as { type: string; payload?: unknown }

      if (legacyMessage.type === 'GAME_READY') {
        console.log('TabCoordinator: Legacy GAME_READY from tab', sender.tab?.id)
        sendResponse({ received: true })
        return true
      }

      if (legacyMessage.type === 'GET_WORLD_INFO') {
        // This is handled by content script, pass through
        return false
      }
    }

    // Handle coordinator messages
    if (!isCoordinatorMessage(message)) {
      return false
    }

    const tabId = sender.tab?.id
    if (tabId === undefined) {
      console.warn('TabCoordinator: Message from unknown tab')
      return false
    }

    // Route message based on type
    if (isTabRegisterMessage(message)) {
      this.handleTabRegister(tabId, message.payload)
      sendResponse({ received: true })
      return true
    }

    if (message.type === MessageType.TAB_UNREGISTER) {
      this.handleTabUnregister(tabId)
      sendResponse({ received: true })
      return true
    }

    if (isTabHeartbeatMessage(message)) {
      this.handleTabHeartbeat(tabId, message.payload)
      sendResponse({ received: true })
      return true
    }

    if (isTaskCompleteMessage(message)) {
      this.handleTaskComplete(message.payload)
      sendResponse({ received: true })
      return true
    }

    if (message.type === MessageType.TASK_FAILED) {
      this.handleTaskFailed(message.payload as TaskCompletePayload)
      sendResponse({ received: true })
      return true
    }

    if (message.type === MessageType.ERROR_REPORT) {
      this.handleErrorReport(tabId, message.payload as ErrorReportPayload)
      sendResponse({ received: true })
      return true
    }

    // Dashboard state request (from side panel/popup)
    if (isDashboardStateRequestMessage(message)) {
      const response = createDashboardStateResponseMessage({ state: this.getDashboardState() })
      sendResponse(response)
      return true
    }

    // Dashboard toggle bot
    if (isDashboardToggleBotMessage(message)) {
      const stateManager = getStateManager()
      if (message.payload.enabled) {
        stateManager.setRunning(true)
        stateManager.addActionLog({
          level: 'info',
          type: 'system',
          message: 'Bot started',
        })
      } else {
        stateManager.setRunning(false)
        stateManager.addActionLog({
          level: 'info',
          type: 'system',
          message: 'Bot stopped',
        })
      }
      sendResponse({ received: true })
      return true
    }

    return false
  }

  private handleTabRegister(tabId: number, payload: TabRegisterPayload): void {
    const tabRegistry = getTabRegistry()
    const tabInfo = tabRegistry.registerTab(tabId, payload)

    console.log('TabCoordinator: Tab registered', { tabId, role: tabInfo.role, villageId: payload.villageId })
  }

  private handleTabUnregister(tabId: number): void {
    const tabRegistry = getTabRegistry()
    tabRegistry.unregisterTab(tabId)
  }

  private handleTabHeartbeat(tabId: number, payload: TabHeartbeatPayload): void {
    const tabRegistry = getTabRegistry()
    tabRegistry.updateHeartbeat(tabId, payload)
  }

  private handleTaskComplete(payload: TaskCompletePayload): void {
    const taskScheduler = getTaskScheduler()

    if (payload.success) {
      taskScheduler.completeTask({
        taskId: payload.taskId,
        success: true,
        data: payload.data,
        nextScheduledTime: payload.nextScheduledTime,
      })
    } else {
      taskScheduler.failTask({
        taskId: payload.taskId,
        success: false,
        error: payload.error,
      })
    }
  }

  private handleTaskFailed(payload: TaskCompletePayload): void {
    const taskScheduler = getTaskScheduler()
    taskScheduler.failTask({
      taskId: payload.taskId,
      success: false,
      error: payload.error,
    })
  }

  private handleErrorReport(tabId: number, payload: ErrorReportPayload): void {
    console.error('TabCoordinator: Error reported from tab', tabId, payload)

    // Show notification for errors
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: 'Tribal Wars Bot Error',
      message: payload.message,
      priority: 1,
    })
  }

  // ============ Task Processing ============

  private startProcessingLoop(): void {
    // Use setInterval for service worker compatibility
    // (requestAnimationFrame doesn't work in service workers)
    this.processIntervalId = setInterval(() => {
      this.processNextTask()
    }, Timing.MIN_ACTION_DELAY_MS)
  }

  private async processNextTask(): Promise<void> {
    const stateManager = getStateManager()
    const taskScheduler = getTaskScheduler()
    const tabRegistry = getTabRegistry()

    // Check if bot is enabled
    if (!stateManager.isRunning()) {
      return
    }

    // Check if already processing a task
    if (taskScheduler.isProcessing()) {
      return
    }

    // Get next task
    const task = taskScheduler.getNextTask()
    if (!task) {
      return
    }

    // Find a suitable tab for this task
    const role = TASK_TYPE_TO_ROLE[task.type]
    if (!role) {
      console.warn('TabCoordinator: Unknown task type', task.type)
      taskScheduler.cancelTask(task.id)
      return
    }

    const tab = tabRegistry.getActiveTabForRole(role, task.villageId)

    if (!tab) {
      // No suitable tab available, try to open one
      await this.openTabForTask(task, role)
      return
    }

    // Mark task as processing and send to tab
    taskScheduler.markTaskProcessing(task.id)
    await this.sendTaskToTab(task, tab.tabId)
  }

  private async openTabForTask(task: ScheduledTask, role: TabRoleType): Promise<void> {
    const tabRegistry = getTabRegistry()

    // Build base URL from task's world
    // This will need the game URL from one of the existing tabs
    const existingTabs = tabRegistry.getAllTabs()
    const sameWorldTab = existingTabs.find(t => t.worldId === task.worldId)

    if (!sameWorldTab) {
      console.warn('TabCoordinator: No existing tab for world', task.worldId, '- cannot open new tab')
      return
    }

    // Extract base URL from existing tab
    try {
      const url = new URL(sameWorldTab.url)
      const baseUrl = `${url.protocol}//${url.host}${url.pathname}`

      const newTabId = await tabRegistry.openTabForRole(role, baseUrl, task.villageId)

      if (newTabId) {
        console.log('TabCoordinator: Opened new tab for task', { taskId: task.id, role, tabId: newTabId })
      }
    } catch (error) {
      console.error('TabCoordinator: Failed to open tab for task', error)
    }
  }

  private async sendTaskToTab(task: ScheduledTask, tabId: number): Promise<void> {
    const message = createTaskExecuteMessage({ task }, tabId)

    try {
      await chrome.tabs.sendMessage(tabId, message)
      console.log('TabCoordinator: Sent task to tab', { taskId: task.id, tabId })
    } catch (error) {
      console.error('TabCoordinator: Failed to send task to tab', error)

      // Tab might have closed, fail the task
      const taskScheduler = getTaskScheduler()
      taskScheduler.failTask({
        taskId: task.id,
        success: false,
        error: 'Failed to send task to tab',
      })
    }
  }

  // ============ Public API ============

  isRunning(): boolean {
    return getStateManager().isRunning()
  }

  start(): void {
    const stateManager = getStateManager()
    stateManager.setRunning(true)
    console.log('TabCoordinator: Started')
  }

  stop(): void {
    const stateManager = getStateManager()
    stateManager.setRunning(false)
    console.log('TabCoordinator: Stopped')
  }

  getStatus(): { running: boolean; tabCount: number; taskCount: number } {
    const tabRegistry = getTabRegistry()
    const taskScheduler = getTaskScheduler()

    return {
      running: this.isRunning(),
      tabCount: tabRegistry.getAllTabs().length,
      taskCount: taskScheduler.getPendingTaskCount(),
    }
  }

  getDashboardState(): DashboardState {
    const stateManager = getStateManager()
    const tabRegistry = getTabRegistry()
    const taskScheduler = getTaskScheduler()

    const tabs = tabRegistry.getAllTabs()
    const tasks = taskScheduler.getPendingTasks()

    // Determine current world and village from the first active tab
    let currentWorld: string | null = null
    let currentVillage: { id: number; name: string } | null = null

    if (tabs.length > 0) {
      const activeTab = tabs.find(t => t.isActive) || tabs[0]
      currentWorld = activeTab.worldId
      if (activeTab.villageId) {
        currentVillage = {
          id: activeTab.villageId,
          name: `Village ${activeTab.villageId}`, // Will be updated with actual name from game data
        }
      }
    }

    return {
      isRunning: stateManager.isRunning(),
      connectionStatus: tabs.length > 0 ? 'connected' : 'disconnected',
      currentWorld,
      currentVillage,
      automationStatus: stateManager.getAutomationStatus(),
      taskQueue: tasks.slice(0, 10), // Return only first 10 tasks for dashboard
      actionLog: stateManager.getActionLog().slice(0, 20), // Return last 20 log entries
      tabs,
      lastUpdated: Date.now(),
    }
  }

  // Add action log entry
  addActionLog(entry: Omit<ActionLogEntry, 'id' | 'timestamp'>): void {
    const stateManager = getStateManager()
    stateManager.addActionLog(entry)
  }
}

// Singleton instance
let instance: TabCoordinator | null = null

export function getTabCoordinator(): TabCoordinator {
  if (!instance) {
    instance = new TabCoordinator()
  }
  return instance
}
