# Quickstart: 020-workflow-gen-resilience

## Integration Test Scenarios

### Scenario 1: LLM Timeout → Structured Error Response
1. Set `AGENT_LLM_TIMEOUT_MS=5000` (force fast timeout)
2. Start backend: `cd backend && npm run agent:dev`
3. Send chat: "我想做一个和我共情的机器人"
4. Answer clarification questions until summary_ready
5. Click confirm
6. **Expected**: Backend returns HTTP 200 with `{type: 'guidance', message: '...(中文)...'}`, NOT HTTP 500
7. **Expected**: Frontend shows error card with "重试构建" button

### Scenario 2: Repeated Failures → Escalated Guidance
1. Repeat Scenario 1 three times (click confirm → fail → retry)
2. **Expected**: Third failure response includes suggestions like "请尝试简化需求"
3. **Expected**: "优化需求描述" button returns to chat mode

### Scenario 3: Electron Timeout Coverage
1. Set `AGENT_LLM_TIMEOUT_MS=300000`
2. Verify Electron startup log shows HTTP timeout ≥ 390000ms
3. Trigger confirm with slow LLM
4. **Expected**: Even if LLM takes 330s, Electron does NOT abort
