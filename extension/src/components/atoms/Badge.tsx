import type { ReactNode, CSSProperties } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'info'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
  style?: CSSProperties
}

const variantStyles: Record<BadgeVariant, CSSProperties> = {
  default: { backgroundColor: '#3a3a3a', color: '#e0e0e0' },
  success: { backgroundColor: '#1b5e20', color: '#a5d6a7' },
  warning: { backgroundColor: '#e65100', color: '#ffcc80' },
  info: { backgroundColor: '#0d47a1', color: '#90caf9' },
}

const baseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.75rem',
  fontWeight: 500,
}

export function Badge({ children, variant = 'default', className = '', style }: BadgeProps) {
  return (
    <span className={className} style={{ ...baseStyle, ...variantStyles[variant], ...style }}>
      {children}
    </span>
  )
}
