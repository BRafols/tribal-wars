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

// Build Queue types
export interface BuildQueueItem {
  id: string              // Unique ID for drag & drop
  building: string        // e.g., "wood", "barracks", "main"
  targetLevel: number     // Target level to reach
  completed: boolean      // Has this milestone been reached
}

export interface BuildQueueConfig {
  enabled: boolean
  paused: boolean
  queue: BuildQueueItem[]
  resourceThresholdPct: number  // Minimum % of storage to keep after building
}

export interface BuildQueuePreset {
  id: string
  name: string
  description: string
  queue: Omit<BuildQueueItem, 'id' | 'completed'>[]
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
  x: number
  y: number
  distance: number
  lastAttacked: number | null
  wallLevel: number | null
  status: 'available' | 'attacking' | 'cooldown'
}

export interface FarmState {
  targets: FarmTarget[]
  lastPage: number
  totalPages: number
  lastChecked: number
}

// Smart Farm Assistant types
export type UnitType =
  | 'spear'
  | 'sword'
  | 'axe'
  | 'archer'
  | 'spy'
  | 'light'
  | 'marcher'
  | 'heavy'
  | 'ram'
  | 'catapult'
  | 'snob'

// Unit speeds in minutes per field at speed 1
export const UNIT_SPEEDS: Record<UnitType, number> = {
  spy: 9,
  light: 10,
  marcher: 10,
  heavy: 11,
  spear: 18,
  sword: 22,
  axe: 18,
  archer: 18,
  ram: 30,
  catapult: 30,
  snob: 35,
}

export interface UnitInfo {
  [unitId: string]: {
    speed: number
    pop: number
    attack: number
    defense: number
  }
}

export interface WorldConfig {
  speed: number
  unitSpeed: number
  worldId: string
  fetchedAt: number
}

export interface FarmAttackTemplate {
  id: 'A' | 'B'
  units: Partial<Record<UnitType, number>>
  slowestUnit: UnitType | null
}

export interface FarmAttackPlan {
  targetId: string
  targetCoords: string
  sourceVillageId: number
  template: 'A' | 'B'
  sendTime: number
  arrivalTime: number
  travelTimeMs: number
  status: 'pending' | 'sent' | 'failed'
}

export interface SmartFarmState {
  // Target arrivals: targetCoords -> timestamp of last/next arrival
  arrivals: Record<string, number>
  // Scheduled attacks waiting to be sent
  scheduledAttacks: FarmAttackPlan[]
  // Attack history for statistics
  attacksSentToday: number
  lastAttackSent: number | null
  // Configuration
  enabled: boolean
  targetIntervalMs: number
}

// Action Log types for side panel dashboard
export type ActionLogLevel = 'success' | 'error' | 'info' | 'warning'

export interface ActionLogEntry {
  id: string
  timestamp: number
  level: ActionLogLevel
  type: string // e.g., 'scavenge', 'farm', 'build', 'recruit', 'tab', 'system'
  message: string
  villageId?: number
  details?: Record<string, unknown>
}

// Automation status for each feature
export interface AutomationStatus {
  scavenging: {
    status: 'running' | 'idle' | 'disabled'
    activeTiers: number[]
    nextCompletionTime: number | null
    lastStarted: number | null
  }
  farming: {
    status: 'running' | 'idle' | 'disabled'
    targetsAvailable: number
    scheduledAttacks: number
    lastAttackSent: number | null
    attacksToday: number
    nextScheduledArrival: number | null
  }
  building: {
    status: 'running' | 'idle' | 'disabled'
    queueSlotsUsed: number
    queueSlotsMax: number
    nextCompletion: number | null
    lastQueuedBuilding: string | null
  }
  recruiting: {
    status: 'running' | 'idle' | 'disabled'
    barracksQueue: number
    stableQueue: number
    workshopQueue: number
    lastRecruitAction: number | null
  }
}

// Dashboard state for side panel
export interface DashboardState {
  isRunning: boolean
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
  currentWorld: string | null
  currentVillage: {
    id: number
    name: string
  } | null
  automationStatus: AutomationStatus
  taskQueue: ScheduledTask[]
  actionLog: ActionLogEntry[]
  tabs: TabInfo[]
  lastUpdated: number
}

// Dashboard state request/response payloads
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DashboardStateRequestPayload {
  // Empty for now, could add filters later
}

export interface DashboardStateResponsePayload {
  state: DashboardState
}
