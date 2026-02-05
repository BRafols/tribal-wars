import type { CSSProperties } from 'react'
import { Text } from '../atoms'
import { AutomationStatusCard } from './AutomationStatusCard'
import { formatTimeRemaining, formatTime } from '../../utils/formatters'
import type { AutomationStatus } from '../../shared/types'

interface AutomationStatusSectionProps {
  automationStatus: AutomationStatus
}

const sectionStyle: CSSProperties = {
  padding: '0.5rem',
}

const sectionTitleStyle: CSSProperties = {
  marginBottom: '0.5rem',
  paddingLeft: '0.25rem',
}

export function AutomationStatusSection({ automationStatus }: AutomationStatusSectionProps) {
  const { scavenging, farming, building, recruiting } = automationStatus

  return (
    <section style={sectionStyle}>
      <div style={sectionTitleStyle}>
        <Text variant="label" color="muted">Automation Status</Text>
      </div>

      <AutomationStatusCard
        type="scavenging"
        status={scavenging.status}
        fields={[
          { label: 'Active Tiers', value: scavenging.activeTiers.length > 0 ? scavenging.activeTiers.join(', ') : 'None' },
          { label: 'Next Complete', value: formatTimeRemaining(scavenging.nextCompletionTime), highlight: scavenging.nextCompletionTime !== null },
          { label: 'Last Started', value: formatTime(scavenging.lastStarted) },
        ]}
      />

      <AutomationStatusCard
        type="farming"
        status={farming.status}
        fields={[
          { label: 'Targets', value: farming.targetsAvailable },
          { label: 'Scheduled', value: farming.scheduledAttacks > 0 ? `${farming.scheduledAttacks} pending` : 'None' },
          { label: 'Next Arrival', value: formatTimeRemaining(farming.nextScheduledArrival), highlight: farming.nextScheduledArrival !== null },
          { label: 'Today', value: `${farming.attacksToday} attacks` },
        ]}
      />

      <AutomationStatusCard
        type="building"
        status={building.status}
        fields={[
          { label: 'Queue', value: `${building.queueSlotsUsed}/${building.queueSlotsMax}` },
          { label: 'Next Complete', value: formatTimeRemaining(building.nextCompletion), highlight: building.nextCompletion !== null },
          { label: 'Last Queued', value: building.lastQueuedBuilding || '-' },
        ]}
      />

      <AutomationStatusCard
        type="recruiting"
        status={recruiting.status}
        fields={[
          { label: 'Barracks', value: recruiting.barracksQueue },
          { label: 'Stable', value: recruiting.stableQueue },
          { label: 'Workshop', value: recruiting.workshopQueue },
          { label: 'Last Action', value: formatTime(recruiting.lastRecruitAction) },
        ]}
      />
    </section>
  )
}
