# Tribal Wars Bot - Chrome Extension

Browser extension for Tribal Wars game automation built with React 19, TypeScript, and Vite.

## Development

```bash
npm install
npm run dev      # Development with HMR
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

- **Content Scripts**: Run in the context of game pages, extract data via injected page scripts
- **Service Worker**: Coordinates multi-tab automation (MV3)
- **Side Panel**: React UI showing bot status and activity
- **Options Page**: Configuration settings

See [Multi-Tab Coordinator Architecture](../docs/architecture/multi-tab-coordinator.md) for detailed design.

## Magic Numbers

These are configurable timing values used throughout the extension. They will be made user-configurable in a future options page.

| Constant | Value | Description |
|----------|-------|-------------|
| `MIN_ACTION_DELAY_MS` | 1000 | Minimum delay between automated actions (anti-detection) |
| `MAX_JITTER_MS` | 500 | Maximum random jitter added to actions |
| `TAB_HEARTBEAT_INTERVAL_MS` | 5000 | Tab heartbeat frequency to service worker |
| `TAB_DEAD_THRESHOLD_MS` | 15000 | Time after which unresponsive tab is considered dead |
| `STATE_PERSIST_INTERVAL_MS` | 10000 | How often state is persisted to storage |
| `SCAVENGE_CHECK_INTERVAL_MS` | 30000 | Scavenging status check frequency |
| `FARM_CHECK_INTERVAL_MS` | 60000 | Farm Assistant check frequency |
| `FARM_TARGET_INTERVAL_MS` | 1800000 | Minimum ms between attack arrivals at same target (30 min) |
| `BUILD_CHECK_INTERVAL_MS` | 60000 | Building queue check frequency |
| `RECRUIT_CHECK_INTERVAL_MS` | 30000 | Recruitment check frequency |
| `FREE_COMPLETION_THRESHOLD_SECONDS` | 180 | Building queue free completion threshold (3 min) |
| `BUILD_RESOURCE_THRESHOLD_PCT` | 20 | Minimum % of storage to keep after building |

### Location

Magic numbers are defined in `src/shared/constants.ts`.

## Project Structure

```
src/
├── background/           # Service Worker (TabCoordinator)
├── content/              # Content scripts and services
│   └── services/         # Screen-specific automation
├── components/           # React components (Atomic Design)
│   ├── atoms/
│   ├── molecules/
│   └── organisms/
├── core/                 # Core services (Ticker, GameDataService)
├── hooks/                # React hooks
├── shared/               # Shared types, messages, constants
├── page-scripts/         # Injected into page context
├── sidepanel/            # Side panel entry point
└── options/              # Options page
```

## Code Rules

- **Never use `setInterval`** - Use `requestAnimationFrame` via Ticker
- **Atomic Design** - Components organized as atoms → molecules → organisms
- **Typed Messages** - All inter-component messages are typed
