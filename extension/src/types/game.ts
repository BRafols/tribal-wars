// Game data types for Tribal Wars

export interface WorldInfo {
  world: string
  username: string
  points: number
  rank: number
  villageName: string
  villageCoords: string
  resources: Resources
  population: Population
  production: Production
}

export interface Resources {
  wood: number
  clay: number
  iron: number
  storage: number
}

export interface Population {
  current: number
  max: number
}

export interface Production {
  wood: number
  clay: number
  iron: number
}

export interface GameState {
  isConnected: boolean
  worldInfo: WorldInfo | null
  lastUpdated: number | null
}

export interface WorldInfoResponse {
  worldInfo: WorldInfo | null
  lastUpdated: number | null
}

// Message types for content script <-> popup communication
export type MessageType =
  | 'GAME_READY'
  | 'GAME_EVENT'
  | 'GET_WORLD_INFO'
  | 'WORLD_INFO_RESPONSE'

export interface Message<T = unknown> {
  type: MessageType
  payload: T
}

// Building queue types
export interface BuildingQueueItem {
  index: number           // Timer index (1-based)
  endTimestamp: number    // Unix timestamp (seconds) when building completes
  remainingSeconds: number // Seconds remaining until completion
}

export interface BuildingQueueData {
  screen: string          // Current screen (e.g., "main" for building screen)
  villageId: number       // Current village ID
  orderCount: number      // Number of buildings in queue
  serverTime: number      // Current server time (seconds)
  queue: BuildingQueueItem[]
}

// Recruitment types
export type UnitType = 'spear' | 'sword' | 'axe' | 'archer' | 'spy' | 'light' | 'marcher' | 'heavy' | 'ram' | 'catapult' | 'knight' | 'snob'

export type BuildingType = 'barracks' | 'stable' | 'garage'

export interface UnitConfig {
  unitType: UnitType
  building: BuildingType
  priority: number
}

export interface RecruitmentQueueItem {
  building: BuildingType
  unitType: string
  count: number
}

export interface VillageRecruitmentData {
  villageId: number
  villageName: string
  buildings: Record<BuildingType, number>
  queue: RecruitmentQueueItem[]
}

export interface RecruitmentData {
  screen: string
  mode: string
  groupId: string | null
  villages: VillageRecruitmentData[]
}
