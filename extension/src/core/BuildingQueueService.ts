// Service for monitoring building queue and auto-completing buildings
// when free completion (Finalizar) button is available (< 3 minutes remaining)

import type { BuildingQueueData } from '../types/game'
import { getContentTicker } from './Ticker'

type BuildingQueueListener = (data: BuildingQueueData) => void

// Threshold in seconds for free completion (3 minutes)
const FREE_COMPLETION_THRESHOLD = 180

class BuildingQueueService {
  private data: BuildingQueueData | null = null
  private listeners: Set<BuildingQueueListener> = new Set()
  private injected = false
  private messageHandler: ((event: MessageEvent) => void) | null = null
  private lastClickTime = 0
  private clickCooldown = 2000 // Minimum ms between click attempts

  /**
   * Initialize the service - call once when content script loads
   */
  init(): void {
    if (this.injected) return

    // Set up message listener for data from page context
    this.messageHandler = this.handleMessage.bind(this)
    window.addEventListener('message', this.messageHandler)

    // Inject script to read building queue data
    this.injectReader()
    this.injected = true

    // Register with ticker for periodic updates (check every 1 second)
    const ticker = getContentTicker()
    ticker.register('buildingQueue', () => this.requestUpdate(), 1000, { priority: 2 })

    console.log('BuildingQueueService: Initialized')
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
    ticker.unregister('buildingQueue')

    this.listeners.clear()
    this.data = null
    this.injected = false

    console.log('BuildingQueueService: Destroyed')
  }

  /**
   * Get current building queue data
   */
  getData(): BuildingQueueData | null {
    return this.data
  }

  /**
   * Subscribe to building queue updates
   */
  subscribe(listener: BuildingQueueListener): () => void {
    this.listeners.add(listener)

    // Immediately call with current data if available
    if (this.data) {
      listener(this.data)
    }

    return () => this.listeners.delete(listener)
  }

  /**
   * Request a data update from the page
   */
  requestUpdate(): void {
    window.postMessage({ type: 'TW_BOT_REQUEST_BUILDING_QUEUE' }, '*')
  }

  /**
   * Handle messages from the injected script
   */
  private handleMessage(event: MessageEvent): void {
    if (event.data?.type !== 'TW_BOT_BUILDING_QUEUE_DATA') return

    const data = event.data.data as BuildingQueueData | null
    if (!data) return

    this.data = data
    this.notifyListeners()
    this.checkForFreeCompletion()
  }

  /**
   * Check if any building can be completed for free and click the button
   */
  private checkForFreeCompletion(): void {
    if (!this.data || this.data.queue.length === 0) return

    // Only check on the building screen
    if (this.data.screen !== 'main') {
      console.log('BuildingQueueService: Not on building screen, skipping auto-complete check')
      return
    }

    // Check the first building in queue (the one actively being built)
    const firstBuilding = this.data.queue[0]
    if (!firstBuilding) return

    // Check if remaining time is less than threshold
    if (firstBuilding.remainingSeconds > 0 && firstBuilding.remainingSeconds < FREE_COMPLETION_THRESHOLD) {
      console.log(`BuildingQueueService: Building completion in ${firstBuilding.remainingSeconds}s, looking for free completion button`)
      this.attemptFreeCompletion()
    }
  }

  /**
   * Attempt to click the free completion button
   */
  private attemptFreeCompletion(): void {
    const now = Date.now()
    if (now - this.lastClickTime < this.clickCooldown) {
      return // Still in cooldown
    }

    // Request the page context to click the button
    window.postMessage({ type: 'TW_BOT_CLICK_FREE_COMPLETION' }, '*')
    this.lastClickTime = now
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
        console.error('BuildingQueueService: Error in listener:', error)
      }
    }
  }

  /**
   * Inject script into page context to read building queue data
   */
  private injectReader(): void {
    const script = document.createElement('script')
    script.textContent = `
      (function() {
        function getBuildingQueueData() {
          // Check if we have access to the required objects
          if (!window.game_data) return null;

          const data = {
            screen: window.game_data.screen || '',
            villageId: window.game_data.village?.id || 0,
            orderCount: 0,
            serverTime: Math.floor(Date.now() / 1000),
            queue: []
          };

          // Get server time if available
          if (window.Timing && window.Timing.initial_server_time) {
            // Timing.initial_server_time is in milliseconds
            data.serverTime = Math.floor(window.Timing.initial_server_time / 1000);
          }

          // Get order count if BuildingMain exists
          if (window.BuildingMain && typeof window.BuildingMain.order_count !== 'undefined') {
            data.orderCount = window.BuildingMain.order_count;
          }

          // Get timer data if Timing exists
          if (window.Timing &&
              window.Timing.tickHandlers &&
              window.Timing.tickHandlers.timers &&
              window.Timing.tickHandlers.timers._timers) {

            const timers = window.Timing.tickHandlers.timers._timers;
            const currentTime = Math.floor(Date.now() / 1000);

            // Timers are 1-indexed, building queue starts at index 1
            for (let i = 1; i <= data.orderCount; i++) {
              const timer = timers[i];
              if (timer && timer.end) {
                const remainingSeconds = timer.end - currentTime;
                data.queue.push({
                  index: i,
                  endTimestamp: timer.end,
                  remainingSeconds: remainingSeconds
                });
              }
            }
          }

          return data;
        }

        function sendBuildingQueueData() {
          const data = getBuildingQueueData();
          window.postMessage({ type: 'TW_BOT_BUILDING_QUEUE_DATA', data: data }, '*');
        }

        function clickFreeCompletionButton() {
          // Look for the "Finalizar" button in the building queue
          // The button is an <a> element with href="#" and text "Finalizar"
          const buildQueue = document.querySelector('#buildqueue, .buildorder_gui');
          if (!buildQueue) {
            console.log('TW Bot: Build queue element not found');
            return false;
          }

          // Find all links in the queue
          const links = buildQueue.querySelectorAll('a[href="#"]');

          for (const link of links) {
            // Check if the link text contains "Finalizar" (case-insensitive)
            const text = link.textContent?.trim() || '';
            if (text.toLowerCase() === 'finalizar') {
              console.log('TW Bot: Found "Finalizar" button, clicking...');
              link.click();
              return true;
            }
          }

          // Alternative: look for the button by class if it has a specific class
          const finalizarBtn = buildQueue.querySelector('a.btn-instant-free, a[class*="instant"]');
          if (finalizarBtn) {
            console.log('TW Bot: Found instant completion button by class, clicking...');
            finalizarBtn.click();
            return true;
          }

          console.log('TW Bot: "Finalizar" button not found (may not be available yet)');
          return false;
        }

        // Send data immediately
        sendBuildingQueueData();

        // Respond to requests
        window.addEventListener('message', function(event) {
          if (!event.data) return;

          if (event.data.type === 'TW_BOT_REQUEST_BUILDING_QUEUE') {
            sendBuildingQueueData();
          }

          if (event.data.type === 'TW_BOT_CLICK_FREE_COMPLETION') {
            clickFreeCompletionButton();
          }
        });
      })();
    `
    document.documentElement.appendChild(script)
    script.remove()
  }
}

// Singleton instance
let instance: BuildingQueueService | null = null

export function getBuildingQueueService(): BuildingQueueService {
  if (!instance) {
    instance = new BuildingQueueService()
  }
  return instance
}
