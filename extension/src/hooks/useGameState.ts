import { useState, useEffect, useCallback } from 'react'
import type { GameState, WorldInfo, Message, WorldInfoResponse } from '../types/game'
import { getTicker } from '../core'

const initialState: GameState = {
  isConnected: false,
  worldInfo: null,
  lastUpdated: null,
}

const GAME_URL_PATTERNS = [
  '*://*.guerrastribales.es/*',
  '*://*.tribalwars.net/*',
  '*://*.tribalwars.com/*',
  '*://*.die-staemme.de/*',
  '*://*.triburile.ro/*',
]

export function useGameState() {
  const [state, setState] = useState<GameState>(initialState)
  const [loading, setLoading] = useState(true)

  const fetchWorldInfo = useCallback(async () => {
    try {
      // Query ALL tabs matching game URLs (not just active tab)
      const tabs = await chrome.tabs.query({ url: GAME_URL_PATTERNS })

      if (!tabs.length) {
        setState({ ...initialState, isConnected: false })
        setLoading(false)
        return
      }

      // Try to get info from the first game tab found
      for (const tab of tabs) {
        if (!tab.id) continue

        try {
          const response: WorldInfoResponse = await chrome.tabs.sendMessage(tab.id, {
            type: 'GET_WORLD_INFO',
            payload: null,
          } as Message)

          if (response?.worldInfo) {
            setState({
              isConnected: true,
              worldInfo: response.worldInfo as WorldInfo,
              lastUpdated: response.lastUpdated ?? Date.now(),
            })
            setLoading(false)
            return
          }
        } catch {
          // Content script might not be ready on this tab, try next
          continue
        }
      }

      // No valid response from any tab
      setState({ ...initialState, isConnected: false })
    } catch (error) {
      console.error('Failed to fetch world info:', error)
      setState(initialState)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorldInfo()

    const ticker = getTicker('popup')
    ticker.register('fetchWorldInfo', fetchWorldInfo, 0, { priority: 1 })

    if (!ticker.isRunning()) {
      ticker.start()
    }

    return () => {
      ticker.unregister('fetchWorldInfo')
    }
  }, [fetchWorldInfo])

  return {
    ...state,
    loading,
    refresh: fetchWorldInfo,
  }
}
