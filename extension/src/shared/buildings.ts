// Building constants and presets for the auto-build queue system

import type { BuildQueuePreset } from './types'

// Building identifiers used by Tribal Wars
export const BuildingId = {
  MAIN: 'main',          // Headquarters
  BARRACKS: 'barracks',  // Barracks
  STABLE: 'stable',      // Stable
  GARAGE: 'garage',      // Workshop
  SNOB: 'snob',          // Academy
  SMITH: 'smith',        // Smithy
  PLACE: 'place',        // Rally Point
  STATUE: 'statue',      // Statue
  MARKET: 'market',      // Market
  WOOD: 'wood',          // Timber Camp
  STONE: 'stone',        // Clay Pit
  IRON: 'iron',          // Iron Mine
  FARM: 'farm',          // Farm
  STORAGE: 'storage',    // Warehouse
  HIDE: 'hide',          // Hiding Place
  WALL: 'wall',          // Wall
  CHURCH: 'church',      // Church
  CHURCH_F: 'church_f',  // First Church
  WATCHTOWER: 'watchtower', // Watchtower
} as const

export type BuildingIdType = (typeof BuildingId)[keyof typeof BuildingId]

// Building display names (Spanish/English)
export const BuildingNames: Record<string, string> = {
  [BuildingId.MAIN]: 'Headquarters',
  [BuildingId.BARRACKS]: 'Barracks',
  [BuildingId.STABLE]: 'Stable',
  [BuildingId.GARAGE]: 'Workshop',
  [BuildingId.SNOB]: 'Academy',
  [BuildingId.SMITH]: 'Smithy',
  [BuildingId.PLACE]: 'Rally Point',
  [BuildingId.STATUE]: 'Statue',
  [BuildingId.MARKET]: 'Market',
  [BuildingId.WOOD]: 'Timber Camp',
  [BuildingId.STONE]: 'Clay Pit',
  [BuildingId.IRON]: 'Iron Mine',
  [BuildingId.FARM]: 'Farm',
  [BuildingId.STORAGE]: 'Warehouse',
  [BuildingId.HIDE]: 'Hiding Place',
  [BuildingId.WALL]: 'Wall',
  [BuildingId.CHURCH]: 'Church',
  [BuildingId.CHURCH_F]: 'First Church',
  [BuildingId.WATCHTOWER]: 'Watchtower',
}

// Building dependencies (building -> required building & level)
export const BuildingDependencies: Record<string, { building: string; level: number }[]> = {
  [BuildingId.BARRACKS]: [{ building: BuildingId.MAIN, level: 3 }],
  [BuildingId.STABLE]: [{ building: BuildingId.BARRACKS, level: 5 }, { building: BuildingId.SMITH, level: 5 }],
  [BuildingId.GARAGE]: [{ building: BuildingId.MAIN, level: 10 }, { building: BuildingId.SMITH, level: 10 }],
  [BuildingId.SNOB]: [{ building: BuildingId.MAIN, level: 20 }, { building: BuildingId.MARKET, level: 10 }, { building: BuildingId.SMITH, level: 20 }],
  [BuildingId.SMITH]: [{ building: BuildingId.MAIN, level: 5 }, { building: BuildingId.BARRACKS, level: 1 }],
  [BuildingId.MARKET]: [{ building: BuildingId.MAIN, level: 3 }, { building: BuildingId.STORAGE, level: 2 }],
  [BuildingId.WALL]: [{ building: BuildingId.BARRACKS, level: 1 }],
  [BuildingId.STATUE]: [{ building: BuildingId.MAIN, level: 3 }],
  [BuildingId.WATCHTOWER]: [{ building: BuildingId.MAIN, level: 3 }],
}

// Maximum levels for each building
export const BuildingMaxLevels: Record<string, number> = {
  [BuildingId.MAIN]: 30,
  [BuildingId.BARRACKS]: 25,
  [BuildingId.STABLE]: 20,
  [BuildingId.GARAGE]: 15,
  [BuildingId.SNOB]: 3,
  [BuildingId.SMITH]: 20,
  [BuildingId.PLACE]: 1,
  [BuildingId.STATUE]: 1,
  [BuildingId.MARKET]: 25,
  [BuildingId.WOOD]: 30,
  [BuildingId.STONE]: 30,
  [BuildingId.IRON]: 30,
  [BuildingId.FARM]: 30,
  [BuildingId.STORAGE]: 30,
  [BuildingId.HIDE]: 10,
  [BuildingId.WALL]: 20,
  [BuildingId.CHURCH]: 3,
  [BuildingId.CHURCH_F]: 1,
  [BuildingId.WATCHTOWER]: 20,
}

// Available buildings for the queue (ordered by typical importance)
export const AvailableBuildings: string[] = [
  BuildingId.MAIN,
  BuildingId.WOOD,
  BuildingId.STONE,
  BuildingId.IRON,
  BuildingId.FARM,
  BuildingId.STORAGE,
  BuildingId.BARRACKS,
  BuildingId.STABLE,
  BuildingId.GARAGE,
  BuildingId.SMITH,
  BuildingId.MARKET,
  BuildingId.WALL,
  BuildingId.HIDE,
  BuildingId.STATUE,
  BuildingId.PLACE,
  BuildingId.SNOB,
  BuildingId.CHURCH,
  BuildingId.WATCHTOWER,
]

// Build order presets
export const BuildQueuePresets: BuildQueuePreset[] = [
  {
    id: 'balanced-start',
    name: 'Balanced Start',
    description: 'A well-rounded early game build order for new villages',
    queue: [
      { building: BuildingId.MAIN, targetLevel: 2 },
      { building: BuildingId.FARM, targetLevel: 2 },
      { building: BuildingId.STORAGE, targetLevel: 2 },
      { building: BuildingId.WOOD, targetLevel: 3 },
      { building: BuildingId.STONE, targetLevel: 3 },
      { building: BuildingId.IRON, targetLevel: 3 },
      { building: BuildingId.FARM, targetLevel: 3 },
      { building: BuildingId.STORAGE, targetLevel: 3 },
      { building: BuildingId.MAIN, targetLevel: 3 },
      { building: BuildingId.BARRACKS, targetLevel: 1 },
      { building: BuildingId.FARM, targetLevel: 5 },
      { building: BuildingId.STORAGE, targetLevel: 5 },
      { building: BuildingId.WOOD, targetLevel: 5 },
      { building: BuildingId.STONE, targetLevel: 5 },
      { building: BuildingId.IRON, targetLevel: 5 },
    ],
  },
  {
    id: 'rush-barracks',
    name: 'Rush Barracks',
    description: 'Get barracks up quickly for early military units',
    queue: [
      { building: BuildingId.MAIN, targetLevel: 3 },
      { building: BuildingId.BARRACKS, targetLevel: 1 },
      { building: BuildingId.BARRACKS, targetLevel: 2 },
      { building: BuildingId.BARRACKS, targetLevel: 3 },
      { building: BuildingId.FARM, targetLevel: 5 },
      { building: BuildingId.STORAGE, targetLevel: 5 },
      { building: BuildingId.BARRACKS, targetLevel: 5 },
    ],
  },
  {
    id: 'farming-village',
    name: 'Farming Village',
    description: 'Focus on stable and light cavalry for farming',
    queue: [
      { building: BuildingId.MAIN, targetLevel: 3 },
      { building: BuildingId.BARRACKS, targetLevel: 5 },
      { building: BuildingId.MAIN, targetLevel: 5 },
      { building: BuildingId.SMITH, targetLevel: 5 },
      { building: BuildingId.STABLE, targetLevel: 1 },
      { building: BuildingId.FARM, targetLevel: 5 },
      { building: BuildingId.STORAGE, targetLevel: 5 },
      { building: BuildingId.STABLE, targetLevel: 3 },
      { building: BuildingId.FARM, targetLevel: 10 },
      { building: BuildingId.STORAGE, targetLevel: 10 },
    ],
  },
  {
    id: 'defensive',
    name: 'Defensive Build',
    description: 'Focus on wall and defensive structures',
    queue: [
      { building: BuildingId.MAIN, targetLevel: 3 },
      { building: BuildingId.BARRACKS, targetLevel: 1 },
      { building: BuildingId.WALL, targetLevel: 1 },
      { building: BuildingId.WALL, targetLevel: 3 },
      { building: BuildingId.WALL, targetLevel: 5 },
      { building: BuildingId.BARRACKS, targetLevel: 5 },
      { building: BuildingId.FARM, targetLevel: 5 },
      { building: BuildingId.STORAGE, targetLevel: 5 },
      { building: BuildingId.WALL, targetLevel: 10 },
    ],
  },
  {
    id: 'resource-heavy',
    name: 'Resource Heavy',
    description: 'Maximize resource production early',
    queue: [
      { building: BuildingId.WOOD, targetLevel: 5 },
      { building: BuildingId.STONE, targetLevel: 5 },
      { building: BuildingId.IRON, targetLevel: 5 },
      { building: BuildingId.FARM, targetLevel: 5 },
      { building: BuildingId.STORAGE, targetLevel: 5 },
      { building: BuildingId.WOOD, targetLevel: 10 },
      { building: BuildingId.STONE, targetLevel: 10 },
      { building: BuildingId.IRON, targetLevel: 10 },
      { building: BuildingId.FARM, targetLevel: 10 },
      { building: BuildingId.STORAGE, targetLevel: 10 },
      { building: BuildingId.WOOD, targetLevel: 15 },
      { building: BuildingId.STONE, targetLevel: 15 },
      { building: BuildingId.IRON, targetLevel: 15 },
    ],
  },
]

// Helper function to generate unique ID for queue items
export function generateQueueItemId(): string {
  return `bqi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Helper to create a queue item from preset data
export function createQueueItem(building: string, targetLevel: number): import('./types').BuildQueueItem {
  return {
    id: generateQueueItemId(),
    building,
    targetLevel,
    completed: false,
  }
}

// Parse build order text format (e.g., "HQ 2, Farm 3, Barracks 1")
export function parseBuildOrderText(text: string): { building: string; targetLevel: number }[] {
  const items: { building: string; targetLevel: number }[] = []

  // Normalize building name aliases
  const aliases: Record<string, string> = {
    'hq': BuildingId.MAIN,
    'headquarters': BuildingId.MAIN,
    'timber': BuildingId.WOOD,
    'timber camp': BuildingId.WOOD,
    'clay': BuildingId.STONE,
    'clay pit': BuildingId.STONE,
    'warehouse': BuildingId.STORAGE,
    'workshop': BuildingId.GARAGE,
    'academy': BuildingId.SNOB,
    'smithy': BuildingId.SMITH,
    'rally': BuildingId.PLACE,
    'rally point': BuildingId.PLACE,
  }

  // Split by comma or newline
  const parts = text.split(/[,\n]+/)

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    // Match pattern: "Building Name level" or "Building Name -> level"
    const match = trimmed.match(/^(.+?)\s*(?:->|→|:)?\s*(\d+)$/i)
    if (match) {
      let buildingName = match[1].trim().toLowerCase()
      const level = parseInt(match[2], 10)

      // Check aliases first
      if (aliases[buildingName]) {
        buildingName = aliases[buildingName]
      } else {
        // Try to find building by name
        const found = Object.entries(BuildingNames).find(
          ([id, name]) => name.toLowerCase() === buildingName || id === buildingName
        )
        if (found) {
          buildingName = found[0]
        }
      }

      // Validate building exists
      if (BuildingNames[buildingName] && level > 0 && level <= (BuildingMaxLevels[buildingName] || 30)) {
        items.push({ building: buildingName, targetLevel: level })
      }
    }
  }

  return items
}

// Export build queue to text format
export function exportBuildOrderText(queue: { building: string; targetLevel: number }[]): string {
  return queue
    .map(item => `${BuildingNames[item.building] || item.building} ${item.targetLevel}`)
    .join(', ')
}
