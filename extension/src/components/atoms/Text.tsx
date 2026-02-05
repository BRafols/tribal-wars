import type { ReactNode, CSSProperties } from 'react'

type TextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'label'
type TextColor = 'primary' | 'secondary' | 'muted' | 'success' | 'warning' | 'error'

interface TextProps {
  children: ReactNode
  variant?: TextVariant
  color?: TextColor
  bold?: boolean
  className?: string
  style?: CSSProperties
}

const variantStyles: Record<TextVariant, CSSProperties> = {
  title: { fontSize: '1.25rem', fontWeight: 600, margin: 0 },
  subtitle: { fontSize: '1rem', fontWeight: 500, margin: 0 },
  body: { fontSize: '0.875rem', fontWeight: 400, margin: 0 },
  caption: { fontSize: '0.75rem', fontWeight: 400, margin: 0 },
  label: { fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
}

const colorStyles: Record<TextColor, string> = {
  primary: '#e0e0e0',
  secondary: '#b0b0b0',
  muted: '#808080',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
}

export function Text({
  children,
  variant = 'body',
  color = 'primary',
  bold = false,
  className = '',
  style = {}
}: TextProps) {
  const combinedStyle: CSSProperties = {
    ...variantStyles[variant],
    color: colorStyles[color],
    ...(bold && { fontWeight: 600 }),
    ...style,
  }

  return (
    <span className={className} style={combinedStyle}>
      {children}
    </span>
  )
}
