import type { CSSProperties } from 'react'
import { Text, Badge, Icon, LastUpdated } from '../atoms'
import { InfoRow, ResourceBar } from '../molecules'
import type { WorldInfo } from '../../types/game'

interface WorldInfoCardProps {
  worldInfo: WorldInfo | null
  isConnected: boolean
  lastUpdated: number | null
  className?: string
}

const cardStyle: CSSProperties = {
  backgroundColor: '#1e1e1e',
  borderRadius: '8px',
  padding: '1rem',
  minWidth: '280px',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid #3a3a3a',
}

const userInfoStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

const sectionStyle: CSSProperties = {
  marginBottom: '1rem',
}

const sectionTitleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '0.5rem',
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.5rem',
}

const disconnectedStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  gap: '0.75rem',
}

const footerStyle: CSSProperties = {
  marginTop: '1rem',
  paddingTop: '0.75rem',
  borderTop: '1px solid #3a3a3a',
  display: 'flex',
  justifyContent: 'flex-end',
}

export function WorldInfoCard({ worldInfo, isConnected, lastUpdated, className = '' }: WorldInfoCardProps) {
  if (!isConnected || !worldInfo) {
    return (
      <div className={className} style={cardStyle}>
        <div style={disconnectedStyle}>
          <Icon name="disconnected" size={32} />
          <Text variant="subtitle" color="muted">Not Connected</Text>
          <Text variant="caption" color="muted">
            Open a Tribal Wars game tab to see your world info
          </Text>
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={cardStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={userInfoStyle}>
          <Icon name="connected" size={12} />
          <Text variant="title">{worldInfo.username}</Text>
        </div>
        <Badge variant="info">{worldInfo.world}</Badge>
      </div>

      {/* Player Stats */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Text variant="label" color="muted">Player Stats</Text>
        </div>
        <div style={gridStyle}>
          <InfoRow icon="points" label="Points" value={worldInfo.points.toLocaleString()} />
          <InfoRow icon="rank" label="Rank" value={`#${worldInfo.rank.toLocaleString()}`} />
        </div>
      </div>

      {/* Village Info */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Text variant="label" color="muted">Current Village</Text>
        </div>
        <InfoRow icon="village" label={worldInfo.villageName} value={worldInfo.villageCoords} />
      </div>

      {/* Resources */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Text variant="label" color="muted">Resources</Text>
        </div>
        <ResourceBar
          icon="wood"
          current={worldInfo.resources.wood}
          max={worldInfo.resources.storage}
          production={worldInfo.production.wood}
        />
        <ResourceBar
          icon="clay"
          current={worldInfo.resources.clay}
          max={worldInfo.resources.storage}
          production={worldInfo.production.clay}
        />
        <ResourceBar
          icon="iron"
          current={worldInfo.resources.iron}
          max={worldInfo.resources.storage}
          production={worldInfo.production.iron}
        />
      </div>

      {/* Population */}
      <div>
        <div style={sectionTitleStyle}>
          <Text variant="label" color="muted">Population</Text>
        </div>
        <ResourceBar
          icon="population"
          current={worldInfo.population.current}
          max={worldInfo.population.max}
        />
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <LastUpdated timestamp={lastUpdated} />
      </div>
    </div>
  )
}
