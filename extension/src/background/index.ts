// Background service worker for Tribal Wars Bot
// Handles multi-tab coordination and task scheduling

import { getTabCoordinator } from './TabCoordinator'

console.log('Tribal Wars Bot background service worker started')

// Initialize the tab coordinator
const coordinator = getTabCoordinator()
coordinator.init().then(() => {
  console.log('TabCoordinator initialized, status:', coordinator.getStatus())
})

// Handle service worker activation/deactivation
// MV3 service workers can be suspended, so we need to reinitialize on wake
chrome.runtime.onStartup.addListener(() => {
  console.log('Service worker starting up')
  coordinator.init()
})

// Keep service worker alive when there are active tasks
// This uses the chrome.alarms API which persists across suspensions
chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // This just wakes up the service worker periodically
    const status = coordinator.getStatus()
    if (status.taskCount > 0 || status.tabCount > 0) {
      console.log('Service worker keepalive, status:', status)
    }
  }
})

export {}
