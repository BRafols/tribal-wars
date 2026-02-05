// Centralized ticker system for running tasks at intervals
// Uses requestAnimationFrame for efficiency (pauses when tab is hidden)

export type TickCallback = (deltaTime: number, elapsed: number) => void

interface TickerTask {
  id: string
  callback: TickCallback
  interval: number      // ms between executions
  lastRun: number       // timestamp of last execution
  priority: number      // lower = runs first
  enabled: boolean
}

export class Ticker {
  private tasks: Map<string, TickerTask> = new Map()
  private running = false
  private lastFrameTime = 0
  private startTime = 0
  private frameId: number | null = null

  constructor() {
    this.tick = this.tick.bind(this)
  }

  /**
   * Register a task to run at a specified interval
   */
  register(
    id: string,
    callback: TickCallback,
    interval: number,
    options: { priority?: number; enabled?: boolean } = {}
  ): void {
    const { priority = 10, enabled = true } = options

    if (this.tasks.has(id)) {
      console.warn(`Ticker: Task "${id}" already registered, updating...`)
    }

    this.tasks.set(id, {
      id,
      callback,
      interval,
      lastRun: 0,
      priority,
      enabled,
    })
  }

  /**
   * Unregister a task
   */
  unregister(id: string): boolean {
    return this.tasks.delete(id)
  }

  /**
   * Enable/disable a task without removing it
   */
  setEnabled(id: string, enabled: boolean): void {
    const task = this.tasks.get(id)
    if (task) {
      task.enabled = enabled
    }
  }

  /**
   * Update a task's interval
   */
  setInterval(id: string, interval: number): void {
    const task = this.tasks.get(id)
    if (task) {
      task.interval = interval
    }
  }

  /**
   * Start the ticker
   */
  start(): void {
    if (this.running) return

    this.running = true
    this.startTime = performance.now()
    this.lastFrameTime = this.startTime
    this.frameId = requestAnimationFrame(this.tick)

    console.log('Ticker: Started')
  }

  /**
   * Stop the ticker
   */
  stop(): void {
    if (!this.running) return

    this.running = false
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }

    console.log('Ticker: Stopped')
  }

  /**
   * Check if ticker is running
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * Get all registered task IDs
   */
  getTaskIds(): string[] {
    return Array.from(this.tasks.keys())
  }

  /**
   * Main tick loop
   */
  private tick(currentTime: number): void {
    if (!this.running) return

    const deltaTime = currentTime - this.lastFrameTime
    const elapsed = currentTime - this.startTime
    this.lastFrameTime = currentTime

    // Sort tasks by priority and run eligible ones
    const sortedTasks = Array.from(this.tasks.values())
      .filter(t => t.enabled)
      .sort((a, b) => a.priority - b.priority)

    for (const task of sortedTasks) {
      const timeSinceLastRun = currentTime - task.lastRun

      if (timeSinceLastRun >= task.interval) {
        try {
          task.callback(deltaTime, elapsed)
          task.lastRun = currentTime
        } catch (error) {
          console.error(`Ticker: Error in task "${task.id}":`, error)
        }
      }
    }

    // Schedule next frame
    this.frameId = requestAnimationFrame(this.tick)
  }
}

// Singleton instances for different contexts
const tickers: Map<string, Ticker> = new Map()

export function getTicker(context: 'content' | 'popup' = 'content'): Ticker {
  let ticker = tickers.get(context)
  if (!ticker) {
    ticker = new Ticker()
    tickers.set(context, ticker)
  }
  return ticker
}

// Backwards compatibility
export const getContentTicker = () => getTicker('content')
