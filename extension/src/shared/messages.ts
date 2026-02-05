// Type-safe message sending utilities for the multi-tab coordinator

import { MessageType } from './constants'
import type {
  CoordinatorMessage,
  TabRegisterPayload,
  TabHeartbeatPayload,
  TaskExecutePayload,
  TaskCompletePayload,
  TabNavigatePayload,
  ErrorReportPayload,
  DashboardStateRequestPayload,
  DashboardStateResponsePayload,
} from './types'

// Create a typed message with timestamp
function createMessage<T>(type: CoordinatorMessage<T>['type'], payload: T, tabId?: number): CoordinatorMessage<T> {
  return {
    type,
    payload,
    tabId,
    timestamp: Date.now(),
  }
}

// ============ Messages from Content Script to Service Worker ============

export function createTabRegisterMessage(payload: TabRegisterPayload): CoordinatorMessage<TabRegisterPayload> {
  return createMessage(MessageType.TAB_REGISTER, payload)
}

export function createTabUnregisterMessage(): CoordinatorMessage<undefined> {
  return createMessage(MessageType.TAB_UNREGISTER, undefined)
}

export function createTabHeartbeatMessage(payload: TabHeartbeatPayload): CoordinatorMessage<TabHeartbeatPayload> {
  return createMessage(MessageType.TAB_HEARTBEAT, payload)
}

export function createTaskCompleteMessage(payload: TaskCompletePayload): CoordinatorMessage<TaskCompletePayload> {
  return createMessage(MessageType.TASK_COMPLETE, payload)
}

export function createTaskFailedMessage(payload: TaskCompletePayload): CoordinatorMessage<TaskCompletePayload> {
  return createMessage(MessageType.TASK_FAILED, payload)
}

export function createErrorReportMessage(payload: ErrorReportPayload): CoordinatorMessage<ErrorReportPayload> {
  return createMessage(MessageType.ERROR_REPORT, payload)
}

// ============ Messages from Service Worker to Content Script ============

export function createRoleAssignedMessage(role: string, tabId: number): CoordinatorMessage<{ role: string }> {
  return createMessage(MessageType.TAB_ROLE_ASSIGNED, { role }, tabId)
}

export function createTaskExecuteMessage(payload: TaskExecutePayload, tabId: number): CoordinatorMessage<TaskExecutePayload> {
  return createMessage(MessageType.TASK_EXECUTE, payload, tabId)
}

export function createTabNavigateMessage(payload: TabNavigatePayload, tabId: number): CoordinatorMessage<TabNavigatePayload> {
  return createMessage(MessageType.TAB_NAVIGATE, payload, tabId)
}

// ============ Type Guards ============

export function isCoordinatorMessage(message: unknown): message is CoordinatorMessage {
  if (typeof message !== 'object' || message === null) return false
  const msg = message as Record<string, unknown>
  return typeof msg.type === 'string' && msg.type.includes(':') && typeof msg.timestamp === 'number'
}

export function isTabRegisterMessage(message: CoordinatorMessage): message is CoordinatorMessage<TabRegisterPayload> {
  return message.type === MessageType.TAB_REGISTER
}

export function isTabHeartbeatMessage(message: CoordinatorMessage): message is CoordinatorMessage<TabHeartbeatPayload> {
  return message.type === MessageType.TAB_HEARTBEAT
}

export function isTaskExecuteMessage(message: CoordinatorMessage): message is CoordinatorMessage<TaskExecutePayload> {
  return message.type === MessageType.TASK_EXECUTE
}

export function isTaskCompleteMessage(message: CoordinatorMessage): message is CoordinatorMessage<TaskCompletePayload> {
  return message.type === MessageType.TASK_COMPLETE
}

export function isTabNavigateMessage(message: CoordinatorMessage): message is CoordinatorMessage<TabNavigatePayload> {
  return message.type === MessageType.TAB_NAVIGATE
}

// ============ Dashboard Messages ============

export function createDashboardStateRequestMessage(): CoordinatorMessage<DashboardStateRequestPayload> {
  return createMessage(MessageType.DASHBOARD_STATE_REQUEST, {})
}

export function createDashboardStateResponseMessage(payload: DashboardStateResponsePayload): CoordinatorMessage<DashboardStateResponsePayload> {
  return createMessage(MessageType.DASHBOARD_STATE_RESPONSE, payload)
}

export function createDashboardToggleBotMessage(enabled: boolean): CoordinatorMessage<{ enabled: boolean }> {
  return createMessage(MessageType.DASHBOARD_TOGGLE_BOT, { enabled })
}

export function isDashboardStateRequestMessage(message: CoordinatorMessage): message is CoordinatorMessage<DashboardStateRequestPayload> {
  return message.type === MessageType.DASHBOARD_STATE_REQUEST
}

export function isDashboardStateResponseMessage(message: CoordinatorMessage): message is CoordinatorMessage<DashboardStateResponsePayload> {
  return message.type === MessageType.DASHBOARD_STATE_RESPONSE
}

export function isDashboardToggleBotMessage(message: CoordinatorMessage): message is CoordinatorMessage<{ enabled: boolean }> {
  return message.type === MessageType.DASHBOARD_TOGGLE_BOT
}
