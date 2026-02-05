import { useState, useEffect, useCallback, useRef } from 'react'
import type { DashboardState, AutomationStatus } from '../shared/types'
import { createDashboardStateRequestMessage, createDashboardToggleBotMessage, isDashboardStateResponseMessage, isCoordinatorMessage } from '../shared/messages'

// Default automation status
const DEFAULT_AUTOMATION_STATUS: AutomationStatus = {
  scavenging: {
    status: 'idle',
    activeTiers: [],
    nextCompletionTime: null,
    lastStarted: null,
  },
  farming: {
    status: 'idle',
    targetsAvailable: 0,
    scheduledAttacks: 0,
    lastAttackSent: null,
    attacksToday: 0,
    nextScheduledArrival: null,
  },
  building: {
    status: 'idle',
    queueSlotsUsed: 0,
    queueSlotsMax: 2,
    nextCompletion: null,
    lastQueuedBuilding: null,
  },
  recruiting: {
    status: 'idle',
    barracksQueue: 0,
    stableQueue: 0,
    workshopQueue: 0,
    lastRecruitAction: null,
  },
}

// Default dashboard state
const DEFAULT_STATE: DashboardState = {
  isRunning: false,
  connectionStatus: 'disconnected',
  currentWorld: null,
  currentVillage: null,
  automationStatus: DEFAULT_AUTOMATION_STATUS,
  taskQueue: [],
  actionLog: [],
  tabs: [],
  lastUpdated: Date.now(),
}

// Polling interval (1.5 seconds for smooth updates)
const POLL_INTERVAL_MS = 1500

export function useDashboardState() {
  const [state, setState] = useState<DashboardState>(DEFAULT_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastPollTimeRef = useRef<number>(0)

  // Fetch dashboard state from background service worker
  const fetchState = useCallback(async () => {
    try {
      const message = createDashboardStateRequestMessage()
      const response = await chrome.runtime.sendMessage(message)

      if (isCoordinatorMessage(response) && isDashboardStateResponseMessage(response)) {
        setState(response.payload.state)
        setError(null)
      } else if (response && typeof response === 'object' && 'state' in response) {
        // Handle direct response format
        setState(response.state as DashboardState)
        setError(null)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard state:', err)
      setError('Failed to connect to background service')
      setState(prev => ({ ...prev, connectionStatus: 'disconnected' }))
    } finally {
      setLoading(false)
    }
  }, [])

  // Toggle bot running state
  const toggleBot = useCallback(async (enabled: boolean) => {
    try {
      const message = createDashboardToggleBotMessage(enabled)
      await chrome.runtime.sendMessage(message)
      // Immediately fetch updated state
      await fetchState()
    } catch (err) {
      console.error('Failed to toggle bot:', err)
      setError('Failed to toggle bot state')
    }
  }, [fetchState])

  // Refresh state manually
  const refresh = useCallback(() => {
    return fetchState()
  }, [fetchState])

  // Set up polling with requestAnimationFrame for smoother updates
  useEffect(() => {
    // Initial fetch
    fetchState()

    // Capture refs for cleanup
    const animationFrameRefCurrent = animationFrameRef
    const pollIntervalRefCurrent = pollIntervalRef

    // Use a combination of setInterval (for consistent timing) and requestAnimationFrame (for smooth updates)
    const poll = () => {
      const now = Date.now()
      if (now - lastPollTimeRef.current >= POLL_INTERVAL_MS) {
        lastPollTimeRef.current = now
        fetchState()
      }
      animationFrameRefCurrent.current = requestAnimationFrame(poll)
    }

    // Start polling
    animationFrameRefCurrent.current = requestAnimationFrame(poll)

    // Cleanup
    return () => {
      if (animationFrameRefCurrent.current) {
        cancelAnimationFrame(animationFrameRefCurrent.current)
      }
      if (pollIntervalRefCurrent.current) {
        clearInterval(pollIntervalRefCurrent.current)
      }
    }
  }, [fetchState])

  return {
    ...state,
    loading,
    error,
    refresh,
    toggleBot,
  }
}
