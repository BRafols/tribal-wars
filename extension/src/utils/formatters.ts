// Utility functions for formatting time and dates

/**
 * Format time remaining until a timestamp
 */
export function formatTimeRemaining(timestamp: number | null): string {
  if (!timestamp) return '-'
  const now = Date.now()
  const diff = timestamp - now
  if (diff <= 0) return 'Now'

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

/**
 * Format a timestamp as time (HH:MM:SS)
 */
export function formatTime(timestamp: number | null): string {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/**
 * Format a timestamp for log entries (HH:MM:SS in 24h format)
 */
export function formatLogTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
