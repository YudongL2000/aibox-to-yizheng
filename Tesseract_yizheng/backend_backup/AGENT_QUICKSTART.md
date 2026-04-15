# Agent Backend Quick Start

This quick start wires the agent backend, Web UI, and n8n instance together.

## 1) Install Dependencies

From the `backend/` directory:

```bash
bun install
cd apps/agent-ui && bun install
cd ../..
```

If you do not have Bun yet, the legacy `npm` flow still works, but Bun is noticeably faster for
the agent-server cold start in local development because it can execute the TypeScript entrypoints
directly.

## 2) Initialize the Agent Tables

```bash
bun run agent:db:init:bun
```

This skips the previous `build -> dist -> node` hop and runs the init script from source.

## 3) Start the Agent Server

```bash
bun run agent:dev:bun
```

In this repo the current `.env` maps the server to `http://localhost:3006` and exposes:
- `POST /api/agent/chat`
- `POST /api/workflow/create`
- `GET /api/agent/runtime-status`
- WebSocket `ws://localhost:3006/ws`

The WebSocket channel now pushes `runtime_status` frames automatically on connect and after
runtime-sensitive actions, so the UI no longer needs a polling loop just to know whether the LLM
gateway is healthy.

If you want file-change restarts while editing the backend:

```bash
bun run agent:dev:bun:watch
```

## 4) Start the UI

```bash
cd apps/agent-ui
bun run dev
```

bash docs/deployment/frp_tools/web.sh

If you also need the FRP web tunnel, run it from `backend/` in a separate terminal:

```bash
./docs/deployment/web.sh
```

The Vite dev server is fixed to `http://127.0.0.1:5173` and proxies:
- `/api/* -> http://127.0.0.1:3006`
- `/uploads/* -> http://127.0.0.1:3006`
- `/ws -> ws://127.0.0.1:3006/ws`

### UI Environment Variables

Create a `.env` file inside `apps/agent-ui` only if you want to bypass the default 5173 proxy:

```bash
VITE_AGENT_API_URL=http://127.0.0.1:3006
VITE_AGENT_WS_URL=ws://127.0.0.1:3006/ws
VITE_AGENT_PROXY_TARGET=http://127.0.0.1:3006
VITE_N8N_IFRAME_URL=http://localhost:5678/home/workflows
```

## 5) Required Backend Environment Variables

Set these in the root `.env` (or `.env copy`):

```bash
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=your-n8n-api-key
base_url=https://your-llm-endpoint
api_key=your-llm-api-key
model=gpt-5.1
```

The agent server uses these values to call your LLM and create workflows in n8n.
If the UI shows `LLM_DEGRADED` or `LLM_DISABLED`, visit `http://127.0.0.1:3006/api/agent/runtime-status`
to see the concrete reason instead of relying on n8n iframe console noise.

### Optional Agent Tuning

```bash
AGENT_LLM_TIMEOUT_MS=30000
AGENT_LLM_HEALTH_TIMEOUT_MS=5000
AGENT_LLM_DISCOVERY_TIMEOUT_MS=6000
AGENT_LLM_REFLECTION_TIMEOUT_MS=12000
AGENT_WORKFLOW_CACHE_TTL=600
AGENT_MAX_ITERATIONS=5
AGENT_PROMPT_VARIANT=baseline   # baseline | strict | ab
AGENT_SCENE_SAFETY_NETS=all     # all | none
AGENT_DISABLE_SCENE_SAFETY_NETS=ensureResultBranches,ensureHandHasAssign
AGENT_DORMANT_SCENE_SAFETY_NETS=pruneGestureRedundantTtsNodes,pruneSpeakerRelayNodes
```

The agent will return `workflow_ready` responses that include the workflow JSON,
reasoning text, and metadata (iterations + node count).

`AGENT_LLM_HEALTH_TIMEOUT_MS` only controls the completion health probe.
`AGENT_LLM_DISCOVERY_TIMEOUT_MS` controls the AI semantic discovery step before capability mapping.
`AGENT_LLM_REFLECTION_TIMEOUT_MS` controls the reflection/clarification synthesis step.
`AGENT_LLM_TIMEOUT_MS` is now the heavy generation timeout used by workflow generation and other long LLM calls.
If you just want the frontend health panel to wait longer before marking the gateway unhealthy,
change `AGENT_LLM_HEALTH_TIMEOUT_MS`, then restart `npm run agent:dev`.

### Scene SafetyNet Toggle

`AGENT_SCENE_SAFETY_NETS` controls the global mode:

- `all`: keep all scene safety nets enabled
- `none`: disable all scene safety nets

`AGENT_DISABLE_SCENE_SAFETY_NETS` disables specific safety nets while leaving the others on.
Use a comma-separated list of these names:

- `ensureGestureIdentityFlow`
- `ensureEmotionInteractionFlow`
- `pruneGestureRedundantTtsNodes`
- `ensureGameHandExecutor`
- `ensureIfDirectExecutorConnections`
- `pruneSpeakerRelayNodes`
- `ensureSpeakerHasTts`
- `ensureResultBranches`
- `ensureHandHasAssign`

`AGENT_DORMANT_SCENE_SAFETY_NETS` puts specific safety nets into observe-only mode:

- the safety net runs on a shadow workflow
- if it would have mutated the topology, the backend emits a warning log
- the real workflow is left untouched

Current recommended dormant candidates after Refactor-5 quality stabilization:

- `pruneGestureRedundantTtsNodes`
- `pruneSpeakerRelayNodes`

Examples:

```bash
# Keep all safety nets on except result branch repair
AGENT_SCENE_SAFETY_NETS=all
AGENT_DISABLE_SCENE_SAFETY_NETS=ensureResultBranches

# Turn every scene safety net off to inspect raw model output
AGENT_SCENE_SAFETY_NETS=none

# Keep structural safety nets on, but downgrade audio pruning nets to observe-only
AGENT_DORMANT_SCENE_SAFETY_NETS=pruneGestureRedundantTtsNodes,pruneSpeakerRelayNodes
```

After changing any of these variables, restart `npm run agent:dev`.
change `AGENT_LLM_HEALTH_TIMEOUT_MS`, then restart `bun run agent:dev:bun`.

## Bun Notes

- Bun can run both `src/scripts/agent-db-init.ts` and `src/agent-server/index.ts` directly, so the
  quick start no longer requires a mandatory pre-build step.
- On machines where the native `better-sqlite3` binding is unavailable, the backend will
  automatically fall back to `sql.js` instead of blocking startup.
- If you need to fall back to the old Node path, keep using `npm install`, `npm run build`,
  `npm run agent:db:init`, and `npm run agent:dev`.
