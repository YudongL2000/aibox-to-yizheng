/**
 * [INPUT]: 依赖 AgentRuntimeStatus 协议类型
 * [OUTPUT]: 对外提供运行时状态视图模型、格式化工具与语义 tone 映射
 * [POS]: agent-ui 的运行时展示适配层，统一 Header/ChatInterface/AIHealthLab 的状态文案与 dark-first shell 样式语义
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

export interface RuntimeToneClasses {
  dotClassName: string;
  chipClassName: string;
  panelClassName: string;
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

export function resolveRuntimeToneClasses(tone: RuntimeTone): RuntimeToneClasses {
  if (tone === 'ready') {
    return {
      dotClassName: 'sp-status-dot sp-tone--success',
      chipClassName: 'sp-shell-chip sp-tone--success',
      panelClassName: 'sp-data-block sp-tone--success',
    };
  }
  if (tone === 'checking') {
    return {
      dotClassName: 'sp-status-dot sp-tone--info',
      chipClassName: 'sp-shell-chip sp-tone--info',
      panelClassName: 'sp-data-block sp-tone--info',
    };
  }
  if (tone === 'disabled') {
    return {
      dotClassName: 'sp-status-dot sp-tone--neutral',
      chipClassName: 'sp-shell-chip sp-tone--neutral',
      panelClassName: 'sp-data-block sp-tone--neutral',
    };
  }
  if (tone === 'degraded') {
    return {
      dotClassName: 'sp-status-dot sp-tone--warning',
      chipClassName: 'sp-shell-chip sp-tone--warning',
      panelClassName: 'sp-data-block sp-tone--warning',
    };
  }

  return {
    dotClassName: 'sp-status-dot sp-tone--info',
    chipClassName: 'sp-shell-chip sp-tone--info',
    panelClassName: 'sp-data-block sp-tone--info',
  };
}
