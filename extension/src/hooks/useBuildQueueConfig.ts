// Hook for managing build queue configuration in Options page

import { useState, useEffect, useCallback } from 'react'
import type { BuildQueueConfig, BuildQueueItem } from '../shared/types'
import { StorageKey, Threshold } from '../shared/constants'
import { generateQueueItemId, createQueueItem, BuildQueuePresets, parseBuildOrderText, exportBuildOrderText } from '../shared/buildings'

const DEFAULT_CONFIG: BuildQueueConfig = {
  enabled: false,
  paused: false,
  queue: [],
  resourceThresholdPct: Threshold.BUILD_RESOURCE_THRESHOLD_PCT,
}

export function useBuildQueueConfig() {
  const [config, setConfig] = useState<BuildQueueConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const loadConfig = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get([StorageKey.BUILD_QUEUE_CONFIG])
      if (result[StorageKey.BUILD_QUEUE_CONFIG]) {
        setConfig({ ...DEFAULT_CONFIG, ...(result[StorageKey.BUILD_QUEUE_CONFIG] as Partial<BuildQueueConfig>) })
      }
    } catch (error) {
      console.error('Failed to load build queue config:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load config on mount
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[StorageKey.BUILD_QUEUE_CONFIG]) {
        const newConfig = changes[StorageKey.BUILD_QUEUE_CONFIG].newValue as BuildQueueConfig
        if (newConfig) {
          setConfig({ ...DEFAULT_CONFIG, ...newConfig })
        }
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  const saveConfig = useCallback(async (newConfig: BuildQueueConfig) => {
    try {
      await chrome.storage.local.set({ [StorageKey.BUILD_QUEUE_CONFIG]: newConfig })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save build queue config:', error)
    }
  }, [])

  const toggleEnabled = useCallback(async () => {
    const newConfig = { ...config, enabled: !config.enabled }
    setConfig(newConfig)
    await saveConfig(newConfig)
  }, [config, saveConfig])

  const togglePaused = useCallback(async () => {
    const newConfig = { ...config, paused: !config.paused }
    setConfig(newConfig)
    await saveConfig(newConfig)
  }, [config, saveConfig])

  const setResourceThreshold = useCallback(async (pct: number) => {
    const newConfig = { ...config, resourceThresholdPct: Math.max(0, Math.min(100, pct)) }
    setConfig(newConfig)
    await saveConfig(newConfig)
  }, [config, saveConfig])

  const addItem = useCallback(async (building: string, targetLevel: number) => {
    const item = createQueueItem(building, targetLevel)
    const newConfig = { ...config, queue: [...config.queue, item] }
    setConfig(newConfig)
    await saveConfig(newConfig)
  }, [config, saveConfig])

  const removeItem = useCallback(async (itemId: string) => {
    const newConfig = { ...config, queue: config.queue.filter(item => item.id !== itemId) }
    setConfig(newConfig)
    await saveConfig(newConfig)
  }, [config, saveConfig])

  const reorderItems = useCallback(async (fromIndex: number, toIndex: number) => {
    const queue = [...config.queue]
    const [removed] = queue.splice(fromIndex, 1)
    if (removed) {
      queue.splice(toIndex, 0, removed)
      const newConfig = { ...config, queue }
      setConfig(newConfig)
      await saveConfig(newConfig)
    }
  }, [config, saveConfig])

  const skipCurrentItem = useCallback(async () => {
    const currentIndex = config.queue.findIndex(item => !item.completed)
    if (currentIndex >= 0) {
      const queue = [...config.queue]
      queue[currentIndex] = { ...queue[currentIndex], completed: true }
      const newConfig = { ...config, queue }
      setConfig(newConfig)
      await saveConfig(newConfig)
    }
  }, [config, saveConfig])

  const clearQueue = useCallback(async () => {
    const newConfig = { ...config, queue: [] }
    setConfig(newConfig)
    await saveConfig(newConfig)
  }, [config, saveConfig])

  const resetProgress = useCallback(async () => {
    const queue = config.queue.map(item => ({ ...item, completed: false }))
    const newConfig = { ...config, queue }
    setConfig(newConfig)
    await saveConfig(newConfig)
  }, [config, saveConfig])

  const loadPreset = useCallback(async (presetId: string) => {
    const preset = BuildQueuePresets.find(p => p.id === presetId)
    if (preset) {
      const queue: BuildQueueItem[] = preset.queue.map(item => ({
        id: generateQueueItemId(),
        building: item.building,
        targetLevel: item.targetLevel,
        completed: false,
      }))
      const newConfig = { ...config, queue }
      setConfig(newConfig)
      await saveConfig(newConfig)
    }
  }, [config, saveConfig])

  const importQueue = useCallback(async (text: string) => {
    const items = parseBuildOrderText(text)
    if (items.length > 0) {
      const queue: BuildQueueItem[] = items.map(item => ({
        id: generateQueueItemId(),
        building: item.building,
        targetLevel: item.targetLevel,
        completed: false,
      }))
      const newConfig = { ...config, queue }
      setConfig(newConfig)
      await saveConfig(newConfig)
      return true
    }
    return false
  }, [config, saveConfig])

  const exportQueue = useCallback(() => {
    return exportBuildOrderText(config.queue)
  }, [config.queue])

  return {
    config,
    loading,
    saved,
    toggleEnabled,
    togglePaused,
    setResourceThreshold,
    addItem,
    removeItem,
    reorderItems,
    skipCurrentItem,
    clearQueue,
    resetProgress,
    loadPreset,
    importQueue,
    exportQueue,
    presets: BuildQueuePresets,
  }
}
