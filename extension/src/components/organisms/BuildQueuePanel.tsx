import { useState, useCallback, type CSSProperties, type DragEvent } from 'react'
import { Button } from '../atoms/Button'
import { Text } from '../atoms/Text'
import { Icon } from '../atoms/Icon'
import { useBuildQueueConfig } from '../../hooks'
import { BuildingNames, AvailableBuildings, BuildingMaxLevels } from '../../shared/buildings'
import type { BuildQueueItem, BuildQueuePreset } from '../../shared/types'

// Styles
const panelStyle: CSSProperties = {
  backgroundColor: '#1e1e1e',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1rem',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
}

const titleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
}

const controlsStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
}

const queueListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  maxHeight: '400px',
  overflowY: 'auto',
  marginBottom: '1rem',
}

const queueItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  backgroundColor: '#2a2a2a',
  borderRadius: '4px',
  padding: '0.5rem 0.75rem',
  cursor: 'grab',
  transition: 'background-color 0.2s',
}

const queueItemCompletedStyle: CSSProperties = {
  ...queueItemStyle,
  opacity: 0.5,
  textDecoration: 'line-through',
}

const queueItemCurrentStyle: CSSProperties = {
  ...queueItemStyle,
  backgroundColor: '#0d47a1',
  borderLeft: '3px solid #4caf50',
}

const queueItemDraggingStyle: CSSProperties = {
  ...queueItemStyle,
  opacity: 0.5,
  backgroundColor: '#3a3a3a',
}

const dragHandleStyle: CSSProperties = {
  cursor: 'grab',
  opacity: 0.5,
  padding: '0 0.25rem',
}

const itemInfoStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

const levelBadgeStyle: CSSProperties = {
  backgroundColor: '#3a3a3a',
  color: '#e0e0e0',
  padding: '0.125rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.75rem',
  fontWeight: 500,
}

const addFormStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  marginBottom: '1rem',
  flexWrap: 'wrap',
}

const selectStyle: CSSProperties = {
  backgroundColor: '#2a2a2a',
  color: '#e0e0e0',
  border: '1px solid #3a3a3a',
  borderRadius: '4px',
  padding: '0.5rem',
  fontSize: '0.875rem',
  flex: 1,
  minWidth: '150px',
}

const inputStyle: CSSProperties = {
  backgroundColor: '#2a2a2a',
  color: '#e0e0e0',
  border: '1px solid #3a3a3a',
  borderRadius: '4px',
  padding: '0.5rem',
  fontSize: '0.875rem',
  width: '60px',
}

const actionsRowStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
  marginBottom: '1rem',
}

const presetSectionStyle: CSSProperties = {
  marginTop: '1rem',
  paddingTop: '1rem',
  borderTop: '1px solid #3a3a3a',
}

const importExportStyle: CSSProperties = {
  marginTop: '1rem',
  paddingTop: '1rem',
  borderTop: '1px solid #3a3a3a',
}

const textareaStyle: CSSProperties = {
  backgroundColor: '#2a2a2a',
  color: '#e0e0e0',
  border: '1px solid #3a3a3a',
  borderRadius: '4px',
  padding: '0.5rem',
  fontSize: '0.75rem',
  width: '100%',
  minHeight: '60px',
  fontFamily: 'monospace',
  resize: 'vertical',
}

const thresholdRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '1rem',
}

const emptyQueueStyle: CSSProperties = {
  textAlign: 'center',
  padding: '2rem',
  color: '#666',
}

const progressStyle: CSSProperties = {
  marginBottom: '0.5rem',
  color: '#888',
  fontSize: '0.75rem',
}

export function BuildQueuePanel() {
  const {
    config,
    loading,
    saved,
    toggleEnabled,
    togglePaused,
    setResourceThreshold,
    addItem,
    removeItem,
    reorderItems,
    skipCurrentItem,
    clearQueue,
    resetProgress,
    loadPreset,
    importQueue,
    exportQueue,
    presets,
  } = useBuildQueueConfig()

  const [newBuilding, setNewBuilding] = useState<string>(AvailableBuildings[0] || 'main')
  const [newLevel, setNewLevel] = useState<number>(1)
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleAddItem = useCallback(() => {
    if (newBuilding && newLevel > 0) {
      addItem(newBuilding, newLevel)
    }
  }, [newBuilding, newLevel, addItem])

  const handleLoadPreset = useCallback((preset: BuildQueuePreset) => {
    if (confirm(`Load preset "${preset.name}"? This will replace your current queue.`)) {
      loadPreset(preset.id)
    }
  }, [loadPreset])

  const handleImport = useCallback(async () => {
    if (importText.trim()) {
      const success = await importQueue(importText)
      if (success) {
        setImportText('')
        setShowImport(false)
      } else {
        alert('Could not parse build order. Please check the format.')
      }
    }
  }, [importText, importQueue])

  const handleExport = useCallback(() => {
    const text = exportQueue()
    navigator.clipboard.writeText(text).then(() => {
      alert('Build order copied to clipboard!')
    })
  }, [exportQueue])

  const handleClearQueue = useCallback(() => {
    if (confirm('Clear entire build queue?')) {
      clearQueue()
    }
  }, [clearQueue])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, toIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      reorderItems(draggedIndex, toIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, reorderItems])

  if (loading) {
    return (
      <div style={panelStyle}>
        <Text variant="body" color="muted">Loading build queue configuration...</Text>
      </div>
    )
  }

  const currentIndex = config.queue.findIndex(item => !item.completed)
  const completedCount = config.queue.filter(item => item.completed).length

  const getItemStyle = (index: number, item: BuildQueueItem): CSSProperties => {
    if (draggedIndex === index) return queueItemDraggingStyle
    if (item.completed) return queueItemCompletedStyle
    if (index === currentIndex) return queueItemCurrentStyle
    if (dragOverIndex === index) return { ...queueItemStyle, borderTop: '2px solid #4caf50' }
    return queueItemStyle
  }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={titleRowStyle}>
          <Icon name="build" size={20} />
          <Text variant="heading">Auto Build Queue</Text>
          {saved && <Text variant="caption" color="success">Saved!</Text>}
        </div>
        <div style={controlsStyle}>
          <Button
            variant={config.enabled ? 'success' : 'secondary'}
            size="sm"
            onClick={toggleEnabled}
          >
            {config.enabled ? 'Enabled' : 'Disabled'}
          </Button>
          {config.enabled && (
            <Button
              variant={config.paused ? 'warning' : 'ghost'}
              size="sm"
              onClick={togglePaused}
            >
              <Icon name={config.paused ? 'play' : 'pause'} size={12} />
              {config.paused ? 'Resume' : 'Pause'}
            </Button>
          )}
        </div>
      </div>

      {/* Resource Threshold */}
      <div style={thresholdRowStyle}>
        <Text variant="caption">Resource reserve threshold:</Text>
        <input
          type="number"
          min={0}
          max={100}
          value={config.resourceThresholdPct}
          onChange={(e) => setResourceThreshold(parseInt(e.target.value) || 0)}
          style={{ ...inputStyle, width: '50px' }}
        />
        <Text variant="caption">%</Text>
        <Text variant="caption" color="muted">(keep this % of storage after building)</Text>
      </div>

      {/* Progress */}
      {config.queue.length > 0 && (
        <div style={progressStyle}>
          Progress: {completedCount} / {config.queue.length} items completed
        </div>
      )}

      {/* Queue List */}
      <div style={queueListStyle}>
        {config.queue.length === 0 ? (
          <div style={emptyQueueStyle}>
            <Icon name="build" size={32} />
            <Text variant="body" color="muted">No buildings in queue</Text>
            <Text variant="caption" color="muted">Add buildings below or load a preset</Text>
          </div>
        ) : (
          config.queue.map((item, index) => (
            <div
              key={item.id}
              style={getItemStyle(index, item)}
              draggable={!item.completed}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
            >
              <span style={dragHandleStyle}>
                <Icon name="drag" size={14} />
              </span>
              <div style={itemInfoStyle}>
                <Text variant="body">
                  {BuildingNames[item.building] || item.building}
                </Text>
                <span style={levelBadgeStyle}>Lvl {item.targetLevel}</span>
                {item.completed && <Icon name="check" size={14} />}
                {index === currentIndex && !item.completed && (
                  <Text variant="caption" color="success">Current</Text>
                )}
              </div>
              {!item.completed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  title="Remove from queue"
                >
                  <Icon name="delete" size={14} />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add New Item */}
      <div style={addFormStyle}>
        <select
          style={selectStyle}
          value={newBuilding}
          onChange={(e) => setNewBuilding(e.target.value)}
        >
          {AvailableBuildings.map((buildingId) => (
            <option key={buildingId} value={buildingId}>
              {BuildingNames[buildingId] || buildingId}
            </option>
          ))}
        </select>
        <Text variant="body">Level</Text>
        <input
          type="number"
          min={1}
          max={BuildingMaxLevels[newBuilding] || 30}
          value={newLevel}
          onChange={(e) => setNewLevel(parseInt(e.target.value) || 1)}
          style={inputStyle}
        />
        <Button variant="primary" size="sm" onClick={handleAddItem}>
          <Icon name="add" size={14} />
          Add
        </Button>
      </div>

      {/* Action Buttons */}
      <div style={actionsRowStyle}>
        {currentIndex >= 0 && (
          <Button variant="secondary" size="sm" onClick={skipCurrentItem}>
            <Icon name="skip" size={14} />
            Skip Current
          </Button>
        )}
        {completedCount > 0 && (
          <Button variant="secondary" size="sm" onClick={resetProgress}>
            <Icon name="refresh" size={14} />
            Reset Progress
          </Button>
        )}
        {config.queue.length > 0 && (
          <>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Icon name="export" size={14} />
              Export
            </Button>
            <Button variant="danger" size="sm" onClick={handleClearQueue}>
              <Icon name="clear" size={14} />
              Clear Queue
            </Button>
          </>
        )}
      </div>

      {/* Presets Section */}
      <div style={presetSectionStyle}>
        <Text variant="subheading" style={{ marginBottom: '0.5rem', display: 'block' }}>
          <Icon name="preset" size={14} /> Presets
        </Text>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {presets.map((preset) => (
            <Button
              key={preset.id}
              variant="ghost"
              size="sm"
              onClick={() => handleLoadPreset(preset)}
              title={preset.description}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Import/Export Section */}
      <div style={importExportStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <Text variant="subheading">
            <Icon name="import" size={14} /> Import Build Order
          </Text>
          <Button variant="ghost" size="sm" onClick={() => setShowImport(!showImport)}>
            {showImport ? 'Hide' : 'Show'}
          </Button>
        </div>
        {showImport && (
          <>
            <textarea
              style={textareaStyle}
              placeholder="Paste build order here (e.g., 'HQ 2, Farm 3, Barracks 1')"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleImport}
              disabled={!importText.trim()}
              style={{ marginTop: '0.5rem' }}
            >
              <Icon name="import" size={14} />
              Import
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
