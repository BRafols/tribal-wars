import type { CSSProperties } from 'react'
import { Icon, Text, type IconName } from '../atoms'

interface InfoRowProps {
  icon: IconName
  label: string
  value: string | number
  className?: string
}

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.375rem 0',
}

const labelStyle: CSSProperties = {
  flex: 1,
}

export function InfoRow({ icon, label, value, className = '' }: InfoRowProps) {
  return (
    <div className={className} style={containerStyle}>
      <Icon name={icon} size={16} />
      <Text variant="body" color="secondary" style={labelStyle}>{label}</Text>
      <Text variant="body" bold>{value}</Text>
    </div>
  )
}
