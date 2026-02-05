import type { CSSProperties } from 'react'

export type IconName =
  | 'wood' | 'clay' | 'iron' | 'population' | 'storage' | 'rank' | 'points' | 'village' | 'user' | 'world'
  | 'connected' | 'disconnected'
  | 'scavenge' | 'farm' | 'build' | 'recruit' | 'tab' | 'clock' | 'play' | 'pause' | 'check' | 'error' | 'info' | 'warning'
  | 'refresh' | 'settings' | 'chevron-down' | 'chevron-up'
  | 'drag' | 'delete' | 'skip' | 'add' | 'import' | 'export' | 'clear' | 'preset'

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

// Simple emoji-based icons for now, can be replaced with SVGs later
const iconMap: Record<IconName, string> = {
  wood: '\u{1F332}',        // Tree
  clay: '\u{1F9F1}',        // Brick
  iron: '\u{26CF}',         // Pick
  population: '\u{1F465}',  // People
  storage: '\u{1F4E6}',     // Box
  rank: '\u{1F3C6}',        // Trophy
  points: '\u{2B50}',       // Star
  village: '\u{1F3E0}',     // House
  user: '\u{1F464}',        // Person
  world: '\u{1F30D}',       // Globe
  connected: '\u{1F7E2}',   // Green circle
  disconnected: '\u{1F534}', // Red circle
  scavenge: '\u{2692}',     // Hammer and pick (for scavenging)
  farm: '\u{2694}',         // Crossed swords (for farming/attacking)
  build: '\u{1F3D7}',       // Building construction
  recruit: '\u{1F6E1}',     // Shield (for recruiting)
  tab: '\u{1F4C4}',         // Document (for tabs)
  clock: '\u{23F1}',        // Stopwatch
  play: '\u{25B6}',         // Play triangle
  pause: '\u{23F8}',        // Pause
  check: '\u{2705}',        // Check mark
  error: '\u{274C}',        // X mark
  info: '\u{2139}',         // Info
  warning: '\u{26A0}',      // Warning
  refresh: '\u{1F504}',     // Refresh
  settings: '\u{2699}',     // Gear
  'chevron-down': '\u{25BC}', // Down chevron
  'chevron-up': '\u{25B2}',   // Up chevron
  'drag': '\u{2630}',         // Hamburger menu (drag handle)
  'delete': '\u{1F5D1}',      // Trash can
  'skip': '\u{23ED}',         // Skip forward
  'add': '\u{2795}',          // Plus sign
  'import': '\u{1F4E5}',      // Inbox tray
  'export': '\u{1F4E4}',      // Outbox tray
  'clear': '\u{1F6AE}',       // Clear/empty
  'preset': '\u{1F4CB}',      // Clipboard/preset
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
