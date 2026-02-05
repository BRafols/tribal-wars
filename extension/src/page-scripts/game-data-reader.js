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

  // Map Spanish unit names to unit IDs
  const UNIT_NAME_MAP = {
    'lancero': 'spear',
    'espadachín': 'sword',
    'espadachin': 'sword',
    'bárbaro': 'axe',
    'barbaro': 'axe',
    'arquero': 'archer',
    'explorador': 'spy',
    'caballería ligera': 'light',
    'caballeria ligera': 'light',
    'arquero a caballo': 'marcher',
    'caballería pesada': 'heavy',
    'caballeria pesada': 'heavy',
    'ariete': 'ram',
    'catapulta': 'catapult',
    'noble': 'snob',
    // English fallbacks
    'spear fighter': 'spear',
    'swordsman': 'sword',
    'axeman': 'axe',
    'scout': 'spy',
    'light cavalry': 'light',
    'mounted archer': 'marcher',
    'heavy cavalry': 'heavy',
    'ram': 'ram',
    'catapult': 'catapult',
    'nobleman': 'snob'
  };

  // Map unit IDs to building types
  const UNIT_BUILDING_MAP = {
    'spear': 'barracks',
    'sword': 'barracks',
    'axe': 'barracks',
    'archer': 'barracks',
    'spy': 'stable',
    'light': 'stable',
    'marcher': 'stable',
    'heavy': 'stable',
    'ram': 'garage',
    'catapult': 'garage',
    'snob': 'snob'
  };

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

  // ============ AUTO-RECRUITMENT FOR MASS TRAINING ============

  /**
   * Check if current village group is Auto-Main
   */
  function isAutoMainGroup() {
    // Check group_id from game_data
    const groupId = window.game_data?.group_id;

    // Also check DOM for group name
    const groupSelector = document.querySelector('#group_id option:checked, .group-menu-item.selected, [data-group].active');
    const groupName = groupSelector?.textContent?.trim() || '';

    // Check if any indicator shows "Auto-Main"
    const pageText = document.body.innerText || '';
    const hasAutoMainInPage = pageText.includes('Auto-Main');

    // Also check the group dropdown for the current selection
    const groupDropdown = document.querySelector('#group_id');
    if (groupDropdown && groupDropdown.selectedOptions) {
      const selectedGroup = groupDropdown.selectedOptions[0]?.text || '';
      if (selectedGroup.includes('Auto-Main')) {
        return true;
      }
    }

    return groupName.includes('Auto-Main') || hasAutoMainInPage;
  }

  /**
   * Get village rows from mass training table
   */
  function getMassTrainingVillageRows() {
    // Mass training table has rows for each village
    // Each row has village name, unit input fields, and queue info
    const trainTable = document.querySelector('#train_form table, .trainqueue_wrap table, table.vis');
    if (!trainTable) return [];

    const rows = trainTable.querySelectorAll('tr');
    const villageRows = [];

    rows.forEach((row, index) => {
      // Skip header row
      if (index === 0 || row.querySelector('th')) return;

      // Check if row has village info
      const villageLink = row.querySelector('a[href*="village="]');
      if (villageLink) {
        villageRows.push(row);
      }
    });

    return villageRows;
  }

  /**
   * Parse queue count for a specific building in a village row
   */
  function getQueueCountForBuilding(row, building, buildingUnits) {
    if (!row || !building || !buildingUnits) return 0;

    const units = buildingUnits[building] || [];
    let totalCount = 0;

    // Check queue cells in the row
    const cells = row.querySelectorAll('td');
    cells.forEach(cell => {
      const text = cell.innerText.toLowerCase();

      // Look for queue indicators (numbers in parentheses or queue display)
      units.forEach(unit => {
        // Check for unit name in cell and associated queue count
        const unitNameMatch = Object.entries(UNIT_NAME_MAP).find(([name, id]) => id === unit && text.includes(name));
        if (unitNameMatch) {
          // Look for queue count pattern like "(2)" or "2 en cola"
          const queueMatch = text.match(/\((\d+)\)|(\d+)\s*en\s*cola|cola:\s*(\d+)/i);
          if (queueMatch) {
            totalCount += parseInt(queueMatch[1] || queueMatch[2] || queueMatch[3] || 0);
          }
        }
      });
    });

    // Alternative: check queue display elements
    const queueElements = row.querySelectorAll('.trainqueue_slot, [data-queue], .queue-count');
    queueElements.forEach(el => {
      const text = el.innerText || el.textContent || '';
      const match = text.match(/\d+/);
      if (match) {
        // Check if this queue element is for our building type
        const parent = el.closest('td');
        if (parent) {
          const parentText = parent.innerText.toLowerCase();
          units.forEach(unit => {
            const unitName = Object.entries(UNIT_NAME_MAP).find(([name, id]) => id === unit);
            if (unitName && parentText.includes(unitName[0])) {
              totalCount += parseInt(match[0]);
            }
          });
        }
      }
    });

    return totalCount;
  }

  /**
   * Check village building level
   */
  function getBuildingLevel(row, building) {
    // Try to get building level from game_data first
    const buildings = window.game_data?.village?.buildings;
    if (buildings && buildings[building]) {
      return parseInt(buildings[building]) || 0;
    }

    // Fallback: check if unit inputs exist for this building
    const buildingUnits = {
      'barracks': ['spear', 'sword', 'axe', 'archer'],
      'stable': ['spy', 'light', 'marcher', 'heavy'],
      'garage': ['ram', 'catapult']
    };

    const units = buildingUnits[building] || [];
    for (const unit of units) {
      const input = row.querySelector(`input[name*="[${unit}]"]`);
      if (input && !input.disabled) {
        return 1; // At least level 1 if input exists and is enabled
      }
    }

    return 0;
  }

  /**
   * Get queue count for a building by parsing the mass training page
   */
  function getMassTrainingQueueCount(villageRow, building, buildingUnits) {
    if (!villageRow) return 0;

    // On mass training page, queue info is shown in specific columns
    // Look for the queue section that shows pending units

    // Method 1: Check the queue column cells
    const cells = villageRow.querySelectorAll('td');
    const units = buildingUnits[building] || [];

    for (const cell of cells) {
      // Queue cells often have class 'trainqueue_wrap' or contain queue info
      const queueWrap = cell.querySelector('.trainqueue_wrap, .train_queue');
      if (queueWrap) {
        const queueText = queueWrap.innerText || '';
        // Parse queue entries
        for (const unit of units) {
          // Look for patterns like "Lancero (2)" or just count the unit mentions
          const unitNames = Object.entries(UNIT_NAME_MAP)
            .filter(([name, id]) => id === unit)
            .map(([name]) => name);

          for (const unitName of unitNames) {
            const regex = new RegExp(`(\\d+)\\s*${unitName}|${unitName}.*?(\\d+)`, 'gi');
            const match = queueText.match(regex);
            if (match) {
              // Extract number from match
              const numMatch = match[0].match(/\d+/);
              if (numMatch) {
                return parseInt(numMatch[0]);
              }
            }
          }
        }
      }
    }

    // Method 2: Check for queue indicators in spans/divs
    const queueIndicators = villageRow.querySelectorAll('[class*="queue"], [class*="pending"]');
    for (const indicator of queueIndicators) {
      const count = parseInt(indicator.textContent);
      if (!isNaN(count) && count > 0) {
        return count;
      }
    }

    return 0;
  }

  /**
   * Auto-recruit units based on configuration
   */
  function autoRecruit(config) {
    if (!window.game_data) {
      console.log('TW Bot: No game_data available');
      return;
    }

    // Verify we're on mass training screen
    if (window.game_data.screen !== 'train' || window.game_data.mode !== 'mass') {
      console.log('TW Bot: Not on mass training screen');
      return;
    }

    // Check if we're viewing Auto-Main group
    if (!isAutoMainGroup()) {
      console.log('TW Bot: Not viewing Auto-Main group');
      return;
    }

    console.log('TW Bot: Processing auto-recruitment for Auto-Main villages');

    const { units, threshold, buildingUnits } = config;
    let recruited = false;

    // Find the mass training form
    const trainForm = document.querySelector('#train_form, form[action*="train"]');
    if (!trainForm) {
      console.log('TW Bot: Train form not found');
      return;
    }

    // Get all unit input fields
    // Pattern: units[villageId][unitType]
    const unitInputs = trainForm.querySelectorAll('input[name^="units["]');

    // Group inputs by village
    const villageInputs = {};
    unitInputs.forEach(input => {
      const match = input.name.match(/units\[(\d+)\]\[(\w+)\]/);
      if (match) {
        const villageId = match[1];
        const unitType = match[2];
        if (!villageInputs[villageId]) {
          villageInputs[villageId] = {};
        }
        villageInputs[villageId][unitType] = input;
      }
    });

    // Process each village
    for (const [villageId, inputs] of Object.entries(villageInputs)) {
      // Get the village row to check queue
      const villageRow = trainForm.querySelector(`tr:has(input[name="units[${villageId}][spear]"]), tr:has(input[name="units[${villageId}][light]"])`);

      // Process units by priority
      for (const unitConfig of units.sort((a, b) => a.priority - b.priority)) {
        const { unitType, building } = unitConfig;
        const input = inputs[unitType];

        if (!input) {
          console.log(`TW Bot: No input found for ${unitType} in village ${villageId}`);
          continue;
        }

        // Check if input is disabled (building doesn't exist)
        if (input.disabled) {
          console.log(`TW Bot: ${unitType} disabled for village ${villageId} (building not available)`);
          continue;
        }

        // Check queue count for this building
        const queueCount = getMassTrainingQueueCount(villageRow, building, buildingUnits);
        console.log(`TW Bot: Village ${villageId} - ${building} queue: ${queueCount}`);

        // If queue is at or below threshold, add a unit
        if (queueCount <= threshold) {
          // Only add if input is currently empty or 0
          const currentValue = parseInt(input.value) || 0;
          if (currentValue === 0) {
            input.value = '1';
            recruited = true;
            console.log(`TW Bot: Adding 1 ${unitType} to village ${villageId} (queue was ${queueCount})`);
            // Only add one unit type per village per tick
            break;
          }
        }
      }
    }

    // If we added any units, submit the form
    if (recruited) {
      console.log('TW Bot: Submitting recruitment form');
      // Find and click submit button
      const submitBtn = trainForm.querySelector('input[type="submit"], button[type="submit"], .btn-recruit');
      if (submitBtn) {
        // Small delay before clicking to ensure values are set
        setTimeout(() => {
          submitBtn.click();
        }, 100);
      } else {
        console.log('TW Bot: Submit button not found, trying form submit');
        trainForm.submit();
      }
    }
  }

  // ============ MESSAGE HANDLER ============

  window.addEventListener('message', function(event) {
    if (!event.data || !event.data.type) return;
    if (!event.data.type.startsWith('TW_BOT_')) return;

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
      case 'TW_BOT_AUTO_RECRUIT':
        autoRecruit(event.data.config);
        break;
    }
  });

  // ============ INITIALIZATION ============

  // Send initial data when script loads
  sendGameData();
  sendBuildingQueueData();

  console.log('TW Bot: Page script loaded successfully');
})();
