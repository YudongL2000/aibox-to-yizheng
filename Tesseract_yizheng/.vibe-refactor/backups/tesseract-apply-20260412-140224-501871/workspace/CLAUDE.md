# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tesseract is a multi-module robotics and automation platform that combines:
- **Backend**: n8n-based MCP agent system for workflow generation (TypeScript)
- **Frontend**: Flutter mobile/tablet client for robot control and interaction
- **Aily Blockly**: Angular/Electron visual programming IDE for hardware development
- **n8n**: Forked n8n workflow automation engine

The system enables natural language to workflow conversion, hardware robot control, and visual block-based programming for embedded systems.

## Repository Structure

```
Tesseract/
├── backend/           # Agent + MCP services (TypeScript)
├── frontend/          # Flutter client (Dart)
├── aily-blockly/      # Visual programming IDE (Angular + Electron)
├── n8n/n8n-master/    # Forked n8n monorepo
└── AGENTS.md          # Cross-module development guidelines
```

## Common Development Commands

### Backend (n8n-mcp Agent)
```bash
cd backend

# Build and Setup
npm run build              # Build TypeScript
npm run rebuild            # Rebuild node database from n8n packages
npm run validate           # Validate all node data
npm run agent:db:init      # Initialize agent database

# Testing
npm test                   # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:coverage      # Coverage report

# Run single test file
npm test -- tests/unit/services/property-filter.test.ts

# Type Checking
npm run lint               # Check TypeScript types
npm run typecheck          # Alias for lint

# Running Servers
npm run agent:dev          # Start agent server (http://localhost:3005)
npm run start:http         # Start MCP server in HTTP mode
npm run dev                # Build + rebuild + validate
npm run dev:http           # HTTP server with auto-reload

# Agent UI
cd apps/agent-ui
npm run dev                # Start UI dev server (http://localhost:5173)
```

### Frontend (Flutter)
```bash
cd frontend

# Setup
flutter pub get            # Install dependencies

# Development
flutter run                # Run app (select device)
flutter run -d chrome      # Run on Chrome
flutter run -d android     # Run on Android

# Testing & Analysis
flutter test               # Run tests
flutter analyze            # Static analysis
flutter doctor             # Check environment setup
```

### Aily Blockly (Visual IDE)
```bash
cd aily-blockly

# Development
npm start                  # Angular dev server (http://localhost:4200)
npm run electron           # Run Electron desktop app

# Build
npm run build              # Build for production
npm run build:mac          # Build macOS app
```

### n8n Fork
```bash
cd n8n/n8n-master

# Setup
pnpm install               # Install dependencies

# Development
pnpm dev                   # Start n8n dev server
pnpm lint                  # Lint code
pnpm test                  # Run tests
```

## High-Level Architecture

### Backend Agent System
The backend is an AI agent that converts natural language requirements into n8n workflows for hardware robots.

**Key Components:**
- **IntakeAgent** (`src/agents/intake-agent.ts`): Parses user intent and extracts entities
- **ComponentSelector** (`src/agents/component-selector.ts`): Generates component blueprints
- **WorkflowArchitect** (`src/agents/workflow-architect.ts`): Assembles prompts, generates workflow JSON, validates and auto-fixes
- **MCP Server** (`src/mcp/server.ts`): Model Context Protocol for AI assistants
- **Agent API** (`src/agent-server/`): HTTP/WebSocket API for chat and workflow management
- **SessionService** (`src/agents/session-service.ts`): Multi-session state management

**Processing Flow:**
1. User sends requirement via HTTP/WebSocket
2. IntakeAgent parses intent and checks if config needed
3. ComponentSelector generates component blueprint
4. WorkflowArchitect generates workflow JSON via LLM
5. Validation + auto-fix loop (MCP tools)
6. Deploy to n8n instance
7. Return workflowId/URL to UI

**Node Version Management:**
- Node versions managed in `src/agents/node-type-versions.ts`
- Critical nodes (IF v2, Set, HttpRequest, Schedule) preserve decimal versions
- MCP validation + auto-fix ensures quality

**Key Directories:**
- `src/agents/`: Agent core logic
- `src/mcp/`: MCP tools and n8n node management
- `src/services/`: Validation, auto-fix, n8n API client
- `src/database/`: SQLite node knowledge base
- `apps/agent-ui/`: Frontend control console

### Frontend (Flutter)
Mobile/tablet client for robot interaction and control.

**Key Structure:**
- `lib/main.dart`: App entry point
- `lib/module/`: Feature modules (home, interaction, etc.)
- `lib/server/`: API communication layer
- `lib/utils/`: Shared utilities
- `lib/webView/`: WebView components

**Key Features:**
- MQTT client for robot communication
- Video player for emotion/interaction videos
- 3D model viewer for robot visualization
- WebView integration for n8n workflows

### Aily Blockly
Visual block-based programming IDE for hardware development with AI assistance.

**Key Features:**
- Block-based programming (Blockly)
- AI-assisted code generation
- AI library conversion (Arduino → Blockly)
- Project management with npm
- Serial debugging tools
- Multi-platform support (ESP32, AVR, STM32, RP2040, etc.)

**Key Directories:**
- `src/app/`: Angular application
- `electron/`: Electron main process
- `public/`: Static assets and i18n
- `child/`: Platform-specific tools

### n8n Fork
Workflow automation engine (forked from n8n).

## Environment Variables

### Backend Agent
Create `.env` in `backend/`:
```bash
# Required
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=your-n8n-api-key
base_url=https://your-llm-endpoint
api_key=your-llm-api-key
model=gpt-4

# Optional
AGENT_PORT=3005
AGENT_LLM_TIMEOUT_MS=30000
AGENT_WORKFLOW_CACHE_TTL=600
AGENT_MAX_ITERATIONS=5
AGENT_PROMPT_VARIANT=baseline
N8N_PUBLIC_URL=http://localhost:5678
```

### Agent UI
Create `.env` in `backend/apps/agent-ui/`:
```bash
VITE_AGENT_API_URL=http://localhost:3005
VITE_AGENT_WS_URL=ws://localhost:3005/ws
VITE_N8N_IFRAME_URL=http://localhost:5678/home/workflows
```

## Testing Guidelines

### Backend
- Uses Vitest for testing
- Coverage targets: ~80% lines/functions/statements, 75% branches
- Run `npm run build` before testing changes
- Integration tests require clean database state
- Use `npm run dev` to rebuild database after package updates

### Frontend
- Uses `flutter_test` framework
- Place tests under `frontend/test/`
- Name test files `*_test.dart`
- Follow `flutter_lints` rules in `analysis_options.yaml`

### Aily Blockly
- Uses Angular/Karma testing
- Add/update specs for behavior changes

## Coding Style

### TypeScript (Backend, Aily Blockly)
- Backend: Follow existing style, 2-space indentation
- Aily Blockly: 2-space indentation, Angular style guide
- Always run `npm run typecheck` after changes

### Dart (Frontend)
- Follow `flutter_lints` rules
- File names: `snake_case.dart`
- Class names: `PascalCase`
- Variables/functions: `camelCase`

### n8n Fork
- Uses Biome/Prettier + Lefthook
- Tabs in Biome-managed packages
- Follow existing n8n conventions

## Important Notes

### Backend Development
- Always run `npm run build` after code changes
- MCP server needs reload in Claude Desktop after changes
- Database rebuilds take 2-3 minutes
- Use `get_node` with minimal/standard detail for faster responses
- Session persistence supports multi-tenant deployments (v2.24.1+)

### Cross-Module Changes
- Keep changes focused to one module when possible
- If cross-module edits needed, make them explicit
- Test in each affected module

### Commit Guidelines
- Follow Conventional Commits: `feat:`, `fix:`, `chore:`
- Optional scope: `feat(agent): ...`, `fix(flutter): ...`
- Keep commits focused to one module
- Link related issues/tasks

### Security
- Never commit secrets or API keys
- Use `.env` files for local configuration
- Validate deployment configs before merging

## Quick Start

### Full Stack Development
1. Start n8n: `cd n8n/n8n-master && pnpm dev`
2. Start backend agent: `cd backend && npm run agent:dev`
3. Start agent UI: `cd backend/apps/agent-ui && npm run dev`
4. Start Flutter app: `cd frontend && flutter run`

### Backend Only
```bash
cd backend
npm install
npm run build
npm run agent:db:init
npm run agent:dev
```

### Frontend Only
```bash
cd frontend
flutter pub get
flutter run
```

## Related Documentation

- `backend/CLAUDE.md`: Detailed backend architecture and MCP system
- `backend/AGENT_QUICKSTART.md`: Agent backend quick start
- `backend/README.md`: Backend project overview (Chinese)
- `frontend/README.md`: Flutter project basics
- `aily-blockly/README.md`: Aily Blockly features and usage
- `AGENTS.md`: Cross-module development guidelines
