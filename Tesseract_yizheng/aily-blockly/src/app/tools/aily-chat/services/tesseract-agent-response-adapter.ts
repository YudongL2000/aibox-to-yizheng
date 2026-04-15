/**
 * [INPUT]: 依赖 backend AgentResponse 协议、dialogue-mode 前端模型与可选 workflow/project 上下文。
 * [OUTPUT]: 对外提供 adaptTesseractAgentResponse/workflowToMermaid/extractHotplugRequirements，把 backend 响应折叠成 aily markdown block；hot_plugging 响应输出「开始组装硬件」按钮并携带 allPendingHardwareNodeNames 用于批量确认。
 * [POS]: tools/aily-chat/services 的协议适配层，负责让前端渲染只服从 backend 输出语义，并把 workflow 打开上下文挂入动作 payload。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import {
  DialogueCardAction,
  DialogueCardPayload,
  DialogueLibrarySkillPreview,
  DialogueSkillSaveCandidate,
  DialogueTeachingContext,
  DialogueWakeupSkill,
  normalizeDialogueModeEnvelope,
} from './tesseract-dialogue.models';

function block(lang: string, payload: unknown): string {
  const content =
    typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  return `\n\`\`\`${lang}\n${content}\n\`\`\`\n`;
}

function escapeMermaidLabel(value: string): string {
  return String(value || '')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ');
}

function buildConfigButtons(response: any, sessionId: string) {
  if (response?.type !== 'hot_plugging') {
    return [];
  }

  const nodeName = response?.currentNode?.name;
  if (!nodeName) {
    return [];
  }

  const portOptions = buildHotplugPortOptions(response);
  const selectedPortId = resolveHotplugPortId(response, portOptions);

  return [
    {
      text: response?.type === 'select_single' || response?.type === 'select_multi'
        ? '完成当前选择后继续'
        : '标记节点已处理',
      action: 'tesseract-confirm-node',
      type: 'primary',
      payload: {
        sessionId,
        nodeName,
        ...(selectedPortId
          ? {
              portId: selectedPortId,
              topology: selectedPortId,
            }
          : {}),
        ...(portOptions.length > 0
          ? {
              portOptions,
              selectedPortId,
              portSelectionTitle: response?.interaction?.title || '选择接口',
            }
          : {}),
      },
    },
  ];
}

// --------------------------------------------------------------------------
// 硬件组装需求提取：从 hot_plugging 响应中提取需要连接的组件清单
// --------------------------------------------------------------------------
export function extractHotplugRequirements(response: any): Array<{ componentId: string; displayName: string }> {
  if (response?.type !== 'hot_plugging') return [];

  // 最优先：metadata.allHardwareComponents 包含本次组装所有硬件（来自 017 全硬件快照）
  const allHardwareComponents = Array.isArray(response?.metadata?.allHardwareComponents)
    ? response.metadata.allHardwareComponents
    : [];
  if (allHardwareComponents.length > 0) {
    return allHardwareComponents
      .filter((item: any) => item && typeof item.componentId === 'string')
      .map((item: any) => ({ componentId: item.componentId, displayName: item.displayName || item.componentId }));
  }

  // 次优先：metadata.requiredHardware 字段
  const metadataRequirements = Array.isArray(response?.metadata?.requiredHardware)
    ? response.metadata.requiredHardware
    : [];
  if (metadataRequirements.length > 0) {
    return metadataRequirements
      .filter((item: any) => item && typeof item.componentId === 'string')
      .map((item: any) => ({ componentId: item.componentId, displayName: item.displayName || item.componentId }));
  }

  // 回落：按 category 映射到标准 componentId
  const CATEGORY_MAP: Record<string, { componentId: string; displayName: string }> = {
    BASE: { componentId: 'base', displayName: '底盘' },
    CAM: { componentId: 'camera', displayName: '摄像头' },
    MIC: { componentId: 'microphone', displayName: '麦克风' },
    WHEEL: { componentId: 'chassis', displayName: '底盘' },
    HAND: { componentId: 'mechanical_hand', displayName: '机械手' },
    SPEAKER: { componentId: 'speaker', displayName: '扬声器' },
    SCREEN: { componentId: 'screen', displayName: '屏幕' },
  };
  const category = String(response?.currentNode?.category || '').trim();
  const mapped = category ? CATEGORY_MAP[category] : null;
  if (mapped) return [mapped];

  // 兜底：用 displayName/title 构造 componentId
  const fallbackName = String(response?.currentNode?.displayName || response?.currentNode?.title || '当前硬件');
  return [{ componentId: fallbackName.trim().toLowerCase().replace(/\s+/g, '_'), displayName: fallbackName }];
}

function buildHotplugPortOptions(response: any): Array<{ label: string; value: string }> {
  if (response?.type !== 'hot_plugging' || response?.interaction?.field !== 'hardware_port') {
    return [];
  }

  const options = Array.isArray(response?.interaction?.options) ? response.interaction.options : [];
  return options
    .filter((option: any) => option && typeof option.value === 'string')
    .map((option: any) => ({
      label: typeof option.label === 'string' && option.label.trim().length > 0
        ? option.label
        : option.value,
      value: option.value,
    }));
}

function resolveHotplugPortId(
  response: any,
  portOptions: Array<{ label: string; value: string }>
): string | null {
  const selected = response?.interaction?.selected;
  if (typeof selected === 'string' && selected.trim().length > 0) {
    return selected;
  }

  const topology = response?.currentNode?.configValues?.topology;
  if (typeof topology === 'string' && topology.trim().length > 0) {
    return topology;
  }

  return portOptions[0]?.value || null;
}

function buildOpenWorkflowPayload(context: {
  sessionId: string;
  workflowId?: string | null;
  workflowUrl?: string | null;
  projectPath?: string | null;
}) {
  return {
    sessionId: context.sessionId,
    workflowId: context.workflowId || null,
    workflowUrl: context.workflowUrl || null,
    projectPath: context.projectPath || null,
  };
}

function buildDialogueWakeups(
  sessionId: string,
  librarySkills: DialogueLibrarySkillPreview[]
): DialogueWakeupSkill[] {
  return librarySkills.map((skill) => ({
    id: skill.skillId,
    title: skill.displayName,
    action:
      skill.workflow && Object.keys(skill.workflow).length > 0
        ? 'tesseract-dialogue-run-skill'
        : 'tesseract-dialogue-skill-prompt',
    payload: {
      sessionId,
      prompt: skill.wakePrompt,
      skillId: skill.skillId,
      displayName: skill.displayName,
      summary: skill.summary,
      requiredHardware: skill.requiredHardware || [],
      sourceSessionId: skill.sourceSessionId || null,
      workflowId: skill.workflowId || null,
      workflowName: skill.workflowName || skill.displayName,
      workflow: skill.workflow || null,
    },
    prompt: skill.wakePrompt,
    icon: skill.displayName.slice(0, 1),
    tags: skill.tags.slice(0, 3),
    summary: skill.summary,
    requiredHardware: skill.requiredHardware || [],
    sourceSessionId: skill.sourceSessionId || '',
    workflowId: skill.workflowId || '',
    workflowName: skill.workflowName || skill.displayName,
    workflow: skill.workflow || null,
  }));
}

function formatWorkflowSummary(message: string): string {
  const normalized = String(message || '').trim();
  if (!normalized) {
    return '';
  }

  const abilityMatch = normalized.match(/我理解到的能力组合是：([\s\S]*?)需求总结：([\s\S]*?)(如果这就是你的目标[\s\S]*)?$/);
  if (!abilityMatch) {
    return normalized;
  }

  const abilitySegment = abilityMatch[1].trim();
  const summarySegment = abilityMatch[2].trim();
  const nextStepSegment = (abilityMatch[3] || '').trim();
  const abilityItems = abilitySegment
    .split(')、')
    .map((item, index, all) => {
      const trimmed = item.trim();
      if (!trimmed) {
        return '';
      }
      return `${trimmed}${index < all.length - 1 && !trimmed.endsWith(')') ? ')' : ''}`;
    })
    .filter(Boolean);

  const lines = ['**我理解到的能力组合是：**'];
  if (abilityItems.length > 0) {
    abilityItems.forEach((item) => lines.push(`- ${item}`));
  } else {
    lines.push(abilitySegment);
  }
  lines.push('');
  lines.push('**需求总结：**');
  lines.push(summarySegment);
  if (nextStepSegment) {
    lines.push('');
    lines.push(nextStepSegment);
  }
  return lines.join('\n');
}

function formatAgentMessage(response: any): string {
  const message = String(response?.message || '').trim();
  if (!message) {
    return '';
  }

  if (response?.type === 'summary_ready' || response?.type === 'workflow_ready') {
    return formatWorkflowSummary(message);
  }

  return message;
}

function buildDialogueActions(
  dialogueMode: ReturnType<typeof normalizeDialogueModeEnvelope>,
  context: { sessionId: string }
) : DialogueCardAction[] {
  if (!dialogueMode) {
    return [];
  }

  return (dialogueMode.uiActions || []).flatMap((action) => {
    if (action.id === 'start_deploy') {
      return [{
        text: action.label,
        action: 'tesseract-dialogue-start-deploy',
        type: 'primary',
        disabled: !action.enabled,
        payload: {
          sessionId: context.sessionId,
        },
      }];
    }

    if (action.id === 'open_teaching_mode') {
      const teachingContext: DialogueTeachingContext | null = dialogueMode.teachingHandoff
        ? {
            originalPrompt: dialogueMode.teachingHandoff.originalPrompt,
            prefilledGoal: dialogueMode.teachingHandoff.prefilledGoal,
            sourceSessionId: dialogueMode.teachingHandoff.sourceSessionId,
          }
        : null;
      return [{
        text: action.label,
        action: 'tesseract-dialogue-open-teaching-mode',
        type: 'primary',
        disabled: !action.enabled,
        payload: {
          sessionId: context.sessionId,
          teachingContext,
          prefilledGoal: dialogueMode.teachingHandoff?.prefilledGoal || '',
        },
      }];
    }

    return [{
      text: action.label,
      action: `tesseract-dialogue-${action.id}`,
      type: action.kind === 'primary' ? 'primary' : action.kind === 'ghost' ? 'text' : 'default',
      disabled: !action.enabled,
      payload: {
        sessionId: context.sessionId,
        ...(action.payload || {}),
      },
    }];
  });
}

function buildConfigCompleteActions(
  response: any,
  context: {
    sessionId: string;
    workflowId?: string | null;
    workflowUrl?: string | null;
    projectPath?: string | null;
  }
) {
  const workflowPayload = buildOpenWorkflowPayload({
    sessionId: context.sessionId,
    workflowId: response?.metadata?.workflowId || context.workflowId || null,
    workflowUrl: context.workflowUrl || null,
    projectPath: context.projectPath || null,
  });

  return [
    {
      text: '上传到硬件',
      action: 'tesseract-upload-to-hardware',
      type: 'primary',
      payload: {
        sessionId: context.sessionId,
        workflowId: workflowPayload.workflowId,
        workflowUrl: workflowPayload.workflowUrl,
        projectPath: workflowPayload.projectPath,
      },
    },
    {
      text: '停止工作流',
      action: 'tesseract-stop-workflow',
      type: 'default',
      payload: {
        sessionId: context.sessionId,
        workflowId: workflowPayload.workflowId,
        workflowUrl: workflowPayload.workflowUrl,
        projectPath: workflowPayload.projectPath,
      },
    },
    {
      text: '打开工作流',
      action: 'tesseract-open-workflow',
      type: 'default',
      payload: workflowPayload,
    },
  ];
}

function buildDialogueModeBlock(
  response: any,
  context: { sessionId: string }
): DialogueCardPayload | null {
  const dialogueMode = normalizeDialogueModeEnvelope(response?.dialogueMode);
  if (!dialogueMode) {
    return null;
  }

  return {
    sessionId: context.sessionId,
    branch: dialogueMode.branch,
    phase: dialogueMode.phase,
    message: response?.message || '',
    skills: buildDialogueWakeups(context.sessionId, dialogueMode.librarySkills || []).map((skill) => ({
      ...skill,
      active:
        Boolean(dialogueMode.skill?.skillId)
        && (skill.id === dialogueMode.skill?.skillId || skill.title === dialogueMode.skill?.displayName),
      disabled: dialogueMode.phase === 'validating_insert' || dialogueMode.phase === 'deploying',
    })),
    skill: dialogueMode.skill,
    hardware: dialogueMode.hardware,
    physicalCue: dialogueMode.physicalCue,
    relay: dialogueMode.relay,
    teachingHandoff: dialogueMode.teachingHandoff,
    deploymentPrompt: dialogueMode.deploymentPrompt || null,
    actions: buildDialogueActions(dialogueMode, context),
    localStatusText:
      dialogueMode.hardware?.failureReason
      || response?.statusText
      || null,
  };
}

function buildSkillSaveButtons(
  sessionId: string,
  candidate: DialogueSkillSaveCandidate | null | undefined
) {
  if (!candidate?.skillId) {
    return [];
  }

  return [
    {
      text: '确认存入 Skills 库',
      action: 'tesseract-save-skill',
      type: 'primary',
      payload: {
        sessionId,
        skillId: candidate.skillId,
        displayName: candidate.displayName,
      },
    },
    {
      text: '暂不存入',
      action: 'tesseract-dismiss-save-skill',
      type: 'default',
      payload: {
        sessionId,
        skillId: candidate.skillId,
      },
    },
  ];
}

// 从 WorkflowBlueprint 的 componentAssembly 生成初步流程图，用于需求总结阶段提前展示
export function blueprintToMermaid(blueprint: any): string {
  const assembly: string[] = blueprint?.componentSelection?.componentAssembly ?? [];
  if (assembly.length === 0) {
    const summary = escapeMermaidLabel(blueprint?.intentSummary || '需求分析中');
    return `flowchart LR\n  A["${summary}"]`;
  }

  const lines = ['flowchart LR'];
  assembly.forEach((name: string, i: number) => {
    lines.push(`  N${i + 1}["${escapeMermaidLabel(name)}"]`);
  });
  for (let i = 1; i < assembly.length; i++) {
    lines.push(`  N${i} --> N${i + 1}`);
  }
  return lines.join('\n');
}

export function workflowToMermaid(workflow: any): string {
  const nodes = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
  const connections = workflow?.connections && typeof workflow.connections === 'object'
    ? workflow.connections
    : {};

  if (nodes.length === 0) {
    return 'flowchart LR\n  EMPTY["No workflow nodes"]';
  }

  const nodeIdByName = new Map<string, string>();
  const lines = ['flowchart LR'];

  nodes.forEach((node: any, index: number) => {
    const mermaidId = `N${index + 1}`;
    nodeIdByName.set(node?.name, mermaidId);
    const label = escapeMermaidLabel(node?.name || node?.type || `Node ${index + 1}`);
    lines.push(`  ${mermaidId}["${label}"]`);
  });

  Object.entries(connections).forEach(([sourceName, connectionGroup]: [string, any]) => {
    const sourceId = nodeIdByName.get(sourceName);
    if (!sourceId || !connectionGroup || typeof connectionGroup !== 'object') {
      return;
    }

    Object.values(connectionGroup).forEach((branches: any) => {
      if (!Array.isArray(branches)) {
        return;
      }

      branches.forEach((branch: any) => {
        if (!Array.isArray(branch)) {
          return;
        }

        branch.forEach((edge: any) => {
          const targetId = nodeIdByName.get(edge?.node);
          if (targetId) {
            lines.push(`  ${sourceId} --> ${targetId}`);
          }
        });
      });
    });
  });

  if (lines.length === nodes.length + 1) {
    lines.push(`  ${nodeIdByName.get(nodes[0]?.name)} --> ${nodeIdByName.get(nodes[nodes.length - 1]?.name)}`);
  }

  return lines.join('\n');
}

export function adaptTesseractAgentResponse(
  response: any,
  context: {
    sessionId: string;
    workflowId?: string | null;
    workflowUrl?: string | null;
    projectPath?: string | null;
  }
) {
  const parts: string[] = [];
  const snapshot: Record<string, unknown> = {};
  const sessionId = context.sessionId;

  const formattedMessage = formatAgentMessage(response);
  if (formattedMessage) {
    parts.push(formattedMessage);
  }

  switch (response?.type) {
    case 'dialogue_mode': {
      snapshot['metadata'] = { phase: response?.dialogueMode?.phase || 'dialogue_mode' };
      const blockPayload = buildDialogueModeBlock(response, { sessionId });
      if (blockPayload) {
        parts.push(block('aily-dialogue-mode', blockPayload));
      }
      break;
    }
    case 'summary_ready': {
      snapshot['blueprint'] = response.blueprint;
      snapshot['metadata'] = { phase: 'summary_ready' };
      parts.push(block('aily-button', [
        {
          text: '确认工作流',
          action: 'tesseract-confirm-workflow',
          type: 'primary',
          payload: { sessionId },
        },
      ]));
      break;
    }
    case 'workflow_ready': {
      snapshot['workflow'] = response.workflow;
      snapshot['metadata'] = { phase: 'workflow_ready' };
      parts.push(block('aily-mermaid', {
        code: workflowToMermaid(response.workflow),
      }));
      break;
    }
    case 'hot_plugging': {
      snapshot['metadata'] = { phase: response.type };
      const requirements = extractHotplugRequirements(response);
      const allPendingHardwareNodeNames: string[] = Array.isArray(response?.metadata?.allPendingHardwareNodeNames)
        ? response.metadata.allPendingHardwareNodeNames
        : [];
      parts.push(block('aily-button', [
        {
          text: '开始组装硬件',
          action: 'tesseract-start-hardware-assembly',
          type: 'primary',
          icon: 'fa-light fa-cube',
          payload: {
            sessionId,
            components: requirements,
            nodeName: response?.currentNode?.name,
            allPendingHardwareNodeNames,
          },
        },
      ]));
      break;
    }
    case 'select_single':
    case 'select_multi':
    case 'image_upload':
    case 'config_input':
    case 'guidance': {
      snapshot['metadata'] = { phase: response.type };
      parts.push(block('aily-config-guide', {
        sessionId,
        type: response.type,
        currentNode: response.currentNode || null,
        interaction: response.interaction || null,
        progress: response.progress || null,
        totalNodes: response.totalNodes || null,
        metadata: response.metadata || null,
      }));
      const buttons = buildConfigButtons(response, sessionId);
      if (buttons.length > 0) {
        parts.push(block('aily-button', buttons));
      }
      break;
    }
    case 'config_complete': {
      snapshot['workflowId'] = response?.metadata?.workflowId || null;
      snapshot['metadata'] = { phase: 'config_complete' };
      parts.push(block('aily-state', {
        state: 'done',
        text: response.message || '配置完成',
      }));
      parts.push(block('aily-button', buildConfigCompleteActions(response, {
        sessionId,
        workflowId: response?.metadata?.workflowId || context.workflowId || null,
        workflowUrl: context.workflowUrl || null,
        projectPath: context.projectPath || null,
      })));
      const skillSaveButtons = buildSkillSaveButtons(sessionId, response?.skillSaveCandidate);
      if (skillSaveButtons.length > 0) {
        parts.push(block('aily-state', {
          state: 'info',
          text: `教学完成，是否把“${response.skillSaveCandidate.displayName}”存入 Skills 库？`,
        }));
        parts.push(block('aily-button', skillSaveButtons));
      }
      break;
    }
    case 'error': {
      parts.push(block('aily-state', {
        state: 'error',
        text: response.message || 'Tesseract Agent 执行失败',
      }));
      break;
    }
    default:
      break;
  }

  return {
    markdown: parts.filter(Boolean).join('\n\n').trim(),
    snapshot,
  };
}
