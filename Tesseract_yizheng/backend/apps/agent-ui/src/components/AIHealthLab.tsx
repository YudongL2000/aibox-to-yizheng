/**
 * [INPUT]: 依赖 AgentRuntimeStatus、runtimeStatusView 与手动刷新回调
 * [OUTPUT]: 对外提供可折叠的 AI 健康测试面板
 * [POS]: agent-ui 的运行时观察组件，专门暴露 LLM 健康、探测阈值与调参说明
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react';
import type { AgentRuntimeStatus } from '../lib/agentApi';
import {
  buildRuntimeStatusView,
  resolveRuntimeToneClasses,
} from '../lib/runtimeStatusView';

export function AIHealthLab({
  runtimeStatus,
  onRefresh,
}: {
  runtimeStatus?: AgentRuntimeStatus | null;
  onRefresh: () => Promise<void>;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const view = buildRuntimeStatusView(runtimeStatus);
  const toneClasses = resolveRuntimeToneClasses(view.tone);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <section className="glass-panel overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-cyan-500/10 px-6 py-4">
        <div>
          <p className="orbitron text-[11px] uppercase tracking-[0.35em] text-cyan-400/70">AI Health Lab</p>
          <p className="text-xs text-cyan-100/70">专门用于观测 LLM 网关状态与调试探测阈值</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="mono rounded-full border border-cyan-400/30 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-cyan-200/80 transition hover:border-cyan-200/70 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRefreshing ? '刷新中' : '重新探测'}
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-expanded={!isCollapsed}
            aria-controls="ai-health-lab-panel"
            className="mono rounded-full border border-cyan-400/20 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-cyan-100/75 transition hover:border-cyan-200/60 hover:text-cyan-100"
          >
            {isCollapsed ? '展开操作台' : '折叠操作台'}
          </button>
        </div>
      </div>

      <div className="border-b border-cyan-500/10 px-6 py-4 text-sm text-cyan-100/80">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`mono rounded-full border px-3 py-1 text-[10px] uppercase ${toneClasses.chipClassName}`}>
            {view.stateLabel}
          </span>
          <span className="mono rounded-full border border-cyan-400/20 px-3 py-1 text-[10px] uppercase text-cyan-100/80">
            code {view.code}
          </span>
          <span className="mono rounded-full border border-cyan-400/20 px-3 py-1 text-[10px] uppercase text-cyan-100/80">
            timeout {view.probeTimeoutMs ?? '--'}ms
          </span>
        </div>
        <p className="mt-3 text-xs text-cyan-100/75">{view.message}</p>
      </div>

      {!isCollapsed ? (
        <div id="ai-health-lab-panel" className="space-y-4 px-6 py-4 text-sm text-cyan-100/80">
        <div className="grid gap-3 text-xs text-cyan-100/75 md:grid-cols-2">
          <div className="rounded-2xl border border-cyan-500/10 bg-black/30 p-3">
            <p className="mono text-[10px] uppercase tracking-[0.25em] text-cyan-400/60">Runtime</p>
            <p className="mt-2 break-all">{view.message}</p>
            <p className="mt-2">Model: {view.model ?? '--'}</p>
            <p className="mt-1 break-all">Base URL: {view.baseUrl ?? '--'}</p>
            <p className="mt-1">最近探测耗时: {view.latencyMs ?? '--'}ms</p>
            <p className="mt-1">最近探测时间: {view.checkedAtLabel}</p>
          </div>

          <div className="rounded-2xl border border-cyan-500/10 bg-black/30 p-3">
            <p className="mono text-[10px] uppercase tracking-[0.25em] text-cyan-400/60">Tuning</p>
            <p className="mt-2">AI 健康探测超时单独由 `AGENT_LLM_HEALTH_TIMEOUT_MS` 控制。</p>
            <p className="mt-1">复杂生成链路超时由 `AGENT_LLM_TIMEOUT_MS` 控制，两者不要混淆。</p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-cyan-500/10 bg-black/40 p-3 text-[11px] text-cyan-100/80">
{`# 根目录 .env
AGENT_LLM_HEALTH_TIMEOUT_MS=8000

# 修改后重启
npm run agent:dev`}
            </pre>
          </div>
        </div>
        </div>
      ) : null}
    </section>
  );
}
