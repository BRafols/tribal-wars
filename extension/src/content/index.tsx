// Content script for Tribal Wars Bot
// Runs on game pages and manages game data extraction

import type { Message } from '../types/game'
import { getGameDataService } from '../core'

console.log('Tribal Wars Bot content script loaded')

// Initialize the game data service
const gameDataService = getGameDataService()
gameDataService.init()

// Log data updates (for debugging)
gameDataService.subscribe((data) => {
  console.log('Game data updated:', data)
})

// Notify background that the game page is loaded
chrome.runtime.sendMessage({ type: 'GAME_READY', payload: { url: window.location.href } })

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  console.log('Content script received message:', message)

  if (message.type === 'GET_WORLD_INFO') {
    const worldInfo = gameDataService.getData()
    const lastUpdated = gameDataService.getLastUpdated()
    console.log('Sending world info:', worldInfo)
    sendResponse({ worldInfo, lastUpdated })
    return true
  }

  return false
})

export {}
