/**
 * [INPUT]: 依赖流程上下文参数与 NodeCategory
 * [OUTPUT]: 对外提供 Agent 统一引导文案构造函数
 * [POS]: agents 的文案中心，被 IntakeAgent/ConfigAgent/Orchestrator 复用
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { HARDWARE_CATEGORIES, NodeCategory } from './types';

type SummaryReadyInput = {
  capability: string;
  confirmedLines: string;
  workflowHint: string;
};

type SummaryReadyMissingInput = SummaryReadyInput & {
  missingLabels: string[];
};

export const AGENT_PROMPT_COPY = {
  summaryReadyWithMissing: (input: SummaryReadyMissingInput): string => `
你是想做一个"${input.capability}"的机器人吗？
`.trim(),

  summaryReadyComplete: (input: SummaryReadyInput): string => `
你是想做一个"${input.capability}"的机器人吗？如果我理解的没问题，你可以点击「确认构建」，我会基于你的需求整理一个初版的自动化部署工作流。
`.trim(),

  workflowReady: (nodeCount: number): string =>
    `这是我构思的工作流逻辑，包含 ${nodeCount} 个节点，并会覆盖触发、判断与执行链路。部分节点需要你上传材料，部分节点需要你完成硬件热插拔。准备好后请点击「创建工作流」，进入让机器人动起来的第一步。`,

  configStartPrefix: (totalNodes: number): string =>
    `这是我构思的工作流逻辑配置阶段，共需配置 ${totalNodes} 个组件。`,

  configAutoIntro: (totalNodes: number): string =>
    `这是让机器人动起来的第一步，共需配置 ${totalNodes} 个组件。`,

  faceUploadMessage: '现在请上传目标人物的人脸样本图片，完成人脸识别组件配置。',

  ttsModifyConfirmMessage: (defaultText: string): string =>
    `当前语音合成内容默认值为「${defaultText}」，是否需要修改？`,

  ttsModifyConfirmTitle: '是否修改语音合成内容',

  ttsModifyConfirmDescription: '选择“否”将保持当前设置并进入下一个组件配置。',

  ttsInputPrompt: (index: number, nodeLabel: string): string =>
    `请你输入希望语音合成的文字内容。`,

  ttsInputEmpty: '语音合成文字内容不能为空，请重新输入。',

  ttsInputRetry: '好的，请输入新的语音合成文字内容。',

  screenModifyConfirmMessage: (defaultEmoji: string): string =>
    `当前屏幕默认表情为「${defaultEmoji}」，是否需要修改？`,

  screenModifyConfirmTitle: '是否修改屏幕显示表情',

  screenModifyConfirmDescription: '选择“否”将保持当前设置并进入下一个组件配置。',

  screenSelectMessage: '请你选择希望屏幕显示的表情：',

  screenSelectTitle: '请选择屏幕显示表情',

  screenSelectDescription: '可选项：开心 / 难过 / 生气 / 平和',

  screenSelectRetry: '好的，请选择新的屏幕显示表情。',

  screenSelectInvalid: '当前输入不是有效表情，请从“开心 / 难过 / 生气 / 平和”中选择。',

  faceUploadTitle: '上传人脸图片',

  faceUploadDescription: '请选择目标人物并上传对应的人脸图片',

  faceUploadRetry: (reason: string): string => `${reason}。请重新选择目标人物并上传人脸图片。`,

  decisionRetry: '请在“是/否”中选择一个选项。',

  hardwareGuide: (category: NodeCategory | undefined, nodeLabel: string): string => {
    switch (category) {
      case 'CAM':
        return '现在请你插上摄像头，这样我才能看到你出的是什么。';
      case 'MIC':
        return '现在请你插上麦克风，这样我才能听到你的语音输入。';
      case 'HAND':
        return '现在请你接入机械手，这样我才能执行具体手势动作。';
      case 'WHEEL':
        return '现在请你接入底盘，这样我才能执行前进、后退或转向动作。';
      case 'SCREEN':
        return '现在请你接入屏幕，这样我才能展示对应表情结果。';
      case 'SPEAKER':
        return '现在请你接入扬声器，这样我才能播报语音反馈。';
      case 'FACE-NET':
        return '现在请上传目标人物的人脸样本图片，完成身份识别组件配置。';
      default:
        return `请完成组件【${nodeLabel}】的准备后继续。`;
    }
  },

  configuredSuccess: (category: NodeCategory | undefined, nodeLabel: string): string => {
    if (category && HARDWARE_CATEGORIES.includes(category)) {
      return `插拔成功！现在左侧的数字孪生部分将会显示成功插拔的${nodeLabel}，你可以点击对应的组件预览效果。`;
    }
    return ``;
  },
} as const;
