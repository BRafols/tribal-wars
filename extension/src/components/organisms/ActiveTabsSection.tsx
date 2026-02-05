import { useState, type CSSProperties } from 'react'
import { Text, Badge, Icon } from '../atoms'
import type { TabInfo } from '../../shared/types'

interface ActiveTabsSectionProps {
  tabs: TabInfo[]
}

const sectionStyle: CSSProperties = {
  padding: '0.5rem',
}

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '0.5rem',
  paddingLeft: '0.25rem',
  cursor: 'pointer',
}

const cardStyle: CSSProperties = {
  backgroundColor: '#1e1e1e',
  borderRadius: '6px',
  padding: '0.5rem',
}

const tableHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '3rem 1fr auto auto',
  gap: '0.5rem',
  alignItems: 'center',
  padding: '0.375rem 0.5rem',
  borderBottom: '1px solid #3a3a3a',
  marginBottom: '0.25rem',
}

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '3rem 1fr auto auto',
  gap: '0.5rem',
  alignItems: 'center',
  padding: '0.375rem 0.5rem',
  borderBottom: '1px solid #2a2a2a',
}

const lastRowStyle: CSSProperties = {
  ...rowStyle,
  borderBottom: 'none',
}

const emptyStateStyle: CSSProperties = {
  padding: '1rem',
  textAlign: 'center',
}

// Map roles to display names
const roleLabels: Record<string, string> = {
  scavenge: 'Scavenging',
  farm: 'Farm Asst.',
  recruit: 'Training',
  build: 'Headquarters',
  overview: 'Overview',
}

// Calculate heartbeat status
function getHeartbeatStatus(lastHeartbeat: number): { text: string; healthy: boolean } {
  const now = Date.now()
  const diff = now - lastHeartbeat
  const seconds = Math.floor(diff / 1000)

  if (seconds < 10) {
    return { text: `${seconds}s ago`, healthy: true }
  } else if (seconds < 30) {
    return { text: `${seconds}s ago`, healthy: true }
  } else if (seconds < 60) {
    return { text: `${seconds}s ago`, healthy: false }
  } else {
    const minutes = Math.floor(seconds / 60)
    return { text: `${minutes}m ago`, healthy: false }
  }
}

export function ActiveTabsSection({ tabs }: ActiveTabsSectionProps) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <section style={sectionStyle}>
      <div
        style={sectionHeaderStyle}
        onClick={() => setCollapsed(!collapsed)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setCollapsed(!collapsed)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={10} />
          <Text variant="label" color="muted">Active Tabs</Text>
        </div>
        <Badge variant="default">{tabs.length} registered</Badge>
      </div>

      {!collapsed && (
        <div style={cardStyle}>
          {tabs.length === 0 ? (
            <div style={emptyStateStyle}>
              <Icon name="tab" size={24} />
              <Text variant="caption" color="muted" style={{ display: 'block', marginTop: '0.5rem' }}>
                No tabs registered
              </Text>
            </div>
          ) : (
            <>
              {/* Header row */}
              <div style={tableHeaderStyle}>
                <Text variant="caption" color="muted">Tab</Text>
                <Text variant="caption" color="muted">Screen</Text>
                <Text variant="caption" color="muted">Village</Text>
                <Text variant="caption" color="muted">Heartbeat</Text>
              </div>

              {/* Tab rows */}
              {tabs.map((tab, index) => {
                const heartbeat = getHeartbeatStatus(tab.lastHeartbeat)
                const isLast = index === tabs.length - 1

                return (
                  <div key={tab.tabId} style={isLast ? lastRowStyle : rowStyle}>
                    <Text variant="caption" color="secondary">#{tab.tabId}</Text>
                    <Text variant="caption">
                      {tab.role ? roleLabels[tab.role] || tab.role : 'Unknown'}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {tab.villageId ? `V${tab.villageId}` : '-'}
                    </Text>
                    <Text variant="caption" color={heartbeat.healthy ? 'success' : 'warning'}>
                      {heartbeat.text}
                    </Text>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </section>
  )
}
