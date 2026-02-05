// Type definitions for the multi-tab coordinator system

import type { TabRoleType, TaskTypeValue, MessageTypeValue } from './constants'

// Re-export types for convenience
export type { TabRoleType, TaskTypeValue, MessageTypeValue }

// Tab information stored in the registry
export interface TabInfo {
  tabId: number
  role: TabRoleType | null
  url: string
  villageId: number | null
  worldId: string | null
  lastHeartbeat: number
  registeredAt: number
  isActive: boolean
}

// Task definition for the scheduler
export interface ScheduledTask {
  id: string
  type: TaskTypeValue
  villageId: number
  worldId: string
  scheduledTime: number
  priority: number
  retryCount: number
  maxRetries: number
  payload: Record<string, unknown>
  createdAt: number
}

// Task result from execution
export interface TaskResult {
  taskId: string
  success: boolean
  error?: string
  data?: Record<string, unknown>
  nextScheduledTime?: number
}

// Coordinator state persisted to storage
export interface CoordinatorState {
  tabs: Record<number, TabInfo>
  tasks: ScheduledTask[]
  lastActionTime: number
  isRunning: boolean
  lastUpdated: number
}

// Configuration options
export interface BotConfig {
  enabled: boolean
  features: {
    scavenging: boolean
    farming: boolean
    recruiting: boolean
    building: boolean
  }
  timing: {
    minActionDelay: number
    maxJitter: number
  }
  villages: Record<number, VillageConfig>
}

// Per-village configuration
export interface VillageConfig {
  villageId: number
  enabled: boolean
  features: {
    scavenging: boolean
    farming: boolean
    recruiting: boolean
    building: boolean
  }
  scavenging: {
    autoRestart: boolean
    priorityTiers: number[] // Which tiers to use, in priority order
  }
  farming: {
    autoFarm: boolean
    farmTemplateA: boolean
    farmTemplateB: boolean
    maxDistance: number
  }
  recruiting: {
    autoRecruit: boolean
    unitQueues: Record<string, number> // unit name -> target count
  }
  building: {
    autoComplete: boolean
    buildOrder: string[] // building names in priority order
  }
}

// Message envelope for all communication
export interface CoordinatorMessage<T = unknown> {
  type: MessageTypeValue
  tabId?: number
  payload: T
  timestamp: number
}

// Tab registration payload
export interface TabRegisterPayload {
  url: string
  screen: string
  villageId: number | null
  worldId: string | null
}

// Tab heartbeat payload
export interface TabHeartbeatPayload {
  url: string
  screen: string
  villageId: number | null
  worldId: string | null
  isVisible: boolean
}

// Task execute payload (sent to content script)
export interface TaskExecutePayload {
  task: ScheduledTask
}

// Task complete payload (sent from content script)
export interface TaskCompletePayload {
  taskId: string
  success: boolean
  error?: string
  data?: Record<string, unknown>
  nextScheduledTime?: number
}

// Tab navigate payload
export interface TabNavigatePayload {
  url: string
}

// Tab open payload (to service worker)
export interface TabOpenPayload {
  url: string
  role: TabRoleType
}

// Error report payload
export interface ErrorReportPayload {
  message: string
  stack?: string
  context: Record<string, unknown>
}

// Scavenging-specific types
export interface ScavengeTier {
  tier: number
  isRunning: boolean
  remainingSeconds: number | null
  canStart: boolean
}

export interface ScavengeState {
  villageId: number
  tiers: ScavengeTier[]
  lastChecked: number
}

// Farm-specific types
export interface FarmTarget {
  villageId: number
  coords: string
  distance: number
  lastAttacked: number | null
  status: 'available' | 'attacking' | 'cooldown'
}

export interface FarmState {
  targets: FarmTarget[]
  lastPage: number
  totalPages: number
  lastChecked: number
}
