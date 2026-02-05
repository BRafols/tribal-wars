import type { CSSProperties } from 'react'
import { Text, Badge, Icon, Button } from '../atoms'

interface DashboardHeaderProps {
  isRunning: boolean
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
  currentWorld: string | null
  currentVillage: { id: number; name: string } | null
  onToggleBot: (enabled: boolean) => void
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.75rem 1rem',
  backgroundColor: '#1a1a1a',
  borderBottom: '1px solid #2a2a2a',
}

const leftSectionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
}

const titleContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
}

const statusRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

const rightSectionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

export function DashboardHeader({
  isRunning,
  connectionStatus,
  currentWorld,
  currentVillage,
  onToggleBot,
}: DashboardHeaderProps) {
  const statusIcon = connectionStatus === 'connected' ? 'connected' : 'disconnected'
  const statusColor = connectionStatus === 'connected' ? 'success' : 'muted'

  return (
    <header style={headerStyle}>
      <div style={leftSectionStyle}>
        <div style={titleContainerStyle}>
          <Text variant="subtitle" bold>Tribal Wars Bot</Text>
          <div style={statusRowStyle}>
            <Icon name={statusIcon} size={10} />
            <Text variant="caption" color={statusColor}>
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </Text>
            {currentWorld && (
              <>
                <Text variant="caption" color="muted">|</Text>
                <Badge variant="info">{currentWorld}</Badge>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={rightSectionStyle}>
        {currentVillage && (
          <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
            <Text variant="caption" color="muted">{currentVillage.name}</Text>
          </div>
        )}
        <Button
          variant={isRunning ? 'danger' : 'success'}
          size="sm"
          onClick={() => onToggleBot(!isRunning)}
          disabled={connectionStatus !== 'connected'}
        >
          <Icon name={isRunning ? 'pause' : 'play'} size={12} />
          {isRunning ? 'Stop' : 'Start'}
        </Button>
      </div>
    </header>
  )
}
