import { useState, type CSSProperties } from 'react'
import { Text, Badge, Icon, Button } from '../atoms'
import type { ScheduledTask } from '../../shared/types'
import { formatTimeRemaining } from '../../utils/formatters'

interface TaskQueueSectionProps {
  tasks: ScheduledTask[]
  maxVisible?: number
}

const sectionStyle: CSSProperties = {
  padding: '0.5rem',
}

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '0.5rem',
  paddingLeft: '0.25rem',
}

const cardStyle: CSSProperties = {
  backgroundColor: '#1e1e1e',
  borderRadius: '6px',
  padding: '0.5rem',
}

const taskRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto auto auto',
  gap: '0.5rem',
  alignItems: 'center',
  padding: '0.375rem 0.5rem',
  borderBottom: '1px solid #2a2a2a',
}

const lastTaskRowStyle: CSSProperties = {
  ...taskRowStyle,
  borderBottom: 'none',
}

const taskTypeStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
}

const emptyStateStyle: CSSProperties = {
  padding: '1rem',
  textAlign: 'center',
}

const expandButtonStyle: CSSProperties = {
  width: '100%',
  marginTop: '0.25rem',
}

// Map task types to icons and labels
const taskTypeConfig: Record<string, { icon: 'scavenge' | 'farm' | 'build' | 'recruit'; label: string }> = {
  'scavenge:start': { icon: 'scavenge', label: 'Start Scavenge' },
  'scavenge:check': { icon: 'scavenge', label: 'Check Scavenge' },
  'farm:attack': { icon: 'farm', label: 'Farm Attack' },
  'farm:check': { icon: 'farm', label: 'Check Farm' },
  'build:queue': { icon: 'build', label: 'Queue Build' },
  'build:check': { icon: 'build', label: 'Check Build' },
  'recruit:queue': { icon: 'recruit', label: 'Queue Recruit' },
  'recruit:check': { icon: 'recruit', label: 'Check Recruit' },
}

// Map priority to badge variant
const priorityConfig: Record<number, { variant: 'default' | 'success' | 'warning' | 'info'; label: string }> = {
  1: { variant: 'warning', label: 'High' },
  5: { variant: 'default', label: 'Normal' },
  10: { variant: 'info', label: 'Low' },
}

export function TaskQueueSection({ tasks, maxVisible = 5 }: TaskQueueSectionProps) {
  const [expanded, setExpanded] = useState(false)

  const visibleTasks = expanded ? tasks : tasks.slice(0, maxVisible)
  const hasMoreTasks = tasks.length > maxVisible

  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <Text variant="label" color="muted">Next Actions</Text>
        <Badge variant="default">{tasks.length} queued</Badge>
      </div>

      <div style={cardStyle}>
        {tasks.length === 0 ? (
          <div style={emptyStateStyle}>
            <Icon name="clock" size={24} />
            <Text variant="caption" color="muted" style={{ display: 'block', marginTop: '0.5rem' }}>
              No tasks scheduled
            </Text>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div style={{ ...taskRowStyle, borderBottom: '1px solid #3a3a3a', paddingBottom: '0.5rem' }}>
              <Text variant="caption" color="muted">Type</Text>
              <Text variant="caption" color="muted">Target</Text>
              <Text variant="caption" color="muted">Scheduled</Text>
              <Text variant="caption" color="muted">Priority</Text>
            </div>

            {/* Task rows */}
            {visibleTasks.map((task, index) => {
              const config = taskTypeConfig[task.type] || { icon: 'clock', label: task.type }
              const priority = priorityConfig[task.priority] || { variant: 'default', label: String(task.priority) }
              const isLast = index === visibleTasks.length - 1

              return (
                <div key={task.id} style={isLast ? lastTaskRowStyle : taskRowStyle}>
                  <div style={taskTypeStyle}>
                    <Icon name={config.icon} size={12} />
                    <Text variant="caption">{config.label}</Text>
                  </div>
                  <Text variant="caption" color="secondary">
                    {task.payload?.tier ? `Tier ${task.payload.tier}` : '-'}
                  </Text>
                  <Text variant="caption" color="success">
                    {formatTimeRemaining(task.scheduledTime)}
                  </Text>
                  <Badge variant={priority.variant}>{priority.label}</Badge>
                </div>
              )
            })}

            {/* Expand/Collapse button */}
            {hasMoreTasks && (
              <Button
                variant="ghost"
                size="sm"
                style={expandButtonStyle}
                onClick={() => setExpanded(!expanded)}
              >
                <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={12} />
                {expanded ? 'Show less' : `Show ${tasks.length - maxVisible} more`}
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
