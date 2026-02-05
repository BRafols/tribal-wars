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
