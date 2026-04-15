/**
 * [INPUT]: 依赖 refreshToken 与最近创建的 workflowUrl/workflowId
 * [OUTPUT]: 对外提供 n8n iframe 预览组件
 * [POS]: agent-ui 的工作流观察窗，按需加载 n8n 并优先指向当前创建的工作流
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useState } from 'react';

interface N8nIframeProps {
  refreshToken: number;
  workflowUrl?: string;
  workflowId?: string;
}

const DEFAULT_IFRAME_URL = import.meta.env.VITE_N8N_IFRAME_URL || 'http://localhost:5678/home/workflows';

function getIframeLabel(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function N8nIframe({ refreshToken, workflowUrl, workflowId }: N8nIframeProps) {
  const hasWorkflowContext = Boolean(workflowUrl || workflowId);
  const [shouldLoad, setShouldLoad] = useState(hasWorkflowContext);

  useEffect(() => {
    if (hasWorkflowContext) {
      setShouldLoad(true);
    }
  }, [hasWorkflowContext]);

  const iframeUrl = workflowUrl || DEFAULT_IFRAME_URL;
  const iframeLabel = getIframeLabel(iframeUrl);

  return (
    <section className="glass-panel flex h-full flex-col overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-cyan-500/10 px-6 py-4">
        <div>
          <p className="orbitron text-[11px] uppercase tracking-[0.35em] text-cyan-400/70">n8n Control</p>
          <p className="text-xs text-cyan-100/70">
            {workflowId ? `当前工作流 ${workflowId}` : '实时查看工作流拓扑'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!shouldLoad ? (
            <button
              type="button"
              onClick={() => setShouldLoad(true)}
              className="mono text-[10px] uppercase text-cyan-300/80 transition hover:text-cyan-100"
            >
              加载 n8n 预览
            </button>
          ) : null}
          {workflowUrl ? (
            <a
              href={workflowUrl}
              target="_blank"
              rel="noreferrer"
              className="mono text-[10px] uppercase text-cyan-300/80 transition hover:text-cyan-100"
            >
              打开当前工作流
            </a>
          ) : null}
          <span className="mono text-[10px] text-cyan-400/60">{iframeLabel}</span>
        </div>
      </div>
      <div className="relative flex-1 bg-black/40">
        {shouldLoad ? (
          <iframe
            key={`${refreshToken}-${iframeUrl}`}
            src={iframeUrl}
            title="n8n"
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-cyan-100/70">
            <p className="mono text-[11px] uppercase tracking-[0.3em] text-cyan-400/60">n8n standby</p>
            <p>聊天和工作流生成不依赖 n8n 页面初始化。需要查看拓扑时再加载，避免把 5678 的 telemetry 噪音带进当前调试会话。</p>
            <a
              href={iframeUrl}
              target="_blank"
              rel="noreferrer"
              className="mono text-[10px] uppercase text-cyan-300/80 transition hover:text-cyan-100"
            >
              单独打开 n8n
            </a>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 border border-cyan-500/10" />
      </div>
    </section>
  );
}
