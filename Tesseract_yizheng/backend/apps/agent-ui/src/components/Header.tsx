/**
 * [INPUT]: 依赖 useAgentChat 的连接状态、运行时诊断状态与 runtimeStatusView
 * [OUTPUT]: 对外提供顶部状态栏与重置入口
 * [POS]: agent-ui 的全局状态头部，负责同时暴露链路连接和 LLM 运行状态
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
  const dotColor =
    status === 'open' ? 'bg-emerald-400' : status === 'connecting' ? 'bg-cyan-400' : 'bg-rose-400';
  const view = buildRuntimeStatusView(runtimeStatus);
  const toneClasses = resolveRuntimeToneClasses(view.tone);

  return (
    <header className="glass-panel flex h-14 items-center justify-between rounded-2xl px-6">
      <div className="flex items-center gap-3">
        <div className="orbitron flex h-9 w-9 items-center justify-center rounded-md bg-cyan-400 text-xs font-bold text-black shadow-[0_0_15px_rgba(0,242,255,0.5)]">
          M
        </div>
        <div>
          <div className="orbitron text-xs tracking-[0.4em] text-cyan-200">MAGI CORE</div>
          <div className="mono text-[10px] uppercase text-cyan-500/70">Agent Console v4.1</div>
        </div>
      </div>

      <div className="mono flex items-center gap-4 text-[10px] uppercase text-cyan-200/70">
        <div className="hidden xl:flex items-center gap-2 rounded-full border border-cyan-400/15 px-3 py-1">
          <span className={`h-2 w-2 rounded-full ${toneClasses.dotClassName}`}></span>
          <span>{view.headerLabel}</span>
          <span className="max-w-[320px] truncate text-cyan-100/70 normal-case" title={view.message}>
            {view.message}
          </span>
        </div>
        <span className="hidden md:inline">BUS_SPEED: 4.2GB/S</span>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-full border border-cyan-400/30 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-cyan-200/80 transition hover:border-cyan-200/70 hover:text-cyan-100"
        >
          重新开始
        </button>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotColor} pulse-dot`}></span>
          {label}
        </div>
      </div>
    </header>
  );
}
