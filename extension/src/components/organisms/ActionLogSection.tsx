import { useState, type CSSProperties } from 'react'
import { Text, Badge, Icon, Button } from '../atoms'
import type { IconName } from '../atoms'
import type { ActionLogEntry, ActionLogLevel } from '../../shared/types'
import { formatLogTime } from '../../utils/formatters'

interface ActionLogSectionProps {
  entries: ActionLogEntry[]
  maxVisible?: number
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
}

const filterContainerStyle: CSSProperties = {
  display: 'flex',
  gap: '0.25rem',
}

const cardStyle: CSSProperties = {
  backgroundColor: '#1e1e1e',
  borderRadius: '6px',
  padding: '0.5rem',
  maxHeight: '300px',
  overflowY: 'auto',
}

const entryStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.5rem',
  padding: '0.375rem 0.25rem',
  borderBottom: '1px solid #2a2a2a',
}

const lastEntryStyle: CSSProperties = {
  ...entryStyle,
  borderBottom: 'none',
}

const timestampStyle: CSSProperties = {
  flexShrink: 0,
  fontFamily: 'monospace',
}

const messageStyle: CSSProperties = {
  flex: 1,
  wordBreak: 'break-word',
}

const emptyStateStyle: CSSProperties = {
  padding: '1rem',
  textAlign: 'center',
}

// Map log levels to icons and colors
const levelConfig: Record<ActionLogLevel, { icon: IconName; color: 'success' | 'error' | 'muted' | 'warning' }> = {
  success: { icon: 'check', color: 'success' },
  error: { icon: 'error', color: 'error' },
  info: { icon: 'info', color: 'muted' },
  warning: { icon: 'warning', color: 'warning' },
}

// Filter types for the log
type FilterType = 'all' | 'scavenge' | 'farm' | 'build' | 'recruit' | 'system'

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'scavenge', label: 'Scav' },
  { value: 'farm', label: 'Farm' },
  { value: 'build', label: 'Build' },
  { value: 'recruit', label: 'Recr' },
  { value: 'system', label: 'Sys' },
]

export function ActionLogSection({ entries, maxVisible = 20 }: ActionLogSectionProps) {
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredEntries = entries.filter(entry => {
    if (filter === 'all') return true
    return entry.type === filter
  })

  const visibleEntries = filteredEntries.slice(0, maxVisible)

  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <Text variant="label" color="muted">Activity Log</Text>
        <div style={filterContainerStyle}>
          {filterOptions.map(option => (
            <Button
              key={option.value}
              variant={filter === option.value ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(option.value)}
              style={{ padding: '0.125rem 0.375rem', fontSize: '0.625rem' }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        {visibleEntries.length === 0 ? (
          <div style={emptyStateStyle}>
            <Icon name="info" size={24} />
            <Text variant="caption" color="muted" style={{ display: 'block', marginTop: '0.5rem' }}>
              {filter === 'all' ? 'No activity yet' : `No ${filter} activity`}
            </Text>
          </div>
        ) : (
          visibleEntries.map((entry, index) => {
            const config = levelConfig[entry.level]
            const isLast = index === visibleEntries.length - 1

            return (
              <div key={entry.id} style={isLast ? lastEntryStyle : entryStyle}>
                <Text variant="caption" color="muted" style={timestampStyle}>
                  [{formatLogTime(entry.timestamp)}]
                </Text>
                <Icon name={config.icon} size={12} />
                <Text variant="caption" color={config.color} style={messageStyle}>
                  {entry.message}
                </Text>
                {entry.villageId && (
                  <Badge variant="info" style={{ flexShrink: 0 }}>
                    V{entry.villageId}
                  </Badge>
                )}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
