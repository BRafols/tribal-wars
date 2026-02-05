# Tribal Wars Bot

Browser extension for Tribal Wars game automation with a Symfony API backend.

## Project Structure

- **extension/** - Chrome extension (React 19, Vite, TypeScript, MV3)
- **api/** - Backend API (Symfony 7.4, PHP 8.2+, API Platform)

## Code Rules

- **Never use `setInterval`** - Use `requestAnimationFrame` with throttling
- **Atomic Design** - Components: atoms → molecules → organisms
- **Content Script Isolation** - Inject scripts via `<script>` tags, use `postMessage` for communication

## Git Workflow

### Branch Naming
```
feature/<issue-number>-<short-description>
fix/<issue-number>-<short-description>
refactor/<description>
docs/<description>
```

### Commit Messages
Use conventional commits:
```
<type>(<scope>): <description>

[optional body explaining the why]
```

**Types:** feat, fix, refactor, docs, test, chore
**Scopes:** extension, api, ui, core

**Important:**
- Do NOT include "Co-Authored-By" lines
- Do NOT include any Anthropic copyright or attribution
- Keep commits atomic and focused

Examples:
```
feat(extension): add village overview panel
fix(core): correct resource calculation in Ticker
refactor(ui): extract ResourceDisplay atom component
```

### Pull Requests
- Title: Clear, concise description matching the main commit
- Body: Include "Closes #<issue>" to auto-link
- Always create from feature branches, never commit directly to master
- Do NOT include Anthropic attribution in PR descriptions

### Automated Workflow
When developing issues automatically:
1. Fetch issue details
2. Create feature branch
3. Implement changes
4. Commit without stopping for approval
5. Push and create PR
6. Complete the full workflow without interruption

## Development Commands

### Extension
```bash
cd extension
npm install
npm run dev      # Development with HMR
npm run build    # Production build
npm run lint     # ESLint
```

### API
```bash
cd api
composer install
symfony serve
```

## Architecture

### Extension Core
- `src/core/Ticker.ts` - RAF-based loop for periodic tasks
- `src/core/GameDataService.ts` - Game data extraction via injected scripts

### Game Data Access
Content scripts can't access `window.game_data` directly:
1. Inject script into page context
2. Script reads game data
3. Script posts message to content script
4. Content script processes data
