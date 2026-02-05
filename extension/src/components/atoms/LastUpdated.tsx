import { useState, useEffect, useId, type CSSProperties } from 'react'
import { getTicker } from '../../core'

interface LastUpdatedProps {
  timestamp: number | null
  className?: string
}

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  fontSize: '0.7rem',
  color: '#666',
}

function getDotColor(ms: number): string {
  if (ms < 50) return '#4caf50'    // green
  if (ms < 200) return '#ff9800'   // orange
  return '#f44336'                  // red
}

const dotStyle = (ms: number): CSSProperties => ({
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: getDotColor(ms),
  transition: 'background-color 0.3s',
})

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export function LastUpdated({ timestamp, className = '' }: LastUpdatedProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const tickerId = useId()

  // Update display using the popup ticker (every frame)
  useEffect(() => {
    const ticker = getTicker('popup')
    ticker.register(`lastUpdated-${tickerId}`, () => setCurrentTime(Date.now()), 0, { priority: 100 })

    if (!ticker.isRunning()) {
      ticker.start()
    }

    return () => {
      ticker.unregister(`lastUpdated-${tickerId}`)
    }
  }, [tickerId])

  if (!timestamp) {
    return (
      <div className={className} style={containerStyle}>
        <span style={dotStyle(999)} />
        <span>waiting for data...</span>
      </div>
    )
  }

  const msAgo = currentTime - timestamp

  return (
    <div className={className} style={containerStyle}>
      <span style={dotStyle(msAgo)} />
      <span>{msAgo < 1000 ? `${msAgo}ms` : formatTimeAgo(timestamp)}</span>
    </div>
  )
}
