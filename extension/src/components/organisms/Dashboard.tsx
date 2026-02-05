import type { CSSProperties } from 'react'
import { Text, Icon } from '../atoms'
import { DashboardHeader } from './DashboardHeader'
import { AutomationStatusSection } from './AutomationStatusSection'
import { TaskQueueSection } from './TaskQueueSection'
import { ActionLogSection } from './ActionLogSection'
import { ActiveTabsSection } from './ActiveTabsSection'
import { useDashboardState } from '../../hooks'

const containerStyle: CSSProperties = {
  minWidth: '320px',
  backgroundColor: '#121212',
  color: '#e0e0e0',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  minHeight: '100vh',
}

const contentStyle: CSSProperties = {
  paddingBottom: '1rem',
}

const loadingStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3rem',
  gap: '1rem',
}

const errorStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  gap: '0.75rem',
  backgroundColor: '#1e1e1e',
  borderRadius: '6px',
  margin: '0.5rem',
}

const footerStyle: CSSProperties = {
  padding: '0.5rem 1rem',
  borderTop: '1px solid #2a2a2a',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#1a1a1a',
}

export function Dashboard() {
  const {
    isRunning,
    connectionStatus,
    currentWorld,
    currentVillage,
    automationStatus,
    taskQueue,
    actionLog,
    tabs,
    lastUpdated,
    loading,
    error,
    toggleBot,
    // refresh - available for future use (manual refresh button)
  } = useDashboardState()

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingStyle}>
          <Icon name="refresh" size={24} />
          <Text variant="body" color="muted">Loading dashboard...</Text>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <DashboardHeader
        isRunning={isRunning}
        connectionStatus={connectionStatus}
        currentWorld={currentWorld}
        currentVillage={currentVillage}
        onToggleBot={toggleBot}
      />

      {error && (
        <div style={errorStyle}>
          <Icon name="error" size={20} />
          <Text variant="caption" color="error">{error}</Text>
        </div>
      )}

      <main style={contentStyle}>
        <AutomationStatusSection automationStatus={automationStatus} />
        <TaskQueueSection tasks={taskQueue} maxVisible={5} />
        <ActionLogSection entries={actionLog} maxVisible={20} />
        <ActiveTabsSection tabs={tabs} />
      </main>

      <footer style={footerStyle}>
        <Text variant="caption" color="muted">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </Text>
        <Text variant="caption" color="muted">v0.2.0</Text>
      </footer>
    </div>
  )
}
