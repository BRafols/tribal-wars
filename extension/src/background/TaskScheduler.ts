// TaskScheduler manages the priority queue of tasks to execute
// Handles scheduling, rate limiting, and task lifecycle

import { Timing, TaskPriority } from '../shared/constants'
import type { ScheduledTask, TaskResult, TaskTypeValue } from '../shared/types'
import { getStateManager } from './StateManager'

// Generate unique task ID
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Add random jitter to timing
function addJitter(baseTime: number, maxJitter: number = Timing.MAX_JITTER_MS): number {
  return baseTime + Math.floor(Math.random() * maxJitter)
}

class TaskScheduler {
  private processingTask: ScheduledTask | null = null
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return
    this.initialized = true
    console.log('TaskScheduler: Initialized')
  }

  destroy(): void {
    this.processingTask = null
    this.initialized = false
    console.log('TaskScheduler: Destroyed')
  }

  // ============ Task Creation ============

  scheduleTask(params: {
    type: TaskTypeValue
    villageId: number
    worldId: string
    scheduledTime?: number
    priority?: number
    payload?: Record<string, unknown>
  }): ScheduledTask {
    const stateManager = getStateManager()

    const task: ScheduledTask = {
      id: generateTaskId(),
      type: params.type,
      villageId: params.villageId,
      worldId: params.worldId,
      scheduledTime: params.scheduledTime ?? Date.now(),
      priority: params.priority ?? TaskPriority.NORMAL,
      retryCount: 0,
      maxRetries: 3,
      payload: params.payload ?? {},
      createdAt: Date.now(),
    }

    stateManager.addTask(task)
    console.log('TaskScheduler: Scheduled task', { id: task.id, type: task.type, scheduledTime: new Date(task.scheduledTime).toISOString() })

    return task
  }

  scheduleTaskWithDelay(
    params: {
      type: TaskTypeValue
      villageId: number
      worldId: string
      priority?: number
      payload?: Record<string, unknown>
    },
    delayMs: number
  ): ScheduledTask {
    return this.scheduleTask({
      ...params,
      scheduledTime: addJitter(Date.now() + delayMs),
    })
  }

  // ============ Task Retrieval ============

  getNextTask(): ScheduledTask | null {
    if (this.processingTask) return null

    const stateManager = getStateManager()
    const now = Date.now()
    const lastActionTime = stateManager.getLastActionTime()

    // Respect minimum action delay
    if (now - lastActionTime < Timing.MIN_ACTION_DELAY_MS) {
      return null
    }

    const tasks = stateManager.getTasks()

    // Find tasks that are due and sort by priority, then by scheduled time
    const dueTasks = tasks
      .filter(t => t.scheduledTime <= now)
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority // Lower priority number = higher priority
        }
        return a.scheduledTime - b.scheduledTime // Earlier scheduled = higher priority
      })

    return dueTasks[0] ?? null
  }

  getTaskById(taskId: string): ScheduledTask | undefined {
    return getStateManager().getTasks().find(t => t.id === taskId)
  }

  getTasksByType(type: TaskTypeValue): ScheduledTask[] {
    return getStateManager().getTasks().filter(t => t.type === type)
  }

  getTasksByVillage(villageId: number): ScheduledTask[] {
    return getStateManager().getTasks().filter(t => t.villageId === villageId)
  }

  getPendingTaskCount(): number {
    return getStateManager().getTasks().length
  }

  // ============ Task Lifecycle ============

  markTaskProcessing(taskId: string): ScheduledTask | null {
    const task = this.getTaskById(taskId)
    if (!task) return null

    this.processingTask = task
    return task
  }

  completeTask(result: TaskResult): void {
    const stateManager = getStateManager()

    if (this.processingTask && this.processingTask.id === result.taskId) {
      this.processingTask = null
    }

    // Remove the completed task
    stateManager.removeTask(result.taskId)
    stateManager.setLastActionTime(Date.now())

    // If a next scheduled time was provided, create a follow-up task
    if (result.success && result.nextScheduledTime) {
      const originalTask = this.getTaskById(result.taskId)
      if (originalTask) {
        this.scheduleTask({
          type: originalTask.type,
          villageId: originalTask.villageId,
          worldId: originalTask.worldId,
          scheduledTime: result.nextScheduledTime,
          priority: originalTask.priority,
          payload: result.data ?? originalTask.payload,
        })
      }
    }

    console.log('TaskScheduler: Task completed', { taskId: result.taskId, success: result.success })
  }

  failTask(result: TaskResult): void {
    const stateManager = getStateManager()
    const task = this.getTaskById(result.taskId)

    if (this.processingTask && this.processingTask.id === result.taskId) {
      this.processingTask = null
    }

    if (!task) {
      stateManager.removeTask(result.taskId)
      return
    }

    // Check if we should retry
    if (task.retryCount < task.maxRetries) {
      // Update task with incremented retry count and new scheduled time
      const tasks = stateManager.getTasks().map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            retryCount: t.retryCount + 1,
            scheduledTime: addJitter(Date.now() + Timing.MIN_ACTION_DELAY_MS * (t.retryCount + 1)),
          }
        }
        return t
      })
      stateManager.setTasks(tasks)
      console.log('TaskScheduler: Task failed, will retry', { taskId: result.taskId, retryCount: task.retryCount + 1, error: result.error })
    } else {
      // Max retries exceeded, remove task
      stateManager.removeTask(result.taskId)
      console.log('TaskScheduler: Task failed, max retries exceeded', { taskId: result.taskId, error: result.error })

      // Show notification for permanent failure
      this.showErrorNotification(task, result.error ?? 'Unknown error')
    }
  }

  cancelTask(taskId: string): boolean {
    const stateManager = getStateManager()
    const task = this.getTaskById(taskId)

    if (!task) return false

    if (this.processingTask && this.processingTask.id === taskId) {
      this.processingTask = null
    }

    stateManager.removeTask(taskId)
    console.log('TaskScheduler: Task cancelled', { taskId })
    return true
  }

  cancelTasksByType(type: TaskTypeValue): number {
    const tasks = this.getTasksByType(type)
    let cancelled = 0

    for (const task of tasks) {
      if (this.cancelTask(task.id)) {
        cancelled++
      }
    }

    return cancelled
  }

  cancelTasksByVillage(villageId: number): number {
    const tasks = this.getTasksByVillage(villageId)
    let cancelled = 0

    for (const task of tasks) {
      if (this.cancelTask(task.id)) {
        cancelled++
      }
    }

    return cancelled
  }

  clearAllTasks(): void {
    const stateManager = getStateManager()
    stateManager.setTasks([])
    this.processingTask = null
    console.log('TaskScheduler: All tasks cleared')
  }

  // ============ Helpers ============

  isProcessing(): boolean {
    return this.processingTask !== null
  }

  getProcessingTask(): ScheduledTask | null {
    return this.processingTask
  }

  private showErrorNotification(task: ScheduledTask, error: string): void {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: 'Tribal Wars Bot Error',
      message: `Task ${task.type} failed for village ${task.villageId}: ${error}`,
      priority: 1,
    })
  }
}

// Singleton instance
let instance: TaskScheduler | null = null

export function getTaskScheduler(): TaskScheduler {
  if (!instance) {
    instance = new TaskScheduler()
  }
  return instance
}
