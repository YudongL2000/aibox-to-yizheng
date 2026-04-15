# Agent UI

Frontend console for the n8n-MCP agent backend.

## Development

```bash
npm install
npm run dev
```

前端开发服务器固定为 `http://127.0.0.1:5173`，默认会把 `/api`、`/uploads` 和 `/ws` 代理到后端。

后端请启动 Agent HTTP 服务（不是 `npm start` 的 MCP stdio 模式）：

```bash
# 在仓库根目录执行
npm run agent:dev
```

## Environment Variables

Create a `.env` file (optional) only if you want to bypass the default proxy:

```bash
VITE_AGENT_API_URL=http://127.0.0.1:3006
VITE_AGENT_WS_URL=ws://127.0.0.1:3006/ws
VITE_AGENT_PROXY_TARGET=http://127.0.0.1:3006
VITE_N8N_IFRAME_URL=http://localhost:5678/home/workflows
```

## Tests

```bash
npm test -- --run
```
