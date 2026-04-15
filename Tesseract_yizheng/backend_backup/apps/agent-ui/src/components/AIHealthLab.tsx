/**
 * [INPUT]: 依赖 AgentRuntimeStatus、runtimeStatusView 与手动刷新回调
 * [OUTPUT]: 对外提供可折叠的 Spatial shell 风格 AI 健康测试面板
 * [POS]: agent-ui 的运行时观察组件，专门暴露 LLM 健康、探测阈值与调参说明，并遵循统一 panel/data-block 语法
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
    <section className="sp-panel overflow-hidden rounded-[28px]">
      <div className="sp-shell-bar flex items-center justify-between gap-3 px-6 py-4">
        <div>
          <p className="sp-mono-tag">Runtime Lab</p>
          <p className="sp-card-title text-sm">AI Health Lab</p>
          <p className="mt-1 text-xs sp-text-muted">专门用于观测 LLM 网关状态与调试探测阈值</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleRefresh} disabled={isRefreshing} className="sp-button">
            {isRefreshing ? '刷新中' : '重新探测'}
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-expanded={!isCollapsed}
            aria-controls="ai-health-lab-panel"
            className="sp-button"
          >
            {isCollapsed ? '展开操作台' : '折叠操作台'}
          </button>
        </div>
      </div>

      <div className="sp-divider-dashed px-6 py-4 text-sm sp-text-primary">
        <div className="flex flex-wrap items-center gap-2">
          <span className={toneClasses.chipClassName}>{view.stateLabel}</span>
          <span className="sp-shell-chip sp-tone--neutral">code {view.code}</span>
          <span className="sp-shell-chip sp-tone--neutral">timeout {view.probeTimeoutMs ?? '--'}ms</span>
        </div>
        <p className="mt-3 text-xs sp-text-muted">{view.message}</p>
      </div>

      {!isCollapsed ? (
        <div id="ai-health-lab-panel" className="space-y-4 px-6 py-4 text-sm sp-text-primary">
          <div className="grid gap-3 text-xs md:grid-cols-2">
            <div className={`${toneClasses.panelClassName} p-4`}>
              <p className="sp-mono-tag">Runtime</p>
              <p className="mt-2 break-all sp-text-primary">{view.message}</p>
              <p className="mt-2 sp-text-muted">Model: {view.model ?? '--'}</p>
              <p className="mt-1 break-all sp-text-muted">Base URL: {view.baseUrl ?? '--'}</p>
              <p className="mt-1 sp-text-muted">最近探测耗时: {view.latencyMs ?? '--'}ms</p>
              <p className="mt-1 sp-text-muted">最近探测时间: {view.checkedAtLabel}</p>
            </div>

            <div className="sp-data-block p-4">
              <p className="sp-mono-tag">Tuning</p>
              <p className="mt-2 sp-text-primary">AI 健康探测超时单独由 `AGENT_LLM_HEALTH_TIMEOUT_MS` 控制。</p>
              <p className="mt-1 sp-text-muted">复杂生成链路超时由 `AGENT_LLM_TIMEOUT_MS` 控制，两者不要混淆。</p>
              <pre className="mt-3 overflow-x-auto rounded-[14px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-overlay)] p-3 text-[11px] sp-text-primary">
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
