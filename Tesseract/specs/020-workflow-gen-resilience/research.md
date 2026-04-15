# Research: 020-workflow-gen-resilience

## Root Cause Analysis

### Failure Chain (observed from production log 2026-04-08T14:10)

```
14:17:15  Orchestrator 开始构建工作流
14:17:15  WorkflowArchitect 主路径生成 (LLM call starts)
14:22:35  LLM timeout: elapsedMs=320590, timeoutMs=300000 → AbortError
14:22:35  WorkflowArchitect 主路径异常回退 (caught, returns null)
14:22:35  ComponentComposer 开始组合 → 8 nodes generated
14:22:35  AgentLoop 拼装完成
14:22:35  MCP 验证结果 → validation FAILED
14:22:35  AgentService 返回 confirm response (type: guidance, validation failure)

BUT: Electron HTTP timeout = max(30000, 300000+15000) = 315000ms = 315s
     Actual time = 320s → Electron aborted at ~315s
     Backend response at 320s → nobody listening
     Frontend shows: "Error invoking remote method 'tesseract-confirm-workflow': AbortError"
```

### Why 320s when timeout is 300s?

OpenAI SDK's AbortController fires at 300s, but the underlying HTTP connection takes additional time to settle (TCP FIN, response buffering). The abort is not instantaneous — observed 20s overshoot consistently across both attempts in the log.

### Why does ComponentComposer validation fail?

ComponentComposer is a rule-based engine that maps capabilities → n8n nodes. It generates structural topology but:
1. Missing required node parameters (e.g., `HttpRequest` needs URL, method, auth)
2. Connection types may mismatch between nodes
3. No trigger node may be generated (depending on capability mapping)
4. Expression syntax may be invalid

The `agentLoop` tries auto-fix (up to 3 iterations) but auto-fix itself requires LLM calls which may also timeout.

### Error Handling Audit

| Component | Has try-catch? | Behavior on error |
|-----------|---------------|-------------------|
| `WorkflowArchitect.generateWorkflow()` line 265 | ❌ for callLLM() | Timeout propagates |
| `tryComposeWithWorkflowArchitect()` | ✅ | Returns null → triggers ComponentComposer |
| `composeWorkflowForConfirm()` | ❌ | Exception propagates |
| `orchestrator.confirm()` | ❌ | Exception propagates to agent-service |
| `agent-service.confirm()` | ✅ but re-throws | Logs trace, then throws again |
| `server.ts /api/agent/confirm` | ✅ | Returns 500 + raw error message |

### Key Insight

The `tryComposeWithWorkflowArchitect()` catch block WORKS — it catches the timeout and returns null. ComponentComposer DOES run. The real failure point is that the TOTAL time (320s) exceeds the Electron HTTP timeout (315s). The backend actually has a valid response to send, but the client isn't listening anymore.

Secondary: even when the response would arrive (validation failure guidance), the message from `buildValidationFailureMessage()` is technical ("工作流校验仍未通过：节点XXX缺少参数") — not actionable for end users.

## Decision: Fix Strategy

1. **Don't fix LLM speed** — external dependency, 300s timeout is reasonable for complex workflow generation
2. **Fix Electron timeout** — widen buffer to `llmTimeout * 1.2 + 30s` 
3. **Fix error response** — orchestrator.confirm() wraps everything, never throws
4. **Fix server handler** — always return 200 + AgentResponse shape
5. **Add frontend fallback** — if AbortError still happens, synthesize a client-side error card
6. **Track failure count** — escalate suggestions on repeated failures
