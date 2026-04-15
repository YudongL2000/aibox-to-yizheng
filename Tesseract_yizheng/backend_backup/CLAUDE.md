# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

n8n-mcp is a streamlined AI Agent system built on MCP. It combines node knowledge, validation, and an agent backend to turn natural language requirements into reliable n8n workflows.

### Current Architecture:
```
src/
├── agents/                    # Agent core (intake, prompts, workflow architect)
├── agent-server/              # HTTP/WebSocket API
├── loaders/                   # NPM node loaders
├── parsers/                   # Node parsing and extraction
├── database/                  # SQLite schema + repository + adapters
├── services/                  # Validation, autofix, n8n API client
├── mcp/                       # MCP server and tool handlers
├── utils/                     # Shared helpers and logging
├── types/                     # Shared types
├── config/                    # Configuration
├── scripts/                   # rebuild/validate/agent-db-init
├── http-server.ts             # HTTP server (multi-session)
├── http-server-single-session.ts # HTTP server (single-session)
├── mcp-engine.ts              # MCP integration entrypoint
└── index.ts                   # Library exports
```

## Common Development Commands

```bash
# Build and Setup
npm run build          # Build TypeScript (always run after changes)
npm run rebuild        # Rebuild node database from n8n packages
npm run validate       # Validate all node data in database
npm run agent:db:init  # Initialize agent database

# Testing
npm test               # Run all tests
npm run test:unit      # Run unit tests only
npm run test:integration # Run integration tests
npm run test:coverage  # Run tests with coverage report

# Run a single test file
npm test -- tests/unit/services/property-filter.test.ts

# Linting and Type Checking
npm run lint           # Check TypeScript types (alias for typecheck)
npm run typecheck      # Check TypeScript types

# Running the Server
npm start              # Start MCP server in stdio mode
npm run start:http     # Start MCP server in HTTP mode
npm run dev            # Build, rebuild database, and validate
npm run dev:http       # Run HTTP server with auto-reload

# Update n8n Dependencies
npm run update:n8n:check  # Check for n8n updates (dry run)
npm run update:n8n        # Update n8n packages to latest

# Database Management
npm run migrate:fts5   # Migrate to FTS5 search (if needed)

# Git Cleanup
npm run git:prune-branches       # Dry-run merged local branch cleanup
npm run git:prune-branches:apply # Delete merged local branches with guard rails
```

## High-Level Architecture

### Core Components

1. **Agent System** (`agents/`, `agent-server/`)
   - Intake, intent parsing, workflow planning, and session handling
   - HTTP/WebSocket API for chat + workflow confirmation

2. **MCP Server** (`mcp/server.ts`)
   - Implements Model Context Protocol for AI assistants
   - Provides tools for searching, validating, and managing n8n nodes
   - Supports both stdio (Claude Desktop) and HTTP modes

3. **Database Layer** (`database/`)
   - SQLite database storing all n8n node information
   - Universal adapter pattern supporting both better-sqlite3 and sql.js
   - Full-text search capabilities with FTS5

4. **Node Processing Pipeline**
   - **Loader** (`loaders/node-loader.ts`): Loads nodes from n8n packages
   - **Parser** (`parsers/node-parser.ts`): Extracts node metadata and structure
   - **Property Extractor** (`parsers/property-extractor.ts`): Deep property analysis

5. **Service Layer** (`services/`)
   - **Property Filter**: Reduces node properties to AI-friendly essentials
   - **Config Validator**: Multi-profile validation system
   - **Expression Validator**: Validates n8n expression syntax
   - **Workflow Validator**: Complete workflow structure validation
   - **Workflow Auto-Fixer**: Auto-fix common validation errors
   - **n8n API Client**: Create/update/delete workflows
   - **Type Structure Service**: Validates complex type structures (filter, resourceMapper, etc.)

6. **Reusable Skills** (`skills/`)
   - Self-contained Codex skills that can be copied into other projects or installed globally
   - Use for repeatable repo setup tasks that should not stay buried in project docs

### Key Design Patterns

1. **Repository Pattern**: All database operations go through repository classes
2. **Service Layer**: Business logic separated from data access
3. **Validation Profiles**: Different validation strictness levels (minimal, runtime, ai-friendly, strict)
4. **Diff-Based Updates**: Efficient workflow updates using operation diffs

### MCP Tools Architecture

The MCP server exposes tools in several categories:

1. **Discovery Tools**: Finding and exploring nodes
2. **Configuration Tools**: Getting node details and examples
3. **Validation Tools**: Validating configurations before deployment
4. **Workflow Tools**: Complete workflow validation
5. **Management Tools**: Creating and updating workflows (requires API config)

## Memories and Notes for Development

### Development Workflow Reminders
- When you make changes to MCP server, you need to ask the user to reload it before you test
- When the user asks to review issues, you should use GH CLI to get the issue and all the comments
- When the task can be divided into separated subtasks, you should spawn separate sub-agents to handle them in parallel
- Use the best sub-agent for the task as per their descriptions

### Testing Best Practices
- Always run `npm run build` before testing changes
- Use `npm run dev` to rebuild database after package updates
- Check coverage with `npm run test:coverage`
- Integration tests require a clean database state

### Common Pitfalls
- The MCP server needs to be reloaded in Claude Desktop after changes
- HTTP mode requires proper CORS and auth token configuration
- Database rebuilds can take 2-3 minutes due to n8n package size
- Always validate workflows before deployment to n8n

### Performance Considerations
- Use `get_node` with minimal/standard detail for faster responses
- Batch validation operations when possible
- The diff-based update system saves 80-90% tokens on workflow updates

### Agent Interaction Guidelines
- Sub-agents are not allowed to spawn further sub-agents
- When you use sub-agents, do not allow them to commit and push. That should be done by you

### Development Best Practices
- Run typecheck and lint after every code change
- Use `npm run git:prune-branches` before hand-deleting local feature branches

### Scripts Structure
- `scripts/` is for repo-level operational scripts
- `scripts/git/` isolates git hygiene flows like merged-branch pruning

### Session Persistence Feature (v2.24.1)

**Location:**
- Types: `src/types/session-state.ts`
- Implementation: `src/http-server-single-session.ts` (lines 698-702, 1444-1584)
- Wrapper: `src/mcp-engine.ts` (lines 123-169)
- Tests: `tests/unit/http-server/session-persistence.test.ts`, `tests/unit/mcp-engine/session-persistence.test.ts`

**Key Features:**
- **Export/Restore API**: `exportSessionState()` and `restoreSessionState()` methods
- **Multi-tenant support**: Enables zero-downtime deployments for SaaS platforms
- **Security-first**: API keys exported as plaintext - downstream MUST encrypt
- **Dormant sessions**: Restored sessions recreate transports on first request
- **Automatic expiration**: Respects `sessionTimeout` setting (default 30 min)
- **MAX_SESSIONS limit**: Caps at 100 concurrent sessions (configurable via N8N_MCP_MAX_SESSIONS env var)

**Important Implementation Notes:**
- Only exports sessions with valid n8nApiUrl and n8nApiKey in context
- Skips expired sessions during both export and restore
- Uses `validateInstanceContext()` for data integrity checks
- Handles null/invalid session gracefully with warnings
- Session metadata (timestamps) and context (credentials) are persisted
- Transport and server objects are NOT persisted (recreated on-demand)

**Testing:**
- 22 unit tests covering export, restore, edge cases, and round-trip cycles
- Tests use current timestamps to avoid expiration issues
- Integration with multi-tenant backends documented in README.md

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
- When you make changes to MCP server, you need to ask the user to reload it before you test
- When the user asks to review issues, you should use GH CLI to get the issue and all the comments
- When the task can be divided into separated subtasks, you should spawn separate sub-agents to handle them in paralel
- Use the best sub-agent for the task as per their descriptions
- Do not use hyperbolic or dramatic language in comments and documentation
- Add to every commit and PR: Concieved by Romuald Członkowski - and then link to www.aiadvisors.pl/en. Don't add it in conversations
