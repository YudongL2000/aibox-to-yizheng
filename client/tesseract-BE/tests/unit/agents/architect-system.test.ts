import { describe, expect, it } from 'vitest';
import {
  buildArchitectFragments,
  buildArchitectSystemPrompt,
  buildEntityBindingsFragment,
} from '../../../src/agents/prompts/architect-system';
import { selectPromptVariant } from '../../../src/agents/prompts/prompt-variants';
import { HARDWARE_COMPONENTS } from '../../../src/agents/hardware-components';
import { ALLOWED_NODE_TYPES } from '../../../src/agents/allowed-node-types';

describe('buildArchitectSystemPrompt', () => {
  it('renders hardware components and tool instructions', () => {
    const prompt = buildArchitectSystemPrompt(
      HARDWARE_COMPONENTS.slice(0, 1),
      [
        'search_nodes: 搜索n8n节点',
        'get_node: 获取节点详细配置',
      ],
      ALLOWED_NODE_TYPES,
      selectPromptVariant('baseline', 'seed')
    );

    expect(prompt).toContain('可用硬件组件');
    expect(prompt).toContain(HARDWARE_COMPONENTS[0].displayName);
    expect(prompt).toContain('search_nodes');
    expect(prompt).toContain('Reasoning');
    expect(prompt).toContain('parameters.jsCode = "return items;"');
    expect(prompt).toContain('<TOPOLOGY_PATTERNS>');
    expect(prompt).toContain('<NOTES_SPEC>');
  });

  it('builds static and dynamic fragments for refactor-5 context engineering', () => {
    const fragments = buildArchitectFragments(
      HARDWARE_COMPONENTS.slice(0, 1),
      ['search_nodes: 搜索n8n节点'],
      ALLOWED_NODE_TYPES,
      selectPromptVariant('baseline', 'seed')
    );
    const entityFragment = buildEntityBindingsFragment(
      [
        {
          name: '老刘',
          key: 'liu',
          bindings: {
            gesture: 'Middle_Finger',
            tts_text: '滚',
          },
        },
      ],
      'fan-out: face_net 识别后按人物分支'
    );

    expect(fragments.some((fragment) => fragment.id === 'topology_patterns')).toBe(true);
    expect(fragments.some((fragment) => fragment.id === 'emotion_interaction_pattern')).toBe(true);
    expect(fragments.some((fragment) => fragment.id === 'notes_spec')).toBe(true);
    expect(entityFragment.content).toContain('老刘');
    expect(entityFragment.content).toContain('fan-out');
  });

  it('encodes branch split and reaction-chain rules needed for safety-net retirement', () => {
    const prompt = buildArchitectSystemPrompt(
      HARDWARE_COMPONENTS.slice(0, 1),
      ['search_nodes: 搜索n8n节点'],
      ALLOWED_NODE_TYPES
    );

    expect(prompt).toContain('不要让多个结果分支共用同一个 SCREEN/TTS/SPEAKER 节点');
    expect(prompt).toContain('禁止多个分支共享同一个参数不同的 HAND、SCREEN、SPEAKER 节点');
    expect(prompt).toContain('HAND 后置 ASSIGN 应写 { robotGesture: "标准手势名" }');
    expect(prompt).toContain('默认每个 capability ID 只对应一个节点');
    expect(prompt).toContain('石头剪刀布专用拓扑');
    expect(prompt).toContain('notes.sub.gameLogic 必须写成实际比较逻辑');
    expect(prompt).toContain('共情场景专用拓扑');
    expect(prompt).toContain('ASR 和 LLM-EMO 各只需一个节点');
    expect(prompt).toContain('N 个主体 → N 个 FACE-NET 节点 → N 个 IF 节点');
    expect(prompt).toContain('每个 SPEAKER 必须恰好有一个 TTS 上游');
    expect(prompt).toContain('一个正确的 RPS 工作流应包含 >=20 个节点');
  });
});
