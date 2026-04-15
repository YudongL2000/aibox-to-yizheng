/**
 * [INPUT]: 依赖 AgentRuntimeStatus 协议类型
 * [OUTPUT]: 对外提供运行时状态视图模型与格式化工具
 * [POS]: agent-ui 的运行时展示适配层，统一 Header/ChatInterface/AIHealthLab 的状态文案与样式语义
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { AgentRuntimeStatus } from './agentApi';

export type RuntimeTone = 'ready' | 'checking' | 'disabled' | 'degraded' | 'unknown';

export interface RuntimeStatusViewModel {
  tone: RuntimeTone;
  stateLabel: string;
  headerLabel: string;
  message: string;
  code: string;
  probeTimeoutMs: number | null;
  latencyMs: number | null;
  model: string | null;
  baseUrl: string | null;
  checkedAtLabel: string;
  showWarning: boolean;
}

export function buildRuntimeStatusView(
  runtimeStatus?: AgentRuntimeStatus | null
): RuntimeStatusViewModel {
  const llm = runtimeStatus?.llm;
  const tone = resolveTone(llm?.state);

  return {
    tone,
    stateLabel: resolveStateLabel(tone),
    headerLabel: resolveHeaderLabel(tone),
    message: llm?.message ?? '运行时诊断尚未就绪',
    code: llm?.code ?? 'unknown',
    probeTimeoutMs: typeof llm?.probeTimeoutMs === 'number' ? llm.probeTimeoutMs : null,
    latencyMs: typeof llm?.latencyMs === 'number' ? llm.latencyMs : null,
    model: llm?.model ?? null,
    baseUrl: llm?.baseUrl ?? null,
    checkedAtLabel: formatCheckedAt(llm?.checkedAt),
    showWarning: tone !== 'ready',
  };
}

function resolveTone(state?: AgentRuntimeStatus['llm']['state']): RuntimeTone {
  if (state === 'ready') {
    return 'ready';
  }
  if (state === 'checking') {
    return 'checking';
  }
  if (state === 'disabled') {
    return 'disabled';
  }
  if (state === 'degraded') {
    return 'degraded';
  }

  return 'unknown';
}

function resolveStateLabel(tone: RuntimeTone): string {
  if (tone === 'ready') {
    return '健康';
  }
  if (tone === 'checking') {
    return '检测中';
  }
  if (tone === 'disabled') {
    return '未启用';
  }
  if (tone === 'degraded') {
    return '降级';
  }

  return '未知';
}

function resolveHeaderLabel(tone: RuntimeTone): string {
  if (tone === 'ready') {
    return 'LLM_READY';
  }
  if (tone === 'checking') {
    return 'LLM_CHECKING';
  }
  if (tone === 'disabled') {
    return 'LLM_DISABLED';
  }
  if (tone === 'degraded') {
    return 'LLM_DEGRADED';
  }

  return 'LLM_UNKNOWN';
}

function formatCheckedAt(value?: string | null): string {
  if (!value) {
    return '尚未完成探测';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', {
    hour12: false,
  });
}

export function resolveRuntimeToneClasses(tone: RuntimeTone): {
  dotClassName: string;
  chipClassName: string;
} {
  if (tone === 'ready') {
    return {
      dotClassName: 'bg-emerald-400',
      chipClassName: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    };
  }
  if (tone === 'checking') {
    return {
      dotClassName: 'bg-cyan-400',
      chipClassName: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
    };
  }
  if (tone === 'disabled') {
    return {
      dotClassName: 'bg-slate-400',
      chipClassName: 'border-slate-400/30 bg-slate-500/10 text-slate-100',
    };
  }
  if (tone === 'degraded') {
    return {
      dotClassName: 'bg-amber-400',
      chipClassName: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
    };
  }

  return {
    dotClassName: 'bg-cyan-300',
    chipClassName: 'border-cyan-400/20 bg-cyan-500/5 text-cyan-100',
  };
}
