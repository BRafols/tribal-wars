// Page script for reading game data from window objects
// This runs in the page context (MAIN world), not the extension context
// Communicates with content script via postMessage

(function() {
  'use strict';

  // ============ BUILDING QUEUE DATA ============

  function getBuildingQueueData() {
    if (!window.game_data) return null;

    const data = {
      screen: window.game_data.screen || '',
      villageId: window.game_data.village?.id || 0,
      orderCount: 0,
      serverTime: Math.floor(Date.now() / 1000),
      queue: []
    };

    // Get server time if available
    if (window.Timing && window.Timing.initial_server_time) {
      data.serverTime = Math.floor(window.Timing.initial_server_time / 1000);
    }

    // Get order count if BuildingMain exists
    if (window.BuildingMain && typeof window.BuildingMain.order_count !== 'undefined') {
      data.orderCount = window.BuildingMain.order_count;
    }

    // Get timer data if Timing exists
    if (window.Timing &&
        window.Timing.tickHandlers &&
        window.Timing.tickHandlers.timers &&
        window.Timing.tickHandlers.timers._timers) {

      const timers = window.Timing.tickHandlers.timers._timers;
      const currentTime = Math.floor(Date.now() / 1000);

      // Building queue timers start at index 1
      for (let i = 1; i <= data.orderCount; i++) {
        const timer = timers[i];
        if (timer && timer.end) {
          const remainingSeconds = timer.end - currentTime;
          data.queue.push({
            index: i,
            endTimestamp: timer.end,
            remainingSeconds: remainingSeconds
          });
        }
      }
    }

    return data;
  }

  function sendBuildingQueueData() {
    const data = getBuildingQueueData();
    window.postMessage({ type: 'TW_BOT_BUILDING_QUEUE_DATA', data: data }, '*');
  }

  function clickFreeCompletionButton() {
    // Look for the "Finalizar" button in the building queue
    const buildQueue = document.querySelector('#buildqueue, .buildorder_gui, table');
    if (!buildQueue) {
      console.log('TW Bot: Build queue element not found');
      return false;
    }

    // Find all links that could be the completion button
    const links = document.querySelectorAll('a[href="#"]');

    for (const link of links) {
      const text = link.textContent?.trim() || '';
      if (text.toLowerCase() === 'finalizar') {
        console.log('TW Bot: Found "Finalizar" button, clicking...');
        link.click();
        return true;
      }
    }

    // Alternative: look for button by class
    const finalizarBtn = document.querySelector('a.btn-instant-free, a[class*="instant"]');
    if (finalizarBtn) {
      console.log('TW Bot: Found instant completion button by class, clicking...');
      finalizarBtn.click();
      return true;
    }

    console.log('TW Bot: "Finalizar" button not found (may not be available yet)');
    return false;
  }

  // ============ GAME DATA (GENERAL) ============

  function getGameData() {
    if (!window.game_data) return null;

    return {
      world: window.game_data.world || '',
      player: window.game_data.player || null,
      village: window.game_data.village || null,
      screen: window.game_data.screen || '',
      mode: window.game_data.mode || null,
      group_id: window.game_data.group_id || null,
      csrf: window.game_data.csrf || '',
      units: window.game_data.units || []
    };
  }

  function sendGameData() {
    const data = getGameData();
    window.postMessage({ type: 'TW_BOT_GAME_DATA', data: data }, '*');
  }

  // ============ RECRUITMENT DATA ============

  function getRecruitmentData() {
    if (!window.game_data) return null;

    const data = {
      screen: window.game_data.screen,
      mode: window.game_data.mode,
      villageId: window.game_data.village?.id,
      buildings: window.game_data.village?.buildings || {},
      groupId: window.game_data.group_id,
      unitCosts: window.unit_managers?.units || {},
      queue: []
    };

    // Parse queue from DOM
    const queueRows = document.querySelectorAll('table tr');
    queueRows.forEach(row => {
      const text = row.innerText;
      // Match pattern like "1 Lancero 0:09:31 hoy a las..."
      const match = text.match(/(\d+)\s+(Lancero|Soldado|Hacha|Arquero|Explorador|Caballería ligera|Arquero a caballo|Caballería pesada|Ariete|Catapulta|Noble)/i);
      if (match) {
        data.queue.push({
          count: parseInt(match[1]),
          unit: match[2]
        });
      }
    });

    return data;
  }

  function sendRecruitmentData() {
    const data = getRecruitmentData();
    window.postMessage({ type: 'TW_BOT_RECRUITMENT_DATA', data: data }, '*');
  }

  // ============ MESSAGE HANDLER ============

  window.addEventListener('message', function(event) {
    if (!event.data || !event.data.type) return;
    if (!event.data.type.startsWith('TW_BOT_REQUEST_')) return;

    switch (event.data.type) {
      case 'TW_BOT_REQUEST_BUILDING_QUEUE':
        sendBuildingQueueData();
        break;
      case 'TW_BOT_REQUEST_GAME_DATA':
        sendGameData();
        break;
      case 'TW_BOT_REQUEST_RECRUITMENT':
        sendRecruitmentData();
        break;
      case 'TW_BOT_CLICK_FREE_COMPLETION':
        clickFreeCompletionButton();
        break;
    }
  });

  // ============ INITIALIZATION ============

  // Send initial data when script loads
  sendGameData();
  sendBuildingQueueData();

  console.log('TW Bot: Page script loaded successfully');
})();
