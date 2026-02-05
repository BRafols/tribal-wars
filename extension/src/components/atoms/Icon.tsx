import type { CSSProperties } from 'react'

export type IconName = 'wood' | 'clay' | 'iron' | 'population' | 'storage' | 'rank' | 'points' | 'village' | 'user' | 'world' | 'connected' | 'disconnected'

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

// Simple emoji-based icons for now, can be replaced with SVGs later
const iconMap: Record<IconName, string> = {
  wood: '\u{1F332}',      // Tree
  clay: '\u{1F9F1}',      // Brick
  iron: '\u{26CF}',       // Pick
  population: '\u{1F465}', // People
  storage: '\u{1F4E6}',   // Box
  rank: '\u{1F3C6}',      // Trophy
  points: '\u{2B50}',     // Star
  village: '\u{1F3E0}',   // House
  user: '\u{1F464}',      // Person
  world: '\u{1F30D}',     // Globe
  connected: '\u{1F7E2}', // Green circle
  disconnected: '\u{1F534}', // Red circle
}

export function Icon({ name, size = 16, className = '' }: IconProps) {
  const style: CSSProperties = {
    fontSize: `${size}px`,
    lineHeight: 1,
    display: 'inline-block',
  }

  return (
    <span className={className} style={style} role="img" aria-label={name}>
      {iconMap[name]}
    </span>
  )
}
