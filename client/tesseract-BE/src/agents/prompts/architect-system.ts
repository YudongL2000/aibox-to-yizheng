/**
 * [INPUT]: 依赖 ../hardware-components 的硬件组件、fragment 基础设施与 prompts/fragments 知识切片
 * [OUTPUT]: 对外提供 buildArchitectSystemPrompt、buildArchitectFragments 与动态上下文 fragment 构造器
 * [POS]: agents/prompts 的系统提示词装配器，负责把规则/示例/知识片段收敛成可 diff 的上下文
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { DiscoveredEntity } from '../types';
import { HardwareComponent } from '../hardware-components';
import { NODE_TYPE_VERSION_MINIMUMS } from '../node-type-versions';
import { assembleFragments, createFragment, type ContextFragment } from './context-fragment';
import { renderAssemblyRules, renderQualityChecklist } from './assembly-rules';
import { ERROR_PATTERNS } from './error-patterns';
import { FEW_SHOT_EXAMPLES } from './few-shot-examples';
import { ENTITY_MULTIPLICATION_CONTENT } from './fragments/entity-multiplication';
import { EMOTION_INTERACTION_PATTERN_CONTENT } from './fragments/emotion-interaction-pattern';
import { GAME_RPS_PATTERN_CONTENT } from './fragments/game-rps-pattern';
import { NAMING_CONVENTIONS_CONTENT } from './fragments/naming-conventions';
import { NOTES_SPEC_CONTENT } from './fragments/notes-spec';
import { TOPOLOGY_PATTERNS_CONTENT } from './fragments/topology-patterns';
import type { PromptVariant } from './prompt-variants';
import {
  WORKFLOW_COMPONENTS,
  WorkflowComponent,
  WorkflowComponentCategory,
} from './workflow-components';

function renderHardwareContext(components: HardwareComponent[]): string {
  return components
    .map((hardware) => {
      const defaultKeys = Object.keys(hardware.defaultConfig ?? {}).slice(0, 4);
      const configHint =
        defaultKeys.length > 0 ? `；默认配置键: ${defaultKeys.join(', ')}` : '';
      return `- ${hardware.displayName}(${hardware.name}) -> ${hardware.nodeType}；能力: ${hardware.capabilities.join(', ')}${configHint}`;
    })
    .join('\n');
}

function renderComponentLibrary(components: WorkflowComponent[]): string {
  const categoryLabels: Record<WorkflowComponentCategory, string> = {
    INPUT: '输入采集组件（INPUT）',
    PROCESS: 'AI 处理组件（PROCESS）',
    DECISION: '条件判断组件（DECISION）',
    OUTPUT: '输出执行组件（OUTPUT）',
  };

  const grouped = components.reduce(
    (acc, component) => {
      acc[component.category].push(component);
      return acc;
    },
    { INPUT: [], PROCESS: [], DECISION: [], OUTPUT: [] } as Record<
      WorkflowComponentCategory,
      WorkflowComponent[]
    >
  );

  return (Object.keys(categoryLabels) as WorkflowComponentCategory[])
    .map((category) => {
      const items = grouped[category]
        .map((component) => {
          const inputContract = component.inputContract?.length
            ? component.inputContract.join(', ')
            : '无';
          const outputContract = component.outputContract.length
            ? component.outputContract.join(', ')
            : '无';
          const envVars = component.envVars.length ? component.envVars.join(', ') : '无';
          const nodeTypes = Array.from(
            new Set(component.nodes.map((node) => node.type))
          ).join(', ');

          return `- ${component.name}: ${component.description} | 输入: ${inputContract} | 输出: ${outputContract} | 节点: ${nodeTypes} | ENV: ${envVars}`;
        })
        .join('\n');

      return `## ${categoryLabels[category]}\n${items}`;
    })
    .join('\n\n');
}

function renderExamples(): string {
  return FEW_SHOT_EXAMPLES.map((example, index) => {
    const nodesSection = example.keyNodes?.length
      ? `；关键节点: ${example.keyNodes
          .map((node) => `${node.nodeType}:${node.purpose}`)
          .join(' / ')}`
      : '';
    const componentAssembly = example.componentAssembly?.length
      ? `；组件: ${example.componentAssembly.join(' → ')}`
      : '';

    return `- 示例${index + 1} ${example.title}: 需求=${example.userIntent}；拓扑=${example.topology}${componentAssembly}${nodesSection}`;
  }).join('\n');
}

function renderDetailedNodeSpecs(): string {
  return `## 关键节点配置规范（高信号版）
- IF v2: \`conditions.combinator + conditions.conditions + operator{name,type,operation}\`；leftValue/rightValue 仅填变量名或常量，不写 \`{{$json.xxx}}\`
- 表达式仅用于 URL/字段回退，例如 \`={{$json.primary || $json.fallback || ""}}\`
- URL 必须优先读环境变量，例如 \`={{$env.API_URL || "http://fallback.url"}}\`
- httpRequest: \`method/url/options.timeout=60000\`，typeVersion >= ${NODE_TYPE_VERSION_MINIMUMS['n8n-nodes-base.httpRequest']}
- set: \`assignments.assignments=[]\` 且 \`options={}\`，业务值只进 \`notes.sub\`
- scheduleTrigger: \`rule.interval=[{}]\`，typeVersion >= ${NODE_TYPE_VERSION_MINIMUMS['n8n-nodes-base.scheduleTrigger']}
- IF typeVersion >= ${NODE_TYPE_VERSION_MINIMUMS['n8n-nodes-base.if']}，Set typeVersion >= ${NODE_TYPE_VERSION_MINIMUMS['n8n-nodes-base.set']}`;
}

function renderNodeSimplicityRules(): string {
  return `## 节点简洁规则（必须遵守）
1. 禁止生成冗余 \`set\` 节点，以下数据应通过连接直传：
   - TTS 输出 → SPEAKER 执行
   - CAM 输出 → YOLO/识别处理
   - IF 判断结果 → 后续执行器
2. 仅在“需要写入上下文”的处理器场景保留 \`set\` 节点（如 TTS/RAM/ASSIGN/YOLO-RPS）。
3. \`set\` 节点参数必须保持空结构（\`assignments: []\`），业务值全部写入 \`notes.sub\`。
4. 执行器节点（HAND/SPEAKER/SCREEN/WHEEL）必须使用 \`n8n-nodes-base.code\`，并至少包含 \`parameters.language="javaScript"\` 与 \`parameters.jsCode="return items;"\`。
5. IF 节点建议显式写入分支期望元数据：HAND 用 \`notes.sub.expected_hand_gesture\`，SCREEN 用 \`notes.sub.expected_screen_emoji\`。`;
}

function renderErrorPatterns(): string {
  return ERROR_PATTERNS.map((pattern) => `- ${pattern.description} → ${pattern.fix}`).join('\n');
}

function renderWorkflowGenerationRules(allowedNodeTypes: string[]): string {
  return `# 工作流生成规范
1. 先按组件库与组装规则完成设计，再 search_nodes / get_node / validate_workflow
2. HTTP 节点用于调用硬件 API，优先使用硬件组件 defaultConfig
3. 只能使用白名单节点：${allowedNodeTypes.join(', ')}
4. 节点必须包含 id(UUID)、name、type、typeVersion、position、parameters
5. connections 必须使用节点 name（不是 id）
6. Webhook 默认使用 responseMode: "onReceived"，仅当必须使用 responseNode 时添加 onError: "continueRegularOutput"
7. IF 使用 v2 filter 结构：conditions.combinator + conditions.conditions + operator{name/type/operation}
8. 参数留空结构强制：
   - scheduleTrigger: parameters.rule.interval = [{}]
   - set: parameters.assignments.assignments = [] 且 options = {}
   - code: parameters.language = "javaScript"，parameters.jsCode = "return items;"
   - httpRequest: 只保留 method/url/options，不设置 onError="continueErrorOutput"
9. 业务值必须进入 notes.sub（例如 TTS_input / audio_name / execute_gesture），禁止写入 parameters
10. 节点 name 必须全局唯一，格式优先 {type}_{category}_{action}_{detail}，重复时追加 _1/_2
11. 连接格式必须符合 n8n 标准
12. 节点位置从 [100, 200] 开始，水平间隔 220

JSON 输出必须严格有效：双引号、无注释、无尾随逗号。`;
}

function buildOutputRequirementsFragment(variant?: PromptVariant): ContextFragment {
  const variantText = variant
    ? `\n# 变体要求 (${variant.label})\n${variant.extraInstructions}\n`
    : '';

  return createFragment(
    'output_requirements',
    `输出要求：
- 先输出一段简短设计思路（以"Reasoning:"开头）
- 再输出完整工作流 JSON 代码块${variantText}`,
    variant ? 2 : 1
  );
}

export function buildArchitectFragments(
  hardwareComponents: HardwareComponent[],
  toolDescriptions: string[],
  allowedNodeTypes: string[],
  variant?: PromptVariant
): ContextFragment[] {
  return [
    createFragment(
      'role',
      '你是一个n8n工作流架构师，专门为硬件机器人设计自动化工作流。'
    ),
    createFragment('hardware_context', `# 可用硬件组件\n${renderHardwareContext(hardwareComponents)}`),
    createFragment(
      'component_library',
      `# 功能组件库（摘要视图）\n${renderComponentLibrary(WORKFLOW_COMPONENTS)}`
    ),
    createFragment('assembly_rules', `# 组装规则\n${renderAssemblyRules()}`),
    createFragment('quality_checklist', `# 质量标准\n${renderQualityChecklist()}`),
    createFragment(
      'tool_usage',
      `# 工具使用规范\n${toolDescriptions.map((line) => `- ${line}`).join('\n')}`
    ),
    createFragment(
      'workflow_generation_rules',
      [
        renderWorkflowGenerationRules(allowedNodeTypes),
        '',
        renderNodeSimplicityRules(),
        '',
        renderDetailedNodeSpecs(),
      ].join('\n')
    ),
    createFragment('topology_patterns', TOPOLOGY_PATTERNS_CONTENT),
    createFragment('entity_multiplication', ENTITY_MULTIPLICATION_CONTENT),
    createFragment('emotion_interaction_pattern', EMOTION_INTERACTION_PATTERN_CONTENT),
    createFragment('game_rps_pattern', GAME_RPS_PATTERN_CONTENT),
    createFragment('notes_spec', NOTES_SPEC_CONTENT),
    createFragment('naming_conventions', NAMING_CONVENTIONS_CONTENT),
    createFragment('error_patterns', `# 常见错误修复\n${renderErrorPatterns()}`),
    createFragment('few_shot_examples', `# Few-shot 示例\n${renderExamples()}`),
    buildOutputRequirementsFragment(variant),
  ];
}

export function buildEntityBindingsFragment(
  entities: DiscoveredEntity[],
  topologyHint: string
): ContextFragment {
  if (entities.length === 0 && !topologyHint) {
    return createFragment('entity_bindings', '无特定实体与拓扑提示。', 0);
  }

  const entityList = entities.length > 0
    ? entities
        .map(
          (entity) =>
            `- ${entity.name}(${entity.key}): ${JSON.stringify(entity.bindings, null, 0)}`
        )
        .join('\n')
    : '- 无结构化实体';

  const minimumNodes =
    entities.length > 0 ? `主链 + ${entities.length} × 分支执行器组` : '主链 + 1 × 分支执行器组';

  return createFragment(
    'entity_bindings',
    [
      '# 识别到的实体',
      entityList,
      '',
      '# 拓扑提示',
      topologyHint || '线性链',
      '',
      '# 最低节点数估算',
      minimumNodes,
    ].join('\n'),
    1
  );
}

export function buildValidationFeedbackFragment(
  errors: string[],
  turnNumber: number
): ContextFragment {
  if (errors.length === 0) {
    return createFragment('validation_feedback', '无验证错误。', 0);
  }

  return createFragment(
    'validation_feedback',
    [
      `# 第 ${turnNumber} 轮验证反馈`,
      '以下问题需要修复：',
      ...errors.map((error, index) => `${index + 1}. ${error}`),
    ].join('\n'),
    turnNumber
  );
}

export function buildArchitectSystemPrompt(
  hardwareComponents: HardwareComponent[],
  toolDescriptions: string[],
  allowedNodeTypes: string[],
  variant?: PromptVariant
): string {
  return assembleFragments(
    buildArchitectFragments(hardwareComponents, toolDescriptions, allowedNodeTypes, variant)
  );
}
