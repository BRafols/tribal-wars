import type { CSSProperties } from 'react'
import { Icon, Text, type IconName } from '../atoms'

interface ResourceBarProps {
  icon: IconName
  current: number
  max?: number
  production?: number
  className?: string
}

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.25rem 0',
}

const valueContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '0.25rem',
  flex: 1,
}

const productionStyle: CSSProperties = {
  marginLeft: 'auto',
}

export function ResourceBar({ icon, current, max, production, className = '' }: ResourceBarProps) {
  const formattedCurrent = current.toLocaleString()
  const formattedMax = max?.toLocaleString()

  return (
    <div className={className} style={containerStyle}>
      <Icon name={icon} size={16} />
      <div style={valueContainerStyle}>
        <Text variant="body" bold>{formattedCurrent}</Text>
        {max !== undefined && (
          <Text variant="caption" color="muted">/ {formattedMax}</Text>
        )}
      </div>
      {production !== undefined && (
        <Text variant="caption" color="success" style={productionStyle}>
          +{production}/h
        </Text>
      )}
    </div>
  )
}
