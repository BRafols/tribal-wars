import type { CSSProperties } from 'react'
import { Text, Badge, Icon } from '../atoms'
import type { IconName } from '../atoms'

type AutomationType = 'scavenging' | 'farming' | 'building' | 'recruiting'
type StatusType = 'running' | 'idle' | 'disabled'

interface StatusField {
  label: string
  value: string | number
  highlight?: boolean
}

interface AutomationStatusCardProps {
  type: AutomationType
  status: StatusType
  fields: StatusField[]
}

const typeConfig: Record<AutomationType, { icon: IconName; label: string }> = {
  scavenging: { icon: 'scavenge', label: 'Scavenging' },
  farming: { icon: 'farm', label: 'Farming' },
  building: { icon: 'build', label: 'Building' },
  recruiting: { icon: 'recruit', label: 'Recruiting' },
}

const statusVariants: Record<StatusType, 'success' | 'default' | 'warning'> = {
  running: 'success',
  idle: 'default',
  disabled: 'warning',
}

const cardStyle: CSSProperties = {
  backgroundColor: '#1e1e1e',
  borderRadius: '6px',
  padding: '0.75rem',
  marginBottom: '0.5rem',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '0.5rem',
}

const titleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

const fieldsContainerStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.25rem 0.75rem',
}

const fieldStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

export function AutomationStatusCard({ type, status, fields }: AutomationStatusCardProps) {
  const config = typeConfig[type]
  const statusVariant = statusVariants[status]

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>
          <Icon name={config.icon} size={14} />
          <Text variant="body" bold>{config.label}</Text>
        </div>
        <Badge variant={statusVariant}>{status}</Badge>
      </div>
      <div style={fieldsContainerStyle}>
        {fields.map((field, index) => (
          <div key={index} style={fieldStyle}>
            <Text variant="caption" color="muted">{field.label}</Text>
            <Text variant="caption" color={field.highlight ? 'success' : 'secondary'}>
              {field.value}
            </Text>
          </div>
        ))}
      </div>
    </div>
  )
}
