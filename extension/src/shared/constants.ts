// Constants for the multi-tab coordinator system
// All timing values in milliseconds unless otherwise noted

// Tab roles define what actions a tab can perform
export const TabRole = {
  SCAVENGE: 'scavenge',
  FARM: 'farm',
  RECRUIT: 'recruit',
  BUILD: 'build',
  OVERVIEW: 'overview',
} as const

export type TabRoleType = (typeof TabRole)[keyof typeof TabRole]

// Task types for the scheduler
export const TaskType = {
  SCAVENGE_START: 'scavenge:start',
  SCAVENGE_CHECK: 'scavenge:check',
  FARM_ATTACK: 'farm:attack',
  FARM_CHECK: 'farm:check',
  RECRUIT_QUEUE: 'recruit:queue',
  RECRUIT_CHECK: 'recruit:check',
  BUILD_QUEUE: 'build:queue',
  BUILD_CHECK: 'build:check',
} as const

export type TaskTypeValue = (typeof TaskType)[keyof typeof TaskType]

// Task priorities (lower = higher priority)
export const TaskPriority = {
  HIGH: 1,
  NORMAL: 5,
  LOW: 10,
} as const

// Screen identifiers from game_data.screen
export const GameScreen = {
  MAIN: 'main', // Headquarters
  TRAIN: 'train', // Barracks/Stable/Workshop
  PLACE: 'place', // Rally point
  PLACE_SCAVENGE: 'place&mode=scavenge', // Scavenging
  AM_FARM: 'am_farm', // Farm Assistant
  OVERVIEW: 'overview_villages', // Village overview
} as const

// URL patterns for opening specific screens
export const ScreenUrlPattern = {
  MAIN: 'screen=main',
  TRAIN: 'screen=train',
  PLACE: 'screen=place',
  SCAVENGE: 'screen=place&mode=scavenge',
  FARM: 'screen=am_farm',
  OVERVIEW: 'screen=overview_villages',
} as const

// Timing constants
export const Timing = {
  // Minimum delay between any two actions to avoid detection
  MIN_ACTION_DELAY_MS: 1000,

  // Maximum random jitter added to actions
  MAX_JITTER_MS: 500,

  // Tab heartbeat interval - how often tabs report they're alive
  TAB_HEARTBEAT_INTERVAL_MS: 5000,

  // Tab considered dead after this many missed heartbeats
  TAB_DEAD_THRESHOLD_MS: 15000,

  // How often to persist state to storage
  STATE_PERSIST_INTERVAL_MS: 10000,

  // Scavenging check interval
  SCAVENGE_CHECK_INTERVAL_MS: 30000,

  // Farm Assistant check interval
  FARM_CHECK_INTERVAL_MS: 60000,

  // Minimum time between attack arrivals at same farm target (30 min)
  FARM_TARGET_INTERVAL_MS: 1800000,

  // Building queue check interval
  BUILD_CHECK_INTERVAL_MS: 60000,

  // Recruitment check interval
  RECRUIT_CHECK_INTERVAL_MS: 30000,

  // Free building completion threshold (3 minutes in seconds)
  FREE_COMPLETION_THRESHOLD_SECONDS: 180,
} as const

// Resource thresholds
export const Threshold = {
  // Minimum % of storage to keep after building (0-100)
  BUILD_RESOURCE_THRESHOLD_PCT: 20,
} as const

// Storage keys for chrome.storage.local
export const StorageKey = {
  TAB_REGISTRY: 'tw_bot_tab_registry',
  TASK_QUEUE: 'tw_bot_task_queue',
  CONFIG: 'tw_bot_config',
  LAST_ACTION_TIME: 'tw_bot_last_action_time',
  VILLAGE_SETTINGS: 'tw_bot_village_settings',
} as const

// Message types for service worker <-> content script communication
export const MessageType = {
  // Tab registration
  TAB_REGISTER: 'tab:register',
  TAB_UNREGISTER: 'tab:unregister',
  TAB_HEARTBEAT: 'tab:heartbeat',
  TAB_ROLE_ASSIGNED: 'tab:role_assigned',

  // Task execution
  TASK_EXECUTE: 'task:execute',
  TASK_COMPLETE: 'task:complete',
  TASK_FAILED: 'task:failed',

  // Tab management
  TAB_NAVIGATE: 'tab:navigate',
  TAB_OPEN: 'tab:open',

  // State sync
  STATE_REQUEST: 'state:request',
  STATE_RESPONSE: 'state:response',

  // Error reporting
  ERROR_REPORT: 'error:report',

  // Dashboard (side panel) communication
  DASHBOARD_STATE_REQUEST: 'dashboard:state_request',
  DASHBOARD_STATE_RESPONSE: 'dashboard:state_response',
  DASHBOARD_TOGGLE_BOT: 'dashboard:toggle_bot',
} as const

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType]
