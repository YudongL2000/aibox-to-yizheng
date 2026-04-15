/**
 * [INPUT]: 依赖 useAgentChat 提供的消息、运行时状态、runtimeStatusView 与操作回调
 * [OUTPUT]: 对外提供主聊天界面、配置调试交互、结构化 clarification_questions、AI 推荐动作与消息内 agent trace 流式可视化
 * [POS]: agent-ui 的核心交互面板，用来最大化验证后端编排、工具调用与配置链路
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, ConnectionStatus, BuildStatus } from '../hooks/useAgentChat';
import type {
  AgentResponse,
  AgentRuntimeStatus,
  AgentTraceEvent,
  ConfigurableNode,
  InteractionRequest,
  NodeConfigValues,
  WorkflowDefinition,
} from '../lib/agentApi';
import { uploadFaceImage } from '../lib/agentApi';
import { buildRuntimeStatusView } from '../lib/runtimeStatusView';
import { BuildProgressBar } from './BuildProgressBar';
import { InteractionCard } from './InteractionCard';

const QUICK_PROMPTS = [
  '我想要一个玩石头剪刀布的机器人',
  '当摄像头检测到人脸时，播放欢迎语音',
  '当听到声音后，在屏幕显示开心表情并让底盘转一圈',
];

const NODE_LABELS: Record<string, string> = {
  webhook: 'Webhook',
  scheduleTrigger: '定时触发',
  if: '条件判断',
  splitInBatches: '批量循环',
  set: '数据处理',
  httpRequest: 'HTTP 请求',
};

const FIELD_LABELS: Record<string, string> = {
  person_name: '人物名称',
  gesture: '动作手势',
  speech_content: '语音内容',
  tts_voice: '音色',
  screen_emoji: '屏幕表情',
  chassis_action: '底盘动作',
  hand_gestures: '机械手手势',
  yolo_gestures: '手势识别',
  emotion_labels: '情绪分类',
  arm_actions: '机械臂动作',
  face_profiles: '人脸样本',
  emotion_mode: '情绪模式',
  game_type: '游戏类型',
  schedule_time: '触发时间',
};

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  onCreateWorkflow: (workflow: WorkflowDefinition) => Promise<unknown>;
  onConfirmWorkflow: () => Promise<void>;
  onConfirmNode: (config?: NodeConfigValues) => Promise<void>;
  onSyncConfigStep: () => Promise<void>;
  buildStatus: BuildStatus;
  status: ConnectionStatus;
  isBusy: boolean;
  sessionId?: string;
  lastResponseType?: AgentResponse['type'];
  workflowId?: string;
  currentConfigNode?: ConfigurableNode | null;
  configProgress?: { completed: number; total: number; percentage?: number } | null;
  runtimeStatus?: AgentRuntimeStatus | null;
  activeTraceAnchorId?: string | null;
  traceEvents?: AgentTraceEvent[];
  traceByMessageId?: Record<string, AgentTraceEvent[]>;
}

export function ChatInterface({
  messages,
  onSend,
  onCreateWorkflow,
  onConfirmWorkflow,
  onConfirmNode,
  onSyncConfigStep,
  buildStatus,
  status,
  isBusy,
  sessionId,
  lastResponseType,
  workflowId,
  currentConfigNode,
  configProgress,
  runtimeStatus,
  activeTraceAnchorId,
  traceEvents = [],
  traceByMessageId = {},
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [nodeConfigDrafts, setNodeConfigDrafts] = useState<Record<string, NodeConfigValues>>({});
  const [dismissedSummaries, setDismissedSummaries] = useState<Record<string, boolean>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = () => {
    if (!input.trim()) {
      return;
    }
    onSend(input.trim());
    setInput('');
  };

  const resolveNodeLabel = (node?: ConfigurableNode | null) => {
    if (!node) {
      return '未进入配置';
    }
    return node.title || node.displayName || node.name;
  };

  const formatNodeList = (items: Array<{ type: string }>) => {
    if (items.length === 0) {
      return '未指定';
    }
    return items.map((item) => NODE_LABELS[item.type] || item.type).join(' / ');
  };

  const formatMissingFields = (fields: string[]) => {
    if (fields.length === 0) {
      return '无';
    }
    return fields.map((field) => FIELD_LABELS[field] || field).join('、');
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const buildInteractionMessage = async (
    interaction: InteractionRequest,
    payload: { selected: string[]; file?: File | null }
  ) => {
    const list = payload.selected.join('、');
    switch (interaction.field) {
      case 'clarification_action':
        return payload.selected[0] || '';
      case 'tts_voice':
        return `音色 ${payload.selected[0]}`;
      case 'screen_emoji':
        return `屏幕 emoji ${payload.selected[0]}`;
      case 'chassis_action':
        return `底盘 ${payload.selected[0]}`;
      case 'hand_gestures':
        return `机械手 手势执行 ${list}`;
      case 'yolo_gestures':
        return `yolov8 手势识别 ${list}`;
      case 'emotion_labels':
        return `StructBERT 情绪分类 ${list}`;
      case 'arm_actions':
        return `机械臂 动作 ${list}`;
      case 'face_profiles': {
        const profile = payload.selected[0] || interaction.options[0]?.value || '未知';
        if (payload.file) {
          try {
            const base64 = await fileToBase64(payload.file);
            const result = await uploadFaceImage(profile, payload.file.name, base64);
            const suffix = result.url ? ` ${result.url}` : result.fileName ? ` ${result.fileName}` : '';
            return `人脸识别 ${profile} 图片${suffix || '已上传'}`;
          } catch {
            return `人脸识别 ${profile} 图片上传失败`;
          }
        }
        return `人脸识别 ${profile} 图片未选择`;
      }
      default:
        return list;
    }
  };

  const mergeNodeConfig = (nodeName: string, updater: (prev: NodeConfigValues) => NodeConfigValues) => {
    setNodeConfigDrafts((prev) => {
      const current = prev[nodeName] ?? {};
      return {
        ...prev,
        [nodeName]: updater(current),
      };
    });
  };

  const resolveNodeDraft = (message: ChatMessage): NodeConfigValues => {
    const currentNode = message.currentNode;
    const nodeName = currentNode?.name;
    if (!currentNode || !nodeName) {
      return {};
    }
    const serverValues = currentNode.configValues ?? {};
    const localValues = nodeConfigDrafts[nodeName] ?? {};
    return {
      ...serverValues,
      ...localValues,
      sub: {
        ...(serverValues.sub || {}),
        ...(localValues.sub || {}),
      },
    };
  };

  const runtimeVisible = Boolean(sessionId || workflowId || lastResponseType);
  const progressText = configProgress
    ? `${configProgress.completed}/${configProgress.total}${
        typeof configProgress.percentage === 'number' ? ` (${configProgress.percentage}%)` : ''
      }`
    : '未开始';
  const runtimeView = buildRuntimeStatusView(runtimeStatus);
  const llmStatus = runtimeStatus?.llm;
  const showRuntimeWarning = runtimeView.showWarning && Boolean(llmStatus);

  const formatTraceTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime())
      ? '--:--:--'
      : date.toLocaleTimeString('zh-CN', { hour12: false });
  };

  const TRACE_PHASE_LABELS: Record<string, string> = {
    intake: 'INTAKE',
    capability_discovery: 'DISCOVERY',
    reflection: 'REFLECTION',
    composition: 'COMPOSITION',
    validation: 'VALIDATION',
    response: 'RESPONSE',
  };

  const TRACE_STATUS_TONES: Record<string, string> = {
    started: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100',
    completed: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
    info: 'border-cyan-400/20 bg-black/40 text-cyan-100',
    fallback: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
    failed: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
  };

  const getTraceEventsForMessage = (messageId: string) => {
    if (activeTraceAnchorId === messageId) {
      return traceEvents;
    }
    return traceByMessageId[messageId] ?? [];
  };

  const shouldRenderTraceForMessage = (messageId: string) => {
    if (activeTraceAnchorId === messageId) {
      return isBusy || traceEvents.length > 0;
    }
    return getTraceEventsForMessage(messageId).length > 0;
  };

  const renderTraceStream = (messageId: string) => {
    if (!shouldRenderTraceForMessage(messageId)) {
      return null;
    }

    const events = getTraceEventsForMessage(messageId);
    const live = activeTraceAnchorId === messageId && isBusy;

    return (
      <div className="mt-3 flex justify-start">
        <div className="w-full max-w-[80%] rounded-2xl border border-cyan-400/15 bg-black/30 p-4 text-xs text-cyan-100/85">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.3em] text-cyan-400/60">Agent Stream</p>
              <p className="mt-1 text-sm text-cyan-100">这里展示本次交互的反思、工具调用与回复准备过程。</p>
            </div>
            {live ? (
              <span className="mono rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[10px] uppercase text-amber-100">
                live
              </span>
            ) : null}
          </div>
          {events.length > 0 ? (
            <div className="mt-3 space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`rounded-xl border px-3 py-2 ${TRACE_STATUS_TONES[event.status] || TRACE_STATUS_TONES.info}`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em]">
                    <span className="mono">{formatTraceTime(event.timestamp)}</span>
                    <span className="mono rounded-full border border-white/10 px-2 py-0.5">
                      {TRACE_PHASE_LABELS[event.phase] || event.phase}
                    </span>
                    <span className="mono rounded-full border border-white/10 px-2 py-0.5">
                      {event.kind}
                    </span>
                    <span className="mono rounded-full border border-white/10 px-2 py-0.5">
                      {event.source}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{event.title}</p>
                  {event.detail ? (
                    <p className="mt-1 text-xs opacity-80">{event.detail}</p>
                  ) : null}
                  {renderTraceInsights(event)}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-cyan-200/60">已发出请求，等待后端开始回传流式过程。</p>
          )}
        </div>
      </div>
    );
  };

  const renderTraceInsights = (event: AgentTraceEvent) => {
    if (!event.data) {
      return null;
    }

    const insights: Array<{ label: string; value: string }> = [];
    const pushInsight = (label: string, value: unknown) => {
      if (!value) {
        return;
      }
      if (Array.isArray(value)) {
        const text = value
          .map((item) => (typeof item === 'string' ? item : ''))
          .filter(Boolean)
          .join(' / ');
        if (text) {
          insights.push({ label, value: text });
        }
        return;
      }
      if (typeof value === 'string' && value.trim()) {
        insights.push({ label, value: value.trim() });
      }
    };

    pushInsight('识别', event.data.recognizedRequirements);
    pushInsight('建议', event.data.suggestedActions);
    pushInsight('能力', event.data.capabilityIds);
    pushInsight('检索', event.data.searchTerms);
    pushInsight('预览', event.data.contentPreview);

    if (insights.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 space-y-1 text-[11px] opacity-80">
        {insights.map((insight) => (
          <p key={`${event.id}-${insight.label}`}>
            <span className="mono mr-2 uppercase text-cyan-300/70">{insight.label}</span>
            <span>{insight.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <section className="glass-panel relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl">
      <div className="neural-grid" />
      <div className="relative z-10 flex items-center justify-between border-b border-cyan-500/10 px-6 py-4">
        <div>
          <p className="orbitron text-[11px] uppercase tracking-[0.35em] text-cyan-400/70">Neural Intake</p>
          <p className="text-xs text-cyan-100/70">对话式需求收敛与指令生成</p>
        </div>
        <span className="mono text-[10px] uppercase text-cyan-400/60">{status.toUpperCase()}</span>
      </div>

      <div ref={listRef} className="scrollbar-none relative z-10 flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {buildStatus > 0 ? (
          <BuildProgressBar status={buildStatus} />
        ) : null}
        {runtimeVisible ? (
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/5 p-4 text-xs text-cyan-100/80">
            <div className="flex flex-wrap items-center gap-2">
              {sessionId ? (
                <span className="mono rounded-full border border-cyan-400/20 px-2 py-1">
                  session {sessionId.slice(0, 8)}
                </span>
              ) : null}
              {lastResponseType ? (
                <span className="mono rounded-full border border-cyan-400/20 px-2 py-1">
                  {lastResponseType}
                </span>
              ) : null}
              {workflowId ? (
                <span className="mono rounded-full border border-cyan-400/20 px-2 py-1">
                  workflow {workflowId}
                </span>
              ) : null}
              <span className="mono rounded-full border border-cyan-400/20 px-2 py-1">
                progress {progressText}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-400/60">Current Config Node</p>
                <p className="mt-1 text-sm text-cyan-100">{resolveNodeLabel(currentConfigNode)}</p>
                {currentConfigNode?.subtitle ? (
                  <p className="text-xs text-cyan-200/60">{currentConfigNode.subtitle}</p>
                ) : null}
              </div>
              {(workflowId || currentConfigNode) ? (
                <button
                  type="button"
                  onClick={onSyncConfigStep}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-black/30 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  同步当前配置
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {showRuntimeWarning ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100/90">
            <p className="mono text-[10px] uppercase tracking-[0.25em] text-amber-200/70">
              {runtimeView.headerLabel}
            </p>
            <p className="mt-1">{runtimeView.message}</p>
            {runtimeView.probeTimeoutMs ? (
              <p className="mt-2 text-xs text-amber-100/70">
                当前探测阈值 {runtimeView.probeTimeoutMs}ms，详细诊断见左侧工作流上方的 AI Health Lab。
              </p>
            ) : null}
            {runtimeView.latencyMs ? (
              <p className="mt-1 text-xs text-amber-100/70">最近一次探测耗时 {runtimeView.latencyMs}ms</p>
            ) : null}
          </div>
        ) : null}
        {messages.length === 0 ? (
          <div className="space-y-4 text-sm text-cyan-100/70">
            <p className="mono text-xs uppercase tracking-[0.3em] text-cyan-400/60">Waiting for input</p>
            <p>描述你想要的机器人互动场景，前端会尽量暴露摘要、工作流、配置节点与会话状态，方便压测后端新链路。</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id}>
              <div
                className={`fade-up flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl border px-4 py-3 text-sm shadow-[0_0_20px_rgba(0,242,255,0.05)] ${
                    message.role === 'user'
                      ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-50'
                      : message.variant === 'error'
                        ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
                        : 'border-cyan-500/10 bg-black/40 text-cyan-100'
                  }`}
                >
                  <p>{message.text}</p>
                {/* {message.reasoning ? (
                  <p className="mt-2 text-xs text-cyan-200/70">设计思路: {message.reasoning}</p>
                ) : null} */}
                {message.responseType || message.metadata ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase text-cyan-200/70">
                    {message.responseType ? (
                      <span className="mono rounded-full border border-cyan-400/30 px-2 py-0.5">
                        {message.responseType}
                      </span>
                    ) : null}
                    <span className="mono rounded-full border border-cyan-400/30 px-2 py-0.5">
                      nodes {message.metadata?.nodeCount ?? '--'}
                    </span>
                    <span className="mono rounded-full border border-cyan-400/30 px-2 py-0.5">
                      iterations {message.metadata?.iterations ?? '--'}
                    </span>
                  </div>
                ) : null}
                {message.responseType === 'summary_ready' && message.blueprint ? (
                  <div className="mt-3 space-y-1 text-xs text-cyan-200/70">
                    <p>触发器: {formatNodeList(message.blueprint.triggers)}</p>
                    <p>逻辑: {formatNodeList(message.blueprint.logic)}</p>
                    <p>执行: {formatNodeList(message.blueprint.executors)}</p>
                    <p>缺失: {formatMissingFields(message.blueprint.missingFields)}</p>
                  </div>
                ) : null}
                {message.clarificationQuestions?.length && !message.interaction ? (
                  <div className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-500/5 p-3 text-xs text-cyan-100/80">
                    <p className="mono text-[10px] uppercase tracking-[0.25em] text-cyan-400/60">
                      clarification_questions
                    </p>
                    <div className="mt-2 space-y-1">
                      {message.clarificationQuestions.map((question) => (
                        <p key={question}>{question}</p>
                      ))}
                    </div>
                  </div>
                ) : null}
                {message.interaction ? (
                  <InteractionCard
                    interaction={message.interaction}
                    onSubmit={async (payload) => {
                      const messageText = await buildInteractionMessage(message.interaction!, payload);
                      onSend(messageText);
                    }}
                    disabled={isBusy}
                  />
                ) : null}
                {message.responseType === 'summary_ready' && !dismissedSummaries[message.id] ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.metadata?.showContinueButton !== false ? (
                      <button
                        type="button"
                        onClick={() =>
                          setDismissedSummaries((prev) => ({
                            ...prev,
                            [message.id]: true,
                          }))
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-200/80 transition hover:border-cyan-200/60"
                      >
                        继续交流
                      </button>
                    ) : null}
                    {(message.metadata?.showConfirmBuildButton ??
                      (message.blueprint?.missingFields?.length === 0)) ? (
                      <button
                        type="button"
                        onClick={onConfirmWorkflow}
                        disabled={isBusy}
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        确认构建
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {message.metadata?.showConfirmButton && !message.workflow ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.currentNode ? (
                      <div className="w-full space-y-2 rounded-xl border border-cyan-500/20 bg-black/30 p-3">
                        <div className="space-y-1">
                          <p className="text-xs text-cyan-200/80">组件配置</p>
                          <p className="text-sm text-cyan-100">
                            {message.currentNode.title || message.currentNode.displayName || message.currentNode.name}
                          </p>
                          {message.currentNode.subtitle ? (
                            <p className="text-xs text-cyan-200/60">{message.currentNode.subtitle}</p>
                          ) : null}
                          {message.progress ? (
                            <p className="text-[11px] text-cyan-300/70">
                              进度 {message.progress.completed}/{message.progress.total}
                            </p>
                          ) : null}
                        </div>
                        {(() => {
                          const draft = resolveNodeDraft(message);
                          const nodeName = message.currentNode?.name ?? '';
                          const fields = message.currentNode?.configFields;
                          const subKeys = fields?.subKeys ?? Object.keys(draft.sub || {});

                          return (
                            <div className="grid gap-2">
                              {fields?.needsTopology ? (
                                <input
                                  value={draft.topology || ''}
                                  onChange={(event) =>
                                    mergeNodeConfig(nodeName, (prev) => ({
                                      ...prev,
                                      topology: event.target.value,
                                    }))
                                  }
                                  placeholder="topology"
                                  className="rounded-lg border border-cyan-500/20 bg-black/40 px-3 py-2 text-xs text-cyan-50 placeholder:text-cyan-200/40 focus:border-cyan-300/60 focus:outline-none"
                                />
                              ) : null}
                              {fields?.needsDeviceId ? (
                                <input
                                  value={draft.device_ID || ''}
                                  onChange={(event) =>
                                    mergeNodeConfig(nodeName, (prev) => ({
                                      ...prev,
                                      device_ID: event.target.value,
                                    }))
                                  }
                                  placeholder="device_ID"
                                  className="rounded-lg border border-cyan-500/20 bg-black/40 px-3 py-2 text-xs text-cyan-50 placeholder:text-cyan-200/40 focus:border-cyan-300/60 focus:outline-none"
                                />
                              ) : null}
                              {fields?.needsTtsInput ? (
                                <input
                                  value={draft.TTS_input || ''}
                                  onChange={(event) =>
                                    mergeNodeConfig(nodeName, (prev) => ({
                                      ...prev,
                                      TTS_input: event.target.value,
                                    }))
                                  }
                                  placeholder="TTS_input"
                                  className="rounded-lg border border-cyan-500/20 bg-black/40 px-3 py-2 text-xs text-cyan-50 placeholder:text-cyan-200/40 focus:border-cyan-300/60 focus:outline-none"
                                />
                              ) : null}
                              {fields?.needsExecuteEmoji ? (
                                <input
                                  value={draft.execute_emoji || ''}
                                  onChange={(event) =>
                                    mergeNodeConfig(nodeName, (prev) => ({
                                      ...prev,
                                      execute_emoji: event.target.value,
                                    }))
                                  }
                                  placeholder="execute_emoji"
                                  className="rounded-lg border border-cyan-500/20 bg-black/40 px-3 py-2 text-xs text-cyan-50 placeholder:text-cyan-200/40 focus:border-cyan-300/60 focus:outline-none"
                                />
                              ) : null}
                              {subKeys.map((key) => (
                                <input
                                  key={key}
                                  value={draft.sub?.[key] || ''}
                                  onChange={(event) =>
                                    mergeNodeConfig(nodeName, (prev) => ({
                                      ...prev,
                                      sub: {
                                        ...(prev.sub || {}),
                                        [key]: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder={`sub.${key}`}
                                  className="rounded-lg border border-cyan-500/20 bg-black/40 px-3 py-2 text-xs text-cyan-50 placeholder:text-cyan-200/40 focus:border-cyan-300/60 focus:outline-none"
                                />
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onConfirmNode(resolveNodeDraft(message))}
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      已拼装完毕
                    </button>
                  </div>
                ) : null}
                {message.workflow ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onCreateWorkflow(message.workflow!)}
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-200 hover:text-cyan-50"
                    >
                      创建工作流
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => (prev === message.id ? null : message.id))}
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-200/80 transition hover:border-cyan-200/60"
                    >
                      查看工作流详情
                    </button>
                  </div>
                ) : null}
                {message.workflow && expanded === message.id ? (
                  <pre className="mt-3 max-h-48 overflow-auto rounded-xl border border-cyan-500/10 bg-black/50 p-3 text-[11px] text-cyan-100/80">
                    {JSON.stringify(message.workflow, null, 2)}
                  </pre>
                ) : null}
                </div>
              </div>
              {renderTraceStream(message.id)}
            </div>
          ))
        )}
        {isBusy ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
            <p className="mono text-[10px] uppercase tracking-[0.25em] text-amber-200/70">Agent Busy</p>
            <p className="mt-1">正在等待后端响应。当前链路默认会在约 8 秒内回落到澄清提示，不会无限挂起。</p>
          </div>
        ) : null}
      </div>

      <div className="relative z-10 border-t border-cyan-500/10 px-6 py-4">
        <div className="flex flex-wrap gap-2 pb-3">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              className="mono rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] uppercase text-cyan-200/80 transition hover:border-cyan-200/60"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleSubmit();
              }
            }}
            placeholder="描述你的机器人场景..."
            className="flex-1 rounded-xl border border-cyan-500/20 bg-black/40 px-4 py-3 text-sm text-cyan-50 placeholder:text-cyan-200/40 focus:border-cyan-300/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isBusy}
            className="orbitron rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-5 py-3 text-xs uppercase tracking-[0.3em] text-cyan-50 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? '...' : '发送'}
          </button>
        </div>
      </div>
    </section>
  );
}
