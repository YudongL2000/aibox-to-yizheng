# n8n-mcp (Tesseract Agent)

## Project Overview

**n8n-mcp** (also known as Tesseract Agent) is an AI Agent system built on the **Model Context Protocol (MCP)**. Its primary goal is to reliably convert natural language requirements into functional, deployable **n8n workflows**.

It acts as a bridge between LLMs and n8n, providing:
- A **Knowledge Base** of n8n nodes (stored in SQLite).
- **Validation & Auto-fix** engines to ensure generated workflows are correct and maintainable.
- An **Agent Backend** for intent parsing, component selection, and workflow orchestration.
- An **MCP Server** that exposes these capabilities as tools to AI assistants (like Claude or Gemini).

### Architecture

- **Language:** TypeScript (Node.js)
- **Database:** SQLite (using `better-sqlite3` or `sql.js`) with FTS5 search.
- **Testing:** Vitest.
- **Frontend:** `apps/agent-ui` (React/Vite).

**Key Directories:**
- `src/agents/`: Core agent logic (intake, planning, generation).
- `src/mcp/`: MCP server implementation and tool handlers.
- `src/services/`: Business logic (validation, n8n API client, auto-fixer).
- `src/database/`: Database schema and repository pattern implementation.
- `src/parsers/`: Tools for extracting metadata from n8n node packages.

## Building and Running

### Setup
1.  **Install Dependencies:** `npm install`
2.  **Build Project:**
    ```bash
    npm run build
    ```
3.  **Initialize Database:**
    ```bash
    npm run rebuild        # Rebuilds node database from n8n packages
    npm run validate       # Validates the data
    npm run agent:db:init  # Initializes the agent database
    ```

### Running the Server
-   **MCP Server (Stdio Mode):**
    ```bash
    npm start
    ```
    *Used for integrating with desktop agents like Claude Desktop.*

-   **MCP Server (HTTP Mode):**
    ```bash
    npm run start:http
    ```
    *Exposes an HTTP endpoint (default port 3005) and WebSocket server.*

-   **Development Mode (Auto-reload):**
    ```bash
    npm run dev:http
    ```

### Testing
-   **Run All Tests:** `npm test`
-   **Unit Tests:** `npm run test:unit`
-   **Integration Tests:** `npm run test:integration`
-   **Coverage:** `npm run test:coverage`

## Development Conventions

-   **Architecture:** Follows the **Repository Pattern** for data access and **Service Layer** pattern for business logic.
-   **Type Safety:** Strict TypeScript usage. Run `npm run typecheck` to verify.
-   **Validation:** The project relies heavily on "Validation Profiles" (minimal, runtime, ai-friendly, strict) to ensure workflow quality.
-   **Database Updates:** When `n8n` packages are updated, run `npm run rebuild` to update the internal SQLite database.
-   **MCP Updates:** If the MCP server code is modified, any connected clients (like Claude Desktop) must be reloaded to pick up changes.

### Contribution Guidelines
-   **Testing:** Always add tests for new features. Use `npm run test:coverage` to ensure adequate coverage.
-   **Linting:** Run `npm run lint` before committing.
-   **Commits:** Ensure atomic commits. "Conceived by Romuald Członkowski - www.aiadvisors.pl/en" should be added to commit descriptions (per project instructions).
