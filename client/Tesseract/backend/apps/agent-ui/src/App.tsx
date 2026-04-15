/**
 * [INPUT]: 依赖 useAgentChat、AIHealthLab、ChatInterface 与 N8nIframe
 * [OUTPUT]: 对外提供 agent-ui 主应用
 * [POS]: agent-ui 的页面级装配器，负责连接 AI 健康测试、按交互锚定的流式聊天与 n8n 预览
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Suspense, lazy, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AIHealthLab } from './components/AIHealthLab';
import { ChatInterface } from './components/ChatInterface';
import { Header } from './components/Header';
import { useAgentChat } from './hooks/useAgentChat';
import type { WorkflowDefinition } from './lib/agentApi';

const N8nIframe = lazy(() =>
  import('./components/N8nIframe').then((module) => ({ default: module.N8nIframe }))
);

function App() {
  const {
    messages,
    status,
    isBusy,
    sendMessage,
    createWorkflow,
    confirmWorkflow,
    confirmNode,
    restartConversation,
    buildStatus,
    runtime,
    runtimeStatus,
    activeTraceAnchorId,
    traceEvents,
    traceByMessageId,
    refreshRuntimeStatus,
    syncCurrentConfigStep,
  } = useAgentChat();
  const [refreshToken, setRefreshToken] = useState(0);
  const [activeWorkflowUrl, setActiveWorkflowUrl] = useState<string | undefined>();
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | undefined>();

  const handleCreateWorkflow = async (workflow: WorkflowDefinition) => {
    try {
      const result = await createWorkflow(workflow);
      setActiveWorkflowUrl(result.workflowUrl);
      setActiveWorkflowId(result.workflowId);
      toast.success(`工作流已创建: ${result.workflowName || result.workflowId}`);
      setRefreshToken((prev) => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '工作流创建失败');
    }
  };

  const handleRestartConversation = async () => {
    setActiveWorkflowUrl(undefined);
    setActiveWorkflowId(undefined);
    await restartConversation();
  };

  return (
    <div className="flex h-screen flex-col gap-4 overflow-hidden p-4">
      <Header status={status} runtimeStatus={runtimeStatus} onRestart={handleRestartConversation} />

      <div className="flex flex-1 flex-col gap-4 lg:flex-row min-h-0">
        <div className="flex flex-1 flex-col gap-4 min-h-0">
          <div className="flex-none">
            <AIHealthLab runtimeStatus={runtimeStatus} onRefresh={refreshRuntimeStatus} />
          </div>
          <div className="flex-[2] min-h-0">
            <Suspense
              fallback={<div className="glass-panel h-full rounded-3xl p-6 text-cyan-200/60">Loading...</div>}
            >
              <N8nIframe
                refreshToken={refreshToken}
                workflowUrl={activeWorkflowUrl}
                workflowId={activeWorkflowId}
              />
            </Suspense>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 min-h-0">
          <div className="flex-[2] min-h-0">
            <ChatInterface
              messages={messages}
              onSend={sendMessage}
              onCreateWorkflow={handleCreateWorkflow}
              onConfirmWorkflow={confirmWorkflow}
              onConfirmNode={confirmNode}
              buildStatus={buildStatus}
              status={status}
              isBusy={isBusy}
              sessionId={runtime.sessionId}
              lastResponseType={runtime.responseType}
              workflowId={runtime.workflowId || activeWorkflowId}
              currentConfigNode={runtime.currentNode}
              configProgress={runtime.progress}
              runtimeStatus={runtimeStatus}
              activeTraceAnchorId={activeTraceAnchorId}
              traceEvents={traceEvents}
              traceByMessageId={traceByMessageId}
              onSyncConfigStep={syncCurrentConfigStep}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
