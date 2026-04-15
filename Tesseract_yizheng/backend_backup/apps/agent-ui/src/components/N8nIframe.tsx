/**
 * [INPUT]: 依赖 refreshToken 与最近创建的 workflowUrl/workflowId
 * [OUTPUT]: 对外提供 Spatial shell 风格的 n8n iframe 预览组件
 * [POS]: agent-ui 的工作流观察窗，按需加载 n8n 并优先指向当前创建的工作流，同时维持统一 shell bar / panel 语法
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
    <section className="sp-panel flex h-full flex-col overflow-hidden rounded-[28px]">
      <div className="sp-shell-bar flex items-center justify-between gap-3 px-6 py-4">
        <div>
          <p className="sp-mono-tag">Workflow Canvas</p>
          <p className="sp-card-title text-sm">n8n Control</p>
          <p className="mt-1 text-xs sp-text-muted">{workflowId ? `当前工作流 ${workflowId}` : '实时查看工作流拓扑'}</p>
        </div>
        <div className="flex items-center gap-3">
          {!shouldLoad ? (
            <button type="button" onClick={() => setShouldLoad(true)} className="sp-button">
              加载 n8n 预览
            </button>
          ) : null}
          {workflowUrl ? (
            <a
              href={workflowUrl}
              target="_blank"
              rel="noreferrer"
              className="sp-button"
            >
              打开当前工作流
            </a>
          ) : null}
          <span className="sp-mono-tag">{iframeLabel}</span>
        </div>
      </div>
      <div className="relative flex-1 bg-[color:var(--surface-overlay)]">
        {shouldLoad ? (
          <iframe
            key={`${refreshToken}-${iframeUrl}`}
            src={iframeUrl}
            title="n8n"
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm sp-text-muted">
            <p className="sp-mono-tag">n8n standby</p>
            <p>聊天和工作流生成不依赖 n8n 页面初始化。需要查看拓扑时再加载，避免把 5678 的 telemetry 噪音带进当前调试会话。</p>
            <a
              href={iframeUrl}
              target="_blank"
              rel="noreferrer"
              className="sp-button"
            >
              单独打开 n8n
            </a>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 border border-[color:var(--border-subtle)]" />
      </div>
    </section>
  );
}
