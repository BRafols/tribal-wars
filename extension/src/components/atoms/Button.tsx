import type { ReactNode, CSSProperties, ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    backgroundColor: '#0d47a1',
    color: '#fff',
    border: 'none',
  },
  secondary: {
    backgroundColor: '#3a3a3a',
    color: '#e0e0e0',
    border: 'none',
  },
  success: {
    backgroundColor: '#1b5e20',
    color: '#fff',
    border: 'none',
  },
  danger: {
    backgroundColor: '#b71c1c',
    color: '#fff',
    border: 'none',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#e0e0e0',
    border: '1px solid #3a3a3a',
  },
}

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: {
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
  },
  md: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
  },
  lg: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
  },
}

const baseStyle: CSSProperties = {
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  fontWeight: 500,
  transition: 'opacity 0.2s',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const combinedStyle: CSSProperties = {
    ...baseStyle,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(disabled && { opacity: 0.5, cursor: 'not-allowed' }),
    ...style,
  }

  return (
    <button style={combinedStyle} disabled={disabled} {...props}>
      {children}
    </button>
  )
}
