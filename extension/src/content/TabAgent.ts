// TabAgent runs in the content script and communicates with the TabCoordinator
// Handles tab registration, heartbeat, and task execution

import { Timing } from '../shared/constants'
import type {
  TabRegisterPayload,
  TabHeartbeatPayload,
  TaskCompletePayload,
  ScheduledTask,
} from '../shared/types'
import {
  createTabRegisterMessage,
  createTabUnregisterMessage,
  createTabHeartbeatMessage,
  createTaskCompleteMessage,
  createTaskFailedMessage,
  createErrorReportMessage,
  isCoordinatorMessage,
  isTaskExecuteMessage,
  isTabNavigateMessage,
} from '../shared/messages'
import { getContentTicker } from '../core/Ticker'

// Task handler function type
type TaskHandler = (task: ScheduledTask) => Promise<TaskCompletePayload>

class TabAgent {
  private initialized = false
  private taskHandlers: Map<string, TaskHandler> = new Map()
  private currentScreen = ''
  private currentVillageId: number | null = null
  private currentWorldId: string | null = null

  init(): void {
    if (this.initialized) return

    // Extract game data from URL and window
    this.extractGameInfo()

    // Set up message listener for coordinator messages
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this))

    // Register with coordinator
    this.register()

    // Set up heartbeat using Ticker
    const ticker = getContentTicker()
    ticker.register('tabAgent:heartbeat', () => this.sendHeartbeat(), Timing.TAB_HEARTBEAT_INTERVAL_MS, { priority: 0 })

    // Re-register on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.sendHeartbeat()
      }
    })

    // Unregister on page unload
    window.addEventListener('beforeunload', () => {
      this.unregister()
    })

    this.initialized = true
    console.log('TabAgent: Initialized', { screen: this.currentScreen, villageId: this.currentVillageId })
  }

  destroy(): void {
    if (!this.initialized) return

    const ticker = getContentTicker()
    ticker.unregister('tabAgent:heartbeat')

    this.unregister()
    this.taskHandlers.clear()
    this.initialized = false

    console.log('TabAgent: Destroyed')
  }

  // ============ Game Info Extraction ============

  private extractGameInfo(): void {
    // Try to extract from URL parameters
    const url = new URL(window.location.href)
    const params = url.searchParams

    this.currentScreen = params.get('screen') || ''

    // Add mode to screen if present (e.g., "place&mode=scavenge")
    const mode = params.get('mode')
    if (mode && this.currentScreen) {
      this.currentScreen = `${this.currentScreen}&mode=${mode}`
    }

    // Extract village ID
    const villageParam = params.get('village')
    if (villageParam) {
      this.currentVillageId = parseInt(villageParam, 10) || null
    }

    // Extract world from hostname (e.g., es123.guerrastribales.es -> es123)
    const hostParts = url.hostname.split('.')
    if (hostParts.length >= 2) {
      this.currentWorldId = hostParts[0]
    }
  }

  // ============ Registration ============

  private register(): void {
    const payload: TabRegisterPayload = {
      url: window.location.href,
      screen: this.currentScreen,
      villageId: this.currentVillageId,
      worldId: this.currentWorldId,
    }

    const message = createTabRegisterMessage(payload)
    chrome.runtime.sendMessage(message).catch(error => {
      console.warn('TabAgent: Failed to register', error)
    })
  }

  private unregister(): void {
    const message = createTabUnregisterMessage()
    chrome.runtime.sendMessage(message).catch(() => {
      // Ignore errors during unload
    })
  }

  private sendHeartbeat(): void {
    // Re-extract game info in case of navigation without full page reload
    this.extractGameInfo()

    const payload: TabHeartbeatPayload = {
      url: window.location.href,
      screen: this.currentScreen,
      villageId: this.currentVillageId,
      worldId: this.currentWorldId,
      isVisible: document.visibilityState === 'visible',
    }

    const message = createTabHeartbeatMessage(payload)
    chrome.runtime.sendMessage(message).catch(error => {
      console.warn('TabAgent: Failed to send heartbeat', error)
    })
  }

  // ============ Message Handling ============

  private handleMessage(
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean {
    if (!isCoordinatorMessage(message)) {
      return false
    }

    if (isTaskExecuteMessage(message)) {
      this.executeTask(message.payload.task)
        .then(() => sendResponse({ received: true }))
        .catch(error => {
          console.error('TabAgent: Task execution error', error)
          sendResponse({ received: true, error: error.message })
        })
      return true
    }

    if (isTabNavigateMessage(message)) {
      window.location.href = message.payload.url
      sendResponse({ received: true })
      return true
    }

    return false
  }

  // ============ Task Execution ============

  registerTaskHandler(taskType: string, handler: TaskHandler): void {
    this.taskHandlers.set(taskType, handler)
    console.log('TabAgent: Registered handler for', taskType)
  }

  unregisterTaskHandler(taskType: string): void {
    this.taskHandlers.delete(taskType)
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    const handler = this.taskHandlers.get(task.type)

    if (!handler) {
      console.warn('TabAgent: No handler for task type', task.type)
      await this.reportTaskFailure(task.id, `No handler for task type: ${task.type}`)
      return
    }

    try {
      console.log('TabAgent: Executing task', { id: task.id, type: task.type })
      const result = await handler(task)

      if (result.success) {
        await this.reportTaskComplete(result)
      } else {
        await this.reportTaskFailure(task.id, result.error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('TabAgent: Task execution failed', error)
      await this.reportTaskFailure(task.id, errorMessage)
    }
  }

  private async reportTaskComplete(result: TaskCompletePayload): Promise<void> {
    const message = createTaskCompleteMessage(result)
    try {
      await chrome.runtime.sendMessage(message)
    } catch (error) {
      console.error('TabAgent: Failed to report task completion', error)
    }
  }

  private async reportTaskFailure(taskId: string, error?: string): Promise<void> {
    const message = createTaskFailedMessage({
      taskId,
      success: false,
      error,
    })
    try {
      await chrome.runtime.sendMessage(message)
    } catch (err) {
      console.error('TabAgent: Failed to report task failure', err)
    }
  }

  // ============ Error Reporting ============

  reportError(message: string, error?: Error, context: Record<string, unknown> = {}): void {
    const errorMessage = createErrorReportMessage({
      message,
      stack: error?.stack,
      context: {
        ...context,
        screen: this.currentScreen,
        villageId: this.currentVillageId,
        worldId: this.currentWorldId,
      },
    })

    chrome.runtime.sendMessage(errorMessage).catch(() => {
      // Ignore send errors
    })
  }

  // ============ Getters ============

  getCurrentScreen(): string {
    return this.currentScreen
  }

  getCurrentVillageId(): number | null {
    return this.currentVillageId
  }

  getCurrentWorldId(): string | null {
    return this.currentWorldId
  }
}

// Singleton instance
let instance: TabAgent | null = null

export function getTabAgent(): TabAgent {
  if (!instance) {
    instance = new TabAgent()
  }
  return instance
}
