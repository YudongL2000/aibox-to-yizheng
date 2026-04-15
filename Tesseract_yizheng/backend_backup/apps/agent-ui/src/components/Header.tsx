/**
 * [INPUT]: 依赖 useAgentChat 的连接状态、运行时诊断状态与 runtimeStatusView
 * [OUTPUT]: 对外提供 Spatial shell 风格的顶部状态栏与重置入口
 * [POS]: agent-ui 的全局状态头部，负责同时暴露链路连接、LLM 运行状态与统一 shell bar 语法
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { ConnectionStatus } from '../hooks/useAgentChat';
import type { AgentRuntimeStatus } from '../lib/agentApi';
import {
  buildRuntimeStatusView,
  resolveRuntimeToneClasses,
} from '../lib/runtimeStatusView';

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connecting: 'LINKING',
  open: 'SYSTEM_ONLINE',
  closed: 'SYSTEM_OFFLINE',
  error: 'SIGNAL_ERROR',
};

const STATUS_TONE_CLASSES: Record<ConnectionStatus, string> = {
  connecting: 'sp-status-dot sp-tone--info pulse-dot',
  open: 'sp-status-dot sp-tone--success pulse-dot',
  closed: 'sp-status-dot sp-tone--danger',
  error: 'sp-status-dot sp-tone--danger',
};

export function Header({
  status,
  runtimeStatus,
  onRestart,
}: {
  status: ConnectionStatus;
  runtimeStatus?: AgentRuntimeStatus | null;
  onRestart: () => void;
}) {
  const label = STATUS_LABELS[status];
  const view = buildRuntimeStatusView(runtimeStatus);
  const toneClasses = resolveRuntimeToneClasses(view.tone);

  return (
    <header className="sp-panel sp-panel--elevated sp-shell-bar flex min-h-16 items-center justify-between gap-4 rounded-[28px] px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] text-xs font-semibold text-[color:var(--text-primary)]">
          TS
        </div>
        <div>
          <div className="sp-mono-tag">Agent Shell</div>
          <div className="sp-card-title text-sm">Tesseract 控制台</div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] uppercase">
        <div className="hidden xl:flex items-center gap-2">
          <span className={toneClasses.dotClassName}></span>
          <span className={`${toneClasses.chipClassName} max-w-[420px]`}>
            <span>{view.headerLabel}</span>
            <span className="max-w-[280px] truncate normal-case sp-text-muted" title={view.message}>
              {view.message}
            </span>
          </span>
        </div>
        <button type="button" onClick={onRestart} className="sp-button">
          重新开始
        </button>
        <div className="sp-shell-chip sp-tone--neutral flex items-center gap-2">
          <span className={STATUS_TONE_CLASSES[status]}></span>
          <span>{label}</span>
        </div>
      </div>
    </header>
  );
}
