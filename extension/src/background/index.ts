// Background service worker for Tribal Wars Bot
// Handles alarms, messaging, and orchestration

console.log('Tribal Wars Bot background service worker started')

// Message types
interface GameEvent {
  type: string
  payload: unknown
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message: GameEvent, sender, sendResponse) => {
  console.log('Background received message:', message, 'from tab:', sender.tab?.id)

  // Handle different message types
  switch (message.type) {
    case 'GAME_READY':
      console.log('Game is ready on tab:', sender.tab?.id)
      break
    case 'GAME_EVENT':
      console.log('Game event:', message.payload)
      break
    default:
      console.log('Unknown message type:', message.type)
  }

  sendResponse({ received: true })
  return true
})

// Set up alarms for periodic tasks
chrome.alarms.create('checkQueue', { periodInMinutes: 1 })

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name)

  if (alarm.name === 'checkQueue') {
    // TODO: Check building queue status
  }
})

export {}
