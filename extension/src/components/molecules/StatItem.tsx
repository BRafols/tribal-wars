import type { CSSProperties } from 'react'
import { Icon, Text, type IconName } from '../atoms'

interface StatItemProps {
  icon: IconName
  label: string
  value: string | number
  suffix?: string
  className?: string
}

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem',
  backgroundColor: '#2a2a2a',
  borderRadius: '4px',
}

const valueContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
  flex: 1,
}

export function StatItem({ icon, label, value, suffix, className = '' }: StatItemProps) {
  const displayValue = suffix ? `${value} ${suffix}` : String(value)

  return (
    <div className={className} style={containerStyle}>
      <Icon name={icon} size={20} />
      <div style={valueContainerStyle}>
        <Text variant="caption" color="muted">{label}</Text>
        <Text variant="body" bold>{displayValue}</Text>
      </div>
    </div>
  )
}

// Re-export IconName for convenience
export type { IconName }
