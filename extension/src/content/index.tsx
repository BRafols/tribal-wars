// Content script for Tribal Wars Bot
// Runs on game pages and manages game data extraction and tab coordination

import type { Message } from '../types/game'
import { getGameDataService, getBuildingQueueService, getRecruitmentService, getSmartFarmService } from '../core'
import { getTabAgent } from './TabAgent'
import { getScavengeService, getFarmService } from './services'

console.log('Tribal Wars Bot content script loaded')

// Initialize the tab agent (handles registration with coordinator)
const tabAgent = getTabAgent()
tabAgent.init()

// Initialize the game data service
const gameDataService = getGameDataService()
gameDataService.init()

// Initialize the building queue service for auto-completing buildings
const buildingQueueService = getBuildingQueueService()
buildingQueueService.init()

// Initialize the recruitment service for auto-recruiting units
const recruitmentService = getRecruitmentService()
recruitmentService.init()
// Initialize page-specific services based on current screen
const currentUrl = window.location.href

if (currentUrl.includes('mode=scavenge')) {
  // Initialize scavenging service on scavenge page
  const scavengeService = getScavengeService()
  scavengeService.init()
  console.log('ScavengeService initialized')
}

if (currentUrl.includes('screen=am_farm')) {
  // Initialize farm service on farm assistant page
  const farmService = getFarmService()
  farmService.init()
  console.log('FarmService initialized')

  // Initialize smart farm service for intelligent attack scheduling
  const smartFarmService = getSmartFarmService()
  smartFarmService.init()
  console.log('SmartFarmService initialized')
}

// Log data updates (for debugging)
gameDataService.subscribe((data) => {
  console.log('Game data updated:', data)
})

// Log building queue updates (for debugging)
buildingQueueService.subscribe((data) => {
  if (data.queue.length > 0) {
    console.log('Building queue updated:', data)
  }
})

// Log recruitment service status (for debugging)
recruitmentService.subscribe((data) => {
  console.log('Recruitment data updated:', data)
})

// Notify background that the game page is loaded
// Notify background that the game page is loaded (legacy support)
chrome.runtime.sendMessage({ type: 'GAME_READY', payload: { url: window.location.href } })

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === 'GET_WORLD_INFO') {
    const worldInfo = gameDataService.getData()
    const lastUpdated = gameDataService.getLastUpdated()
    sendResponse({ worldInfo, lastUpdated })
    return true
  }

  return false
})

export {}
