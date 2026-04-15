import { describe, expect, it, vi } from 'vitest';
import { WorkflowArchitect } from '../../../src/agents/workflow-architect';

describe('WorkflowArchitect', () => {
  it('returns workflow when validation passes', async () => {
    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        [
          'Reasoning: 使用摄像头识别人脸后执行动作。',
          '```json',
          JSON.stringify({ name: '测试工作流', nodes: [], connections: {} }, null, 2),
          '```',
        ].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.httpRequest',
        displayName: 'HTTP Request',
        defaultVersion: 4,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        statistics: {
          totalNodes: 0,
          enabledNodes: 0,
          triggerNodes: 0,
          validConnections: 0,
          invalidConnections: 0,
          expressionsValidated: 0,
        },
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '见到老刘打招呼',
      entities: { person_name: '老刘' },
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
    expect(result.workflow?.name).toBe('测试工作流');
    expect(result.reasoning).toContain('摄像头');
  });

  it('手势场景多人物时为每个人物生成独立 FACE-NET 节点', async () => {
    const sourceWorkflow = {
      name: 'Gesture Multi Person',
      nodes: [
        {
          id: '1',
          name: 'schedule_trigger_30s',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.1,
          position: [0, 0],
          parameters: { rule: { interval: [{}] } },
          notes: { category: 'BASE', title: '触发器', subtitle: '', extra: 'configured', session_ID: 'sess' },
        },
        {
          id: '2',
          name: 'http_request_camera_snapshot',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.3,
          position: [220, 0],
          parameters: {},
          notes: { category: 'CAM', title: '摄像头', subtitle: '', extra: 'pending', session_ID: 'sess', sub: { output: 'camera1' } },
        },
        {
          id: '3',
          name: 'set_face_net_recognition',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [440, 0],
          parameters: {},
          notes: { category: 'FACE-NET', title: '人脸识别', subtitle: '', extra: 'pending', session_ID: 'sess', sub: { facenet_input: 'camera1', facenet_output: 'facenet_output' } },
        },
        {
          id: '4',
          name: 'if_identity_is_liu',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [660, -120],
          parameters: {
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
              conditions: [
                {
                  id: 'c1',
                  leftValue: 'facenet_output',
                  rightValue: 'liu',
                  operator: { type: 'string', operation: 'equals', name: 'filter.operator.equals' },
                },
              ],
              combinator: 'and',
            },
          },
          notes: { category: 'BASE', title: '身份验证网关', subtitle: '', extra: 'configured', session_ID: 'sess' },
        },
        {
          id: '5',
          name: 'if_identity_is_fu',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [660, 120],
          parameters: {
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
              conditions: [
                {
                  id: 'c2',
                  leftValue: 'facenet_output',
                  rightValue: 'fu',
                  operator: { type: 'string', operation: 'equals', name: 'filter.operator.equals' },
                },
              ],
              combinator: 'and',
            },
          },
          notes: { category: 'BASE', title: '身份验证网关', subtitle: '', extra: 'configured', session_ID: 'sess' },
        },
        {
          id: '6',
          name: 'code_hand_execute',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [880, -60],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'HAND', title: '机械手', subtitle: '', extra: 'pending', session_ID: 'sess', sub: { execute_gesture: 'Middle_Finger' } },
        },
        {
          id: '7',
          name: 'set_tts_text',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [880, 60],
          parameters: {},
          notes: { category: 'TTS', title: '语音', subtitle: '', extra: 'pending', session_ID: 'sess', sub: { TTS_input: '', audio_name: 'audio_liu' } },
        },
        {
          id: '8',
          name: 'code_speaker_play_audio',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [1100, 60],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'SPEAKER', title: '喇叭', subtitle: '', extra: 'pending', session_ID: 'sess', sub: { audio_name: 'audio_liu' } },
        },
      ],
      connections: {
        schedule_trigger_30s: { main: [[{ node: 'http_request_camera_snapshot', type: 'main', index: 0 }]] },
        http_request_camera_snapshot: { main: [[{ node: 'set_face_net_recognition', type: 'main', index: 0 }]] },
        set_face_net_recognition: {
          main: [[
            { node: 'if_identity_is_liu', type: 'main', index: 0 },
            { node: 'if_identity_is_fu', type: 'main', index: 0 },
          ]],
        },
        if_identity_is_liu: { main: [[{ node: 'code_hand_execute', type: 'main', index: 0 }, { node: 'set_tts_text', type: 'main', index: 0 }], []] },
        if_identity_is_fu: { main: [[{ node: 'code_hand_execute', type: 'main', index: 0 }, { node: 'set_tts_text', type: 'main', index: 0 }], []] },
        set_tts_text: { main: [[{ node: 'code_speaker_play_audio', type: 'main', index: 0 }]] },
      },
    };

    let validatedWorkflow: any;
    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 多人物手势交互。', '```json', JSON.stringify(sourceWorkflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.set',
        displayName: 'Set',
        defaultVersion: 3.4,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (workflow: any) => {
        validatedWorkflow = workflow;
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: workflow.nodes.length,
            enabledNodes: workflow.nodes.length,
            triggerNodes: 1,
            validConnections: 1,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '见到老刘和老付就做动作',
      entities: { person_name: '老刘,老付', gesture: '中指' },
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
    const faceNetNodes = (validatedWorkflow?.nodes ?? []).filter(
      (node: any) => node?.notes?.category === 'FACE-NET'
    );
    expect(faceNetNodes.length).toBeGreaterThanOrEqual(2);
    expect(faceNetNodes.some((node: any) => node.name === 'set_face_net_recognition_liu')).toBe(true);
    expect(faceNetNodes.some((node: any) => node.name === 'set_face_net_recognition_fu')).toBe(true);

    const cameraTargets = (
      validatedWorkflow?.connections?.http_request_camera_snapshot?.main?.[0] ?? []
    ).map((item: any) => item.node);
    expect(cameraTargets).toEqual(['set_face_net_recognition_liu']);

    const firstFaceTargets = (
      validatedWorkflow?.connections?.set_face_net_recognition_liu?.main?.[0] ?? []
    ).map((item: any) => item.node);
    expect(firstFaceTargets).toContain('set_face_net_recognition_fu');
    expect(firstFaceTargets).toContain('if_identity_is_liu');

    const secondFaceTargets = (
      validatedWorkflow?.connections?.set_face_net_recognition_fu?.main?.[0] ?? []
    ).map((item: any) => item.node);
    expect(secondFaceTargets).toContain('if_identity_is_fu');
  });

  it('attempts autofix when validation fails', async () => {
    const workflow = { name: '失败工作流', nodes: [], connections: {} };
    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.httpRequest',
        displayName: 'HTTP Request',
        defaultVersion: 4,
        properties: [],
      }),
      validateWorkflow: vi
        .fn()
        .mockResolvedValueOnce({
          isValid: false,
          errors: [{ message: 'missing typeVersion' }],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: 0,
            enabledNodes: 0,
            triggerNodes: 0,
            validConnections: 0,
            invalidConnections: 1,
            expressionsValidated: 0,
          },
        })
        .mockResolvedValueOnce({
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: 0,
            enabledNodes: 0,
            triggerNodes: 0,
            validConnections: 0,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        }),
      autofixWorkflow: vi.fn().mockResolvedValue(workflow),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient, { maxIterations: 2 });
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
    expect(mcpClient.autofixWorkflow).toHaveBeenCalled();
  });

  it('normalizes legacy if node conditions before validation', async () => {
    const legacyWorkflow = {
      name: 'Legacy If Workflow',
      nodes: [
        {
          id: '1',
          name: 'If',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.3,
          position: [100, 200],
          parameters: {
            conditions: {
              string: [
                {
                  value1: '={{ $json.person_name }}',
                  operation: 'equal',
                  value2: '老刘',
                },
              ],
            },
            combineOperation: 'all',
          },
        },
      ],
      connections: {},
    };
    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(legacyWorkflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.if',
        displayName: 'If',
        defaultVersion: 2.3,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (workflow: any) => {
        const ifNode = workflow.nodes.find((node: any) => node.type === 'n8n-nodes-base.if');
        expect(ifNode.parameters.conditions).toEqual(
          expect.objectContaining({
            combinator: 'and',
            conditions: [
              expect.objectContaining({
                operator: { type: 'string', operation: 'equals' },
              }),
            ],
          })
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: 1,
            enabledNodes: 1,
            triggerNodes: 0,
            validConnections: 0,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
    expect(mcpClient.validateWorkflow).toHaveBeenCalled();
  });

  it('repairs truncated JSON responses', async () => {
    const truncated = '{\n  "name": "Truncated",\n  "nodes": [],\n  "connections": {}\n';
    const llmClient = {
      chat: vi.fn().mockResolvedValue(['Reasoning: 测试。', '```json', truncated, '```'].join('\n')),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.webhook',
        displayName: 'Webhook',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        statistics: {
          totalNodes: 0,
          enabledNodes: 0,
          triggerNodes: 0,
          validConnections: 0,
          invalidConnections: 0,
          expressionsValidated: 0,
        },
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
    expect(result.workflow?.name).toBe('Truncated');
  });

  it('uses LLM repair when JSON is invalid', async () => {
    const invalidJson = '{ "name": "Broken" "nodes": [], "connections": {} }';
    const repairedJson = JSON.stringify({ name: 'Fixed', nodes: [], connections: {} }, null, 2);
    const llmClient = {
      chat: vi
        .fn()
        .mockResolvedValueOnce(
          ['Reasoning: 测试。', '```json', invalidJson, '```'].join('\n')
        )
        .mockResolvedValueOnce(repairedJson),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.webhook',
        displayName: 'Webhook',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        statistics: {
          totalNodes: 0,
          enabledNodes: 0,
          triggerNodes: 0,
          validConnections: 0,
          invalidConnections: 0,
          expressionsValidated: 0,
        },
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
    expect(result.workflow?.name).toBe('Fixed');
    expect(llmClient.chat).toHaveBeenCalledTimes(2);
  });

  it('assigns unique node ids when missing or duplicated', async () => {
    const workflowWithMissingIds = {
      name: 'Missing IDs',
      nodes: [
        { name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], parameters: {} },
        { name: 'If', type: 'n8n-nodes-base.if', typeVersion: 2.3, position: [200, 0], parameters: { conditions: { combinator: 'and', conditions: [] } } },
        { id: 'dup', name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, position: [400, 0], parameters: {} },
        { id: 'dup', name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [600, 0], parameters: {} },
      ],
      connections: {},
    };
    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflowWithMissingIds, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.webhook',
        displayName: 'Webhook',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (workflow: any) => {
        const ids = workflow.nodes.map((node: any) => node.id);
        expect(ids.filter((id: string) => !id)).toHaveLength(0);
        expect(new Set(ids).size).toBe(ids.length);
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: workflow.nodes.length,
            enabledNodes: workflow.nodes.length,
            triggerNodes: 1,
            validConnections: 0,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('normalizes IF condition expressions into plain variable names', async () => {
    const workflow = {
      name: 'If Expression Prefix',
      nodes: [
        {
          id: '1',
          name: 'if_draw_same_gesture',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [100, 200],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [
                {
                  id: 'cond1',
                  leftValue: '={{$json.robotGesture}}',
                  rightValue: '{{$json.userGesture}}',
                  operator: {
                    type: 'string',
                    operation: 'equals',
                    name: 'filter.operator.equals',
                  },
                },
              ],
              options: {
                version: 1,
                typeValidation: 'strict',
                caseSensitive: true,
              },
            },
          },
          notes: { category: 'BASE' },
        },
      ],
      connections: {},
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };

    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.if',
        displayName: 'If',
        defaultVersion: 2.2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (normalized: any) => {
        const ifNode = normalized.nodes.find((node: any) => node.name === 'if_draw_same_gesture');
        expect(ifNode.parameters.conditions.conditions[0].rightValue).toBe('userGesture');
        expect(ifNode.parameters.conditions.conditions[0].leftValue).toBe('robotGesture');
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: 1,
            enabledNodes: 1,
            triggerNodes: 0,
            validConnections: 0,
            invalidConnections: 0,
            expressionsValidated: 2,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('normalizes connections to node names and fixes webhook response handling', async () => {
    const workflow = {
      name: 'Normalize Connections',
      nodes: [
        {
          id: 'node_webhook',
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2.1,
          position: [0, 0],
          parameters: {
            httpMethod: 'POST',
            path: 'test',
            responseMode: 'responseNode',
            options: {},
          },
        },
        {
          id: 'node_if',
          name: 'IF',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.3,
          position: [200, 0],
          parameters: { conditions: { combinator: 'and', conditions: [] } },
        },
      ],
      connections: {
        node_webhook: {
          main: [
            [
              {
                node: 'node_if',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
    };
    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.webhook',
        displayName: 'Webhook',
        defaultVersion: 2.1,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const webhook = wf.nodes.find((node: any) => node.type === 'n8n-nodes-base.webhook');
        const ifNode = wf.nodes.find((node: any) => node.type === 'n8n-nodes-base.if');
        expect(webhook?.name).toBeTruthy();
        expect(ifNode?.name).toBeTruthy();
        expect(wf.connections).toHaveProperty(webhook.name);
        expect(wf.connections[webhook.name].main[0][0].node).toBe(ifNode.name);
        expect(webhook.onError).toBe('continueRegularOutput');
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 1,
            validConnections: 0,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('normalizes set values and http request defaults', async () => {
    const workflow = {
      name: 'Normalize Defaults',
      nodes: [
        {
          id: 'node_set',
          name: 'Set',
          type: 'n8n-nodes-base.set',
          position: [0, 0],
          parameters: {
            values: {
              string: [
                {
                  name: 'text',
                  value: 'hello',
                },
              ],
            },
          },
        },
        {
          id: 'node_http',
          name: 'HTTP',
          type: 'n8n-nodes-base.httpRequest',
          position: [200, 0],
          parameters: {
            url: 'https://example.com',
          },
        },
      ],
      connections: {},
    };
    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.set',
        displayName: 'Set',
        defaultVersion: 3.4,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const setNode = wf.nodes.find((node: any) => node.type === 'n8n-nodes-base.set');
        expect(setNode.parameters.assignments).toBeDefined();
        expect(setNode.parameters.assignments.assignments).toEqual([]);
        expect(setNode.parameters.options).toEqual({});
        const httpNode = wf.nodes.find((node: any) => node.type === 'n8n-nodes-base.httpRequest');
        expect(httpNode.onError).toBeUndefined();
        expect(httpNode.parameters).toEqual(
          expect.objectContaining({
            method: 'POST',
            url: 'https://example.com',
            options: {},
          })
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 0,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('adds default connections when missing', async () => {
    const workflow = {
      name: 'Missing Connections',
      nodes: [
        {
          id: 'node_webhook',
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2.1,
          position: [0, 0],
          parameters: { path: 'test', httpMethod: 'POST' },
        },
        {
          id: 'node_set',
          name: 'Set',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [200, 0],
          parameters: {},
        },
      ],
    };
    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.webhook',
        displayName: 'Webhook',
        defaultVersion: 2.1,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const webhook = wf.nodes.find((node: any) => node.type === 'n8n-nodes-base.webhook');
        const setNode = wf.nodes.find((node: any) => node.type === 'n8n-nodes-base.set');
        expect(webhook?.name).toBeTruthy();
        expect(setNode?.name).toBeTruthy();
        expect(wf.connections).toHaveProperty(webhook.name);
        expect(wf.connections[webhook.name].main[0][0].node).toBe(setNode.name);
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 1,
            validConnections: 1,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('preserves name-keyed trigger chains after renaming the webhook node', async () => {
    const workflow = {
      name: 'Name Keyed Connections',
      nodes: [
        {
          id: 'node_webhook',
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          position: [0, 0],
          parameters: {
            httpMethod: 'POST',
            path: 'rock-paper-scissors',
            responseMode: 'responseNode',
            options: {},
          },
        },
        {
          id: 'node_code',
          name: '识别玩家手势',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [200, 0],
          parameters: { jsCode: 'return items;' },
        },
        {
          id: 'node_if',
          name: '判断机器人手势',
          type: 'n8n-nodes-base.if',
          typeVersion: 2,
          position: [400, 0],
          parameters: {
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
              conditions: [
                {
                  id: 'condition_rock',
                  leftValue: '={{ $json.robotGesture }}',
                  rightValue: 'rock',
                  operator: { type: 'string', operation: 'equals' },
                },
              ],
              combinator: 'and',
            },
          },
        },
        {
          id: 'node_http',
          name: '机械臂执行石头',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4,
          position: [600, 0],
          parameters: {
            method: 'POST',
            url: 'http://localhost:8080/robot/gesture',
            options: {},
          },
        },
      ],
      connections: {
        Webhook: {
          main: [[{ node: '识别玩家手势', type: 'main', index: 0 }]],
        },
        识别玩家手势: {
          main: [[{ node: '判断机器人手势', type: 'main', index: 0 }]],
        },
        判断机器人手势: {
          main: [[{ node: '机械臂执行石头', type: 'main', index: 0 }], []],
        },
      },
    };
    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.webhook',
        displayName: 'Webhook',
        defaultVersion: 2.1,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const webhook = wf.nodes.find((node: any) => node.type === 'n8n-nodes-base.webhook');
        expect(webhook?.name).toBe('基础流程_条件路由');
        expect(wf.nodes.length).toBeGreaterThanOrEqual(4);
        expect(wf.connections[webhook.name].main[0][0].node).toBe('识别玩家手势');
        const gestureSuccessor = wf.connections['识别玩家手势'].main[0][0].node;
        expect(['判断机器人手势', 'set_assign_for_______']).toContain(gestureSuccessor);
        const judgeNodeName = gestureSuccessor === '判断机器人手势'
          ? gestureSuccessor
          : wf.connections[gestureSuccessor].main[0][0].node;
        expect(judgeNodeName).toBe('判断机器人手势');
        expect(wf.connections['判断机器人手势'].main[0][0].node).toBe('机械臂执行石头');
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 1,
            validConnections: 3,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
    expect((result.workflow?.nodes.length ?? 0)).toBeGreaterThanOrEqual(4);
  });

  it('removes legacy sub fields and expressions from generated nodes', async () => {
    const legacyWorkflow = {
      name: 'Legacy Sub Workflow',
      nodes: [
        {
          id: '1',
          name: 'set_robot_random_gesture',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [100, 120],
          parameters: {},
          notes: {
            category: 'RAM',
            sub: {
              random_rule: 3,
              output: '={{Math.floor(Math.random() * 3) + 1}}',
              n: '={{Math.floor(Math.random() * 3) + 1}}',
            },
          },
        },
        {
          id: '2',
          name: 'set_yolo_user_gesture',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [360, 120],
          parameters: {},
          notes: {
            category: 'YOLO-RPS',
            sub: {
              yolov_input: 'camera1',
              yolov_output: 'userGesture',
              confidence: '={{$json.confidence}}',
            },
          },
        },
        {
          id: '3',
          name: 'set_countdown_config',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [620, 120],
          parameters: {},
          notes: {
            category: 'TTS',
            sub: {
              ttsText: '准备开始',
              ttsVoice: 'a',
            },
          },
        },
      ],
      connections: {
        set_robot_random_gesture: { main: [[{ node: 'set_yolo_user_gesture', type: 'main', index: 0 }]] },
        set_yolo_user_gesture: { main: [[{ node: 'set_countdown_config', type: 'main', index: 0 }]] },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 清理旧字段。', '```json', JSON.stringify(legacyWorkflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({}),
      validateWorkflow: vi.fn().mockImplementation(async (workflow: any) => {
        const byName = new Map(workflow.nodes.map((node: any) => [String(node.name), node]));
        const ramSub = byName.get('set_robot_random_gesture')?.notes?.sub ?? {};
        expect(ramSub.output).toBe('n');
        expect(ramSub.n).toBeUndefined();

        const yoloSub = byName.get('set_yolo_user_gesture')?.notes?.sub ?? {};
        expect(yoloSub.yolov_output).toBe('userGesture');
        expect(yoloSub.confidence).toBeUndefined();

        const ttsSub = byName.get('set_countdown_config')?.notes?.sub ?? {};
        expect(ttsSub.TTS_input).toBe('准备开始石头剪刀布游戏！三！二！一！');
        expect(ttsSub.ttsText).toBeUndefined();
        expect(ttsSub.ttsVoice).toBeUndefined();

        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: workflow.nodes.length,
            enabledNodes: workflow.nodes.length,
            triggerNodes: 0,
            validConnections: 2,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('restores missing random-branch IF leftValue as n', async () => {
    const workflow = {
      name: 'If Missing LeftValue',
      nodes: [
        {
          id: 'if_2',
          name: 'if_robot_gesture_scissors',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [100, 200],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [
                {
                  id: 'cond_2',
                  leftValue: null,
                  rightValue: 2,
                  operator: {
                    type: 'number',
                    operation: 'equals',
                    name: 'filter.operator.equals',
                  },
                },
              ],
              options: {
                version: 2,
                typeValidation: 'strict',
                caseSensitive: true,
                leftValue: '',
              },
            },
          },
          notes: { category: 'BASE' },
        },
      ],
      connections: {},
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };

    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.if',
        displayName: 'If',
        defaultVersion: 2.2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (normalized: any) => {
        const ifNode = normalized.nodes.find((node: any) => node.name === 'if_robot_gesture_scissors');
        expect(ifNode.parameters.conditions.conditions[0].leftValue).toBe('n');
        expect(ifNode.parameters.conditions.conditions[0].rightValue).toBe(2);
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: 1,
            enabledNodes: 1,
            triggerNodes: 0,
            validConnections: 0,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('prunes disconnected branches and keeps only primary trigger chain', async () => {
    const workflow = {
      name: 'Prune Disconnected',
      nodes: [
        {
          id: 'trigger_1',
          name: 'schedule_trigger_game',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.1,
          position: [0, 0],
          parameters: { rule: { interval: [{}] } },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_1',
          name: 'if_robot_n_eq_1',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [220, 0],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE' },
        },
        {
          id: 'hand_1',
          name: 'code_mechanical_hand_execute',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [440, 0],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'HAND', sub: { execute_gesture: 'Rock' } },
        },
        {
          id: 'orphan_1',
          name: 'set_orphan_branch',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [0, 220],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'ASSIGN', sub: { robotGesture: 'paper' } },
        },
        {
          id: 'orphan_2',
          name: 'code_orphan_screen',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [220, 220],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'SCREEN', sub: { execute_emoji: 'Sad' } },
        },
      ],
      connections: {
        schedule_trigger_game: { main: [[{ node: 'if_robot_n_eq_1', type: 'main', index: 0 }]] },
        if_robot_n_eq_1: { main: [[{ node: 'code_mechanical_hand_execute', type: 'main', index: 0 }], []] },
        set_orphan_branch: { main: [[{ node: 'code_orphan_screen', type: 'main', index: 0 }]] },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.scheduleTrigger',
        displayName: 'Schedule Trigger',
        defaultVersion: 1.1,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const names = new Set((wf.nodes || []).map((node: any) => node.name));
        expect(names.has('schedule_trigger_game')).toBe(true);
        expect(names.has('if_robot_n_eq_1')).toBe(true);
        expect(names.has('code_mechanical_hand_execute')).toBe(true);
        expect(names.has('set_orphan_branch')).toBe(false);
        expect(names.has('code_orphan_screen')).toBe(false);
        expect(wf.connections?.set_orphan_branch).toBeUndefined();

        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 1,
            validConnections: 2,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('maps executor-like categories to code nodes with empty parameters', async () => {
    const workflow = {
      name: 'Executor Mapping',
      nodes: [
        {
          id: 'trigger',
          name: 'schedule_trigger_game_start',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.1,
          position: [0, 0],
          parameters: { rule: { interval: [{}] } },
        },
        {
          id: 'hand',
          name: 'http_hand_execute_rock',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.3,
          position: [220, 0],
          parameters: {
            method: 'POST',
            url: 'http://robot.local/api/hand/gesture',
            options: {},
          },
          notes: {
            title: '物理手势驱动-石头',
            subtitle: '驱动机械手摆出石头形状',
            category: 'HAND',
            session_ID: '',
            extra: 'pending',
            sub: {
              execute_gesture: 'Rock',
            },
          },
        },
        {
          id: 'speaker',
          name: 'http_speaker_execute_countdown',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.3,
          position: [440, 0],
          parameters: {
            method: 'POST',
            url: 'http://robot.local/api/speaker/play',
            options: {},
          },
          notes: {
            title: '倒数音频播报',
            subtitle: '通过喇叭播放倒数语音',
            category: 'SPEAKER',
            session_ID: '',
            extra: 'pending',
            sub: {
              audio_name: 'count_down',
            },
          },
        },
        {
          id: 'screen',
          name: 'set_screen_execute_happy',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [660, 0],
          parameters: {
            assignments: {
              assignments: [{ name: 'emoji', value: 'Happy', type: 'string' }],
            },
            options: {},
          },
          notes: {
            title: '表情显示-开心',
            subtitle: '显示开心表情',
            category: 'SCREEN',
            session_ID: '',
            extra: 'pending',
            sub: {
              execute_emoji: 'Happy',
            },
          },
        },
      ],
      connections: {
        trigger: {
          main: [[{ node: 'hand', type: 'main', index: 0 }]],
        },
        hand: {
          main: [[{ node: 'speaker', type: 'main', index: 0 }]],
        },
        speaker: {
          main: [[{ node: 'screen', type: 'main', index: 0 }]],
        },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.code',
        displayName: 'Code',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const handNode = wf.nodes.find((node: any) => node.notes?.category === 'HAND');
        const speakerNode = wf.nodes.find((node: any) => node.notes?.category === 'SPEAKER');
        const screenNode = wf.nodes.find((node: any) => node.notes?.category === 'SCREEN');

        expect(handNode?.type).toBe('n8n-nodes-base.code');
        expect(handNode?.parameters).toEqual(expect.objectContaining({ jsCode: 'return items;' }));
        expect(handNode?.typeVersion).toBe(2);
        expect(speakerNode?.type).toBe('n8n-nodes-base.code');
        expect(speakerNode?.parameters).toEqual(expect.objectContaining({ jsCode: 'return items;' }));
        expect(speakerNode?.typeVersion).toBe(2);
        expect(screenNode?.type).toBe('n8n-nodes-base.code');
        expect(screenNode?.parameters).toEqual(expect.objectContaining({ jsCode: 'return items;' }));
        expect(screenNode?.typeVersion).toBe(2);

        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 1,
            validConnections: 3,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('forces screen category by name even when notes.category is wrong', async () => {
    const workflow = {
      name: 'Fix Screen Category',
      nodes: [
        {
          id: 'screen_1',
          name: 'code_screen_display_emoji',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [100, 100],
          parameters: {},
          notes: {
            title: '屏幕表情',
            subtitle: '显示表情',
            category: 'SPEAKER',
            session_ID: '',
            extra: 'pending',
            sub: { execute_emoji: 'Happy' },
          },
        },
      ],
      connections: {},
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.code',
        displayName: 'Code',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const screenNode = wf.nodes[0];
        expect(screenNode.notes.category).toBe('SCREEN');
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 0,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('prunes redundant base passthrough set nodes', async () => {
    const workflow = {
      name: 'Prune Set',
      nodes: [
        {
          id: 'trigger',
          name: 'schedule_trigger_game_start',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.1,
          position: [0, 0],
          parameters: { rule: { interval: [{}] } },
        },
        {
          id: 'passthrough',
          name: 'set_passthrough',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [220, 0],
          parameters: {
            assignments: { assignments: [] },
            options: {},
          },
        },
        {
          id: 'camera',
          name: 'http_camera_snapshot',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.3,
          position: [440, 0],
          parameters: {
            method: 'POST',
            url: 'http://robot.local/api/camera/snapshot',
            options: {},
          },
        },
      ],
      connections: {
        trigger: {
          main: [[{ node: 'passthrough', type: 'main', index: 0 }]],
        },
        passthrough: {
          main: [[{ node: 'camera', type: 'main', index: 0 }]],
        },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.set',
        displayName: 'Set',
        defaultVersion: 3.4,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const setNodes = wf.nodes.filter((node: any) => node.type === 'n8n-nodes-base.set');
        expect(setNodes).toHaveLength(0);

        const triggerNode = wf.nodes.find((node: any) => node.type === 'n8n-nodes-base.scheduleTrigger');
        const cameraNode = wf.nodes.find((node: any) => node.type === 'n8n-nodes-base.httpRequest');
        expect(triggerNode).toBeDefined();
        expect(cameraNode).toBeDefined();
        expect(wf.connections?.[triggerNode.name]?.main?.[0]?.[0]?.node).toBe(cameraNode.name);

        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 1,
            validConnections: 1,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('prunes redundant processor set nodes by naming pattern', async () => {
    const workflow = {
      name: 'Prune Processor Set',
      nodes: [
        {
          id: 'set1',
          name: 'set_tts_countdown',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [0, 0],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'TTS', sub: { audio_name: 'count_down' } },
        },
        {
          id: 'set2',
          name: 'set_extract_audio_url_countdown',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [220, 0],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'TTS', sub: { audio_name: 'count_down' } },
        },
        {
          id: 'speaker',
          name: 'code_speaker_countdown',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [440, 0],
          parameters: {},
          notes: { category: 'SPEAKER' },
        },
      ],
      connections: {
        set1: {
          main: [[{ node: 'set2', type: 'main', index: 0 }]],
        },
        set2: {
          main: [[{ node: 'speaker', type: 'main', index: 0 }]],
        },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.set',
        displayName: 'Set',
        defaultVersion: 3.4,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const nodeNames = wf.nodes.map((node: any) => node.name);
        expect(nodeNames).toContain('set_tts_countdown');
        expect(nodeNames).not.toContain('set_extract_audio_url_countdown');
        expect(wf.connections?.set_tts_countdown?.main?.[0]?.[0]?.node).toBe('code_speaker_countdown');
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 1,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('generates adaptive HAND title from node name gesture token', async () => {
    const workflow = {
      name: 'Adaptive Hand Title',
      nodes: [
        {
          id: 'hand_1',
          name: 'httpRequest_mechanical_hand_paper',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.3,
          position: [100, 100],
          parameters: {
            method: 'POST',
            url: 'http://robot.local/api/hand/gesture',
            options: {},
          },
          notes: {
            title: '物理手势驱动',
            subtitle: '驱动机械手摆出对应手势形态。',
            category: 'HAND',
            session_ID: '',
            extra: 'pending',
            sub: {},
          },
        },
      ],
      connections: {},
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.code',
        displayName: 'Code',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const handNode = wf.nodes.find((node: any) => node.notes?.category === 'HAND');
        expect(handNode?.notes?.title).toBe('机械手出布');
        expect(handNode?.notes?.subtitle).toContain('布');
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 0,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('generates adaptive titles for ASSIGN/SPEAKER/SCREEN nodes', async () => {
    const workflow = {
      name: 'Adaptive Titles',
      nodes: [
        {
          id: 'assign_1',
          name: 'set_robot_gesture_scissors',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [100, 100],
          parameters: {
            assignments: {
              assignments: [{ name: 'robotGesture', value: 'Scissors', type: 'string' }],
            },
            options: {},
          },
          notes: {
            title: '机器人手势赋值',
            subtitle: '数据记录单元，将随机结果映射为可执行手势标签。',
            category: 'ASSIGN',
            session_ID: '',
            extra: 'pending',
            sub: {},
          },
        },
        {
          id: 'speaker_1',
          name: 'code_speaker_execute_win',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [320, 100],
          parameters: { jsCode: 'return items;' },
          notes: {
            title: '结果音频播报',
            subtitle: '物理反馈单元，通过喇叭播报本轮对战结果。',
            category: 'SPEAKER',
            session_ID: '',
            extra: 'pending',
            sub: {},
          },
        },
        {
          id: 'screen_1',
          name: 'code_screen_execute_happy',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [540, 100],
          parameters: { jsCode: 'return items;' },
          notes: {
            title: '胜负表情展示',
            subtitle: '物理显示单元，根据结果展示对应情绪表情。',
            category: 'SCREEN',
            session_ID: '',
            extra: 'pending',
            sub: { execute_emoji: 'Happy' },
          },
        },
      ],
      connections: {
        assign_1: { main: [[{ node: 'speaker_1', type: 'main', index: 0 }]] },
        speaker_1: { main: [[{ node: 'screen_1', type: 'main', index: 0 }]] },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.code',
        displayName: 'Code',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const assignNode = wf.nodes.find((node: any) => node.notes?.category === 'ASSIGN');
        const speakerNode = wf.nodes.find((node: any) => node.notes?.category === 'SPEAKER');
        const screenNode = wf.nodes.find((node: any) => node.notes?.category === 'SCREEN');
        expect(assignNode?.notes?.title).toBe('机器人意图登记-剪刀');
        expect(speakerNode?.notes?.title).toBe('结果音频播报-获胜');
        expect(screenNode?.notes?.title).toBe('胜负表情展示-开心');
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 2,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('prunes countdown/extract passthrough set nodes and preserves multi-branch targets', async () => {
    const workflow = {
      name: 'Prune Countdown And Extract Sets',
      nodes: [
        {
          id: 'trigger',
          name: 'schedule_trigger',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.2,
          position: [0, 0],
          parameters: { rule: { interval: [{ field: 'seconds', secondsInterval: 5 }] } },
          notes: { category: 'BASE', sub: { seconds: 5 } },
        },
        {
          id: 'set1',
          name: 'set_countdown_config',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [220, 0],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'TTS', sub: { TTS_input: '三、二、一！', audio_name: 'count_down' } },
        },
        {
          id: 'tts',
          name: 'http_tts_countdown',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [440, 0],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'TTS', sub: { TTS_input: '三、二、一！', audio_name: 'count_down' } },
        },
        {
          id: 'set2',
          name: 'set_extract_user_gesture',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [660, 0],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'YOLO-RPS', sub: { yolov_output: 'userGesture' } },
        },
        {
          id: 'if1',
          name: 'if_branch_a',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.1,
          position: [880, -80],
          parameters: {
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
              conditions: [
                {
                  id: 'if1-cond',
                  leftValue: '={{$json.userGesture}}',
                  rightValue: 'rock',
                  operator: { type: 'string', operation: 'equals' },
                },
              ],
              combinator: 'and',
            },
            options: {},
          },
          notes: { category: 'BASE', sub: {} },
        },
        {
          id: 'if2',
          name: 'if_branch_b',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.1,
          position: [880, 80],
          parameters: {
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
              conditions: [
                {
                  id: 'if2-cond',
                  leftValue: '={{$json.userGesture}}',
                  rightValue: 'paper',
                  operator: { type: 'string', operation: 'equals' },
                },
              ],
              combinator: 'and',
            },
            options: {},
          },
          notes: { category: 'BASE', sub: {} },
        },
      ],
      connections: {
        schedule_trigger: {
          main: [[{ node: 'set_countdown_config', type: 'main', index: 0 }]],
        },
        set_countdown_config: {
          main: [[{ node: 'http_tts_countdown', type: 'main', index: 0 }]],
        },
        http_tts_countdown: {
          main: [[{ node: 'set_extract_user_gesture', type: 'main', index: 0 }]],
        },
        set_extract_user_gesture: {
          main: [[
            { node: 'if_branch_a', type: 'main', index: 0 },
            { node: 'if_branch_b', type: 'main', index: 0 },
          ]],
        },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.set',
        displayName: 'Set',
        defaultVersion: 3.4,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const nodeNames = wf.nodes.map((node: any) => node.name);
        expect(nodeNames).not.toContain('set_countdown_config');
        expect(nodeNames).not.toContain('set_extract_user_gesture');
        const firstHop = wf.connections?.schedule_trigger?.main?.[0] || [];
        expect(firstHop.some((entry: any) => entry?.node === 'http_tts_countdown')).toBe(true);
        const ttsTargets = wf.connections?.http_tts_countdown?.main?.[0] || [];
        const targetNames = ttsTargets.map((entry: any) => entry?.node);
        expect(targetNames).toContain('if_branch_a');
        expect(targetNames).toContain('if_branch_b');
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 1,
            validConnections: 3,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('adds per-gesture HAND executor nodes when game workflow has ASSIGN but no HAND', async () => {
    const workflow = {
      name: 'Ensure Hand Node',
      nodes: [
        {
          id: 'ram',
          name: 'set_random_robot_gesture',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [0, 0],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'RAM', sub: { random_rule: 3 } },
        },
        {
          id: 'assign_rock',
          name: 'set_robot_gesture_rock',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [220, -80],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'ASSIGN', sub: { robotGesture: 'rock' } },
        },
        {
          id: 'assign_scissors',
          name: 'set_robot_gesture_scissors',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [220, 0],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'ASSIGN', sub: { robotGesture: 'scissors' } },
        },
        {
          id: 'cam',
          name: 'http_camera_snapshot',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.3,
          position: [440, 0],
          parameters: { method: 'POST', url: 'http://camera.local/snapshot', options: {} },
          notes: { category: 'CAM', sub: { output: 'camera1' } },
        },
        {
          id: 'yolo',
          name: 'set_yolo_rps_recognition',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [660, 0],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'YOLO-RPS', sub: { yolov_input: 'camera1' } },
        },
      ],
      connections: {
        assign_rock: {
          main: [[{ node: 'http_camera_snapshot', type: 'main', index: 0 }]],
        },
        assign_scissors: {
          main: [[{ node: 'http_camera_snapshot', type: 'main', index: 0 }]],
        },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.code',
        displayName: 'Code',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const handNodes = wf.nodes.filter((node: any) => node.notes?.category === 'HAND');
        expect(handNodes).toHaveLength(2);
        expect(handNodes.map((node: any) => node.name)).toEqual(
          expect.arrayContaining(['code_hand_execute_rock', 'code_hand_execute_scissors'])
        );
        expect(handNodes.every((node: any) => node.type === 'n8n-nodes-base.code')).toBe(true);
        expect(wf.connections?.set_robot_gesture_rock?.main?.[0]?.some((item: any) => item.node === 'code_hand_execute_rock')).toBe(true);
        expect(wf.connections?.set_robot_gesture_scissors?.main?.[0]?.some((item: any) => item.node === 'code_hand_execute_scissors')).toBe(true);
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 3,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('normalizes duplicated ASR and LLM-EMO nodes into singleton emotion chain', async () => {
    const workflow = {
      name: 'Emotion Duplicate Chain',
      nodes: [
        {
          id: 'trigger',
          name: 'schedule_trigger_30s',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.1,
          position: [0, 0],
          parameters: { rule: { interval: [{}] } },
          notes: { category: 'BASE', sub: { seconds: 5 } },
        },
        {
          id: 'mic',
          name: 'http_request_microphone_capture',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.3,
          position: [220, 0],
          parameters: { method: 'POST', url: 'http://robot.local/api/mic/capture', options: {} },
          notes: { category: 'MIC', sub: { output: 'microphone1' } },
        },
        {
          id: 'asr_set',
          name: 'set_asr_processor',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [440, -80],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'ASR', sub: { asr_input: 'microphone1', asr_output: 'asr_output' } },
        },
        {
          id: 'asr_http',
          name: 'http_request_asr',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.3,
          position: [440, 80],
          parameters: { method: 'POST', url: 'http://robot.local/api/asr', options: {} },
          notes: { category: 'ASR', sub: { asr_input: 'microphone1', asr_output: 'asr_output' } },
        },
        {
          id: 'emo_set',
          name: 'set_llm_emotion',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [660, -80],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'LLM-EMO', sub: { llm_emo_input: 'asr_output', llm_emo_output: 'emotionText' } },
        },
        {
          id: 'emo_http',
          name: 'http_request_llm_emotion',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.3,
          position: [660, 80],
          parameters: { method: 'POST', url: 'http://robot.local/api/emo', options: {} },
          notes: { category: 'LLM-EMO', sub: { llm_emo_input: 'asr_output', llm_emo_output: 'emotionText' } },
        },
        {
          id: 'screen',
          name: 'code_screen_execute_emoji_happy',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [880, 0],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'SCREEN', sub: { execute_emoji: 'Happy' } },
        },
        {
          id: 'hand',
          name: 'code_hand_execute_happy',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [1100, 0],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'HAND', sub: { execute_gesture: 'Waving' } },
        },
        {
          id: 'speaker',
          name: 'code_speaker_play_audio_happy',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [1320, 0],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'SPEAKER', sub: { audio_name: 'audio_happy' } },
        },
      ],
      connections: {
        schedule_trigger_30s: { main: [[{ node: 'http_request_microphone_capture', type: 'main', index: 0 }]] },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 共情场景。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.set',
        displayName: 'Set',
        defaultVersion: 3.4,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const asrNodes = wf.nodes.filter((node: any) => node.notes?.category === 'ASR');
        const llmEmoNodes = wf.nodes.filter((node: any) => node.notes?.category === 'LLM-EMO');
        expect(asrNodes).toHaveLength(1);
        expect(llmEmoNodes).toHaveLength(1);
        expect(asrNodes[0]?.name).toBe('set_asr_recognition');
        expect(llmEmoNodes[0]?.name).toBe('set_llm_emotion');
        expect(wf.nodes.some((node: any) => node.name === 'http_request_asr')).toBe(false);
        expect(wf.nodes.some((node: any) => node.name === 'http_request_llm_emotion')).toBe(false);
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 1,
            validConnections: 1,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '我想做一个和我共情的机器人',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('keeps non-emotion helper nodes while incrementally completing emotion branches', async () => {
    const workflow = {
      name: 'Emotion Partial Chain',
      nodes: [
        {
          id: 'trigger',
          name: 'schedule_trigger_30s',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.1,
          position: [0, 0],
          parameters: { rule: { interval: [{}] } },
          notes: { category: 'BASE', sub: { seconds: 5 } },
        },
        {
          id: 'mic',
          name: 'http_request_microphone_capture',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.3,
          position: [220, 0],
          parameters: { method: 'POST', url: 'http://robot.local/api/mic/capture', options: {} },
          notes: { category: 'MIC', sub: { output: 'microphone1' } },
        },
        {
          id: 'asr',
          name: 'set_asr_recognition',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [440, 0],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'ASR', sub: { asr_input: 'microphone1', asr_output: 'asr_output' } },
        },
        {
          id: 'emo',
          name: 'set_llm_emotion',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [660, 0],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'LLM-EMO', sub: { llm_emo_input: 'asr_output', llm_emo_output: 'emotionText' } },
        },
        {
          id: 'if_happy',
          name: 'if_emotion_is_happy',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [880, 0],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE', sub: {} },
        },
        {
          id: 'screen_happy',
          name: 'code_screen_execute_emoji_happy',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [1100, 0],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'SCREEN', sub: { execute_emoji: 'Happy' } },
        },
        {
          id: 'hand_happy',
          name: 'code_hand_execute_happy',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [1320, 0],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'HAND', sub: { execute_gesture: 'Waving' } },
        },
        {
          id: 'speaker_happy',
          name: 'code_speaker_play_audio_happy',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [1540, 0],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'SPEAKER', sub: { audio_name: 'audio_happy' } },
        },
        {
          id: 'context',
          name: 'set_conversation_memory',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [1760, 0],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'BASE', sub: { memoryKey: 'lastEmotion' } },
        },
      ],
      connections: {
        schedule_trigger_30s: { main: [[{ node: 'http_request_microphone_capture', type: 'main', index: 0 }]] },
        http_request_microphone_capture: { main: [[{ node: 'set_asr_recognition', type: 'main', index: 0 }]] },
        set_asr_recognition: { main: [[{ node: 'set_llm_emotion', type: 'main', index: 0 }]] },
        set_llm_emotion: { main: [[{ node: 'if_emotion_is_happy', type: 'main', index: 0 }]] },
        if_emotion_is_happy: {
          main: [[
            { node: 'code_screen_execute_emoji_happy', type: 'main', index: 0 },
            { node: 'code_hand_execute_happy', type: 'main', index: 0 },
            { node: 'code_speaker_play_audio_happy', type: 'main', index: 0 },
          ], []],
        },
        code_speaker_play_audio_happy: {
          main: [[{ node: 'set_conversation_memory', type: 'main', index: 0 }]],
        },
      },
    };

    let validatedWorkflow: any;
    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 共情分支增量补全。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.set',
        displayName: 'Set',
        defaultVersion: 3.4,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        validatedWorkflow = wf;
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 1,
            validConnections: 1,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '我想做一个和我共情的机器人',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
    expect(validatedWorkflow.nodes.some((node: any) => node.name === 'set_conversation_memory')).toBe(true);
    expect(validatedWorkflow.nodes.some((node: any) => node.name === 'if_emotion_is_sad')).toBe(true);
    expect(validatedWorkflow.nodes.some((node: any) => node.name === 'set_tts_text_sad')).toBe(true);
    expect(validatedWorkflow.nodes.some((node: any) => node.name === 'code_speaker_play_audio_sad')).toBe(true);
  });

  it('inserts ASSIGN successor when HAND has no ASSIGN successor', async () => {
    const workflow = {
      name: 'Ensure Assign After Hand',
      nodes: [
        {
          id: 'hand_1',
          name: 'code_mechanical_hand_execute',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [100, 100],
          parameters: { jsCode: 'return items;' },
          notes: {
            category: 'HAND',
            sub: { execute_gesture: 'Rock' },
          },
        },
        {
          id: 'cam_1',
          name: 'http_camera_snapshot',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.3,
          position: [320, 100],
          parameters: {
            method: 'POST',
            url: 'http://robot.local/api/camera/snapshot',
            options: {},
          },
          notes: { category: 'CAM', sub: { output: 'camera1' } },
        },
      ],
      connections: {
        hand_1: {
          main: [[{ node: 'cam_1', type: 'main', index: 0 }]],
        },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.code',
        displayName: 'Code',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const assignNode = wf.nodes.find((node: any) => node.notes?.category === 'ASSIGN');
        expect(assignNode).toBeDefined();
        expect(assignNode.type).toBe('n8n-nodes-base.set');
        expect(assignNode.notes.sub.robotGesture).toBe('rock');

        const handNode = wf.nodes.find((node: any) => node.notes?.category === 'HAND');
        expect(wf.connections?.[handNode.name]?.main?.[0]?.[0]?.node).toBe(assignNode.name);
        expect(wf.connections?.[assignNode.name]?.main?.[0]?.[0]?.node).toBe('http_camera_snapshot');

        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 2,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('rewires IF branches to direct HAND/SCREEN executors and removes bridge SET nodes', async () => {
    const workflow = {
      name: 'If Direct Executor',
      nodes: [
        {
          id: 'trigger_1',
          name: 'schedule_trigger',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.1,
          position: [0, 0],
          parameters: { rule: { interval: [{}] } },
          notes: { category: 'BASE', sub: { seconds: 5 } },
        },
        {
          id: 'if_1',
          name: 'if_robot_choice',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [220, 0],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [
                {
                  id: 'cond_1',
                  leftValue: '={{$json.n}}',
                  rightValue: '1',
                  operator: {
                    type: 'string',
                    operation: 'equals',
                    name: 'filter.operator.equals',
                  },
                },
              ],
              options: {
                version: 1,
                typeValidation: 'strict',
                caseSensitive: true,
              },
            },
          },
          notes: { category: 'BASE' },
        },
        {
          id: 'set_rock_bridge',
          name: 'set_robot_rock_bridge',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [440, 0],
          parameters: {
            assignments: {
              assignments: [{ name: 'robotGesture', value: 'Rock', type: 'string' }],
            },
            options: {},
          },
          notes: { category: 'BASE', sub: { execute_gesture: 'Rock' } },
        },
        {
          id: 'hand_rock',
          name: 'code_hand_rock',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [660, 0],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'HAND', sub: {} },
        },
        {
          id: 'assign_rock',
          name: 'set_robot_assign_rock',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [880, 0],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'ASSIGN', sub: { robotGesture: 'rock' } },
        },
        {
          id: 'if_2',
          name: 'if_result_win',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [1100, 0],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [
                {
                  id: 'cond_2',
                  leftValue: '={{$json.result}}',
                  rightValue: 'win',
                  operator: {
                    type: 'string',
                    operation: 'equals',
                    name: 'filter.operator.equals',
                  },
                },
              ],
              options: {
                version: 1,
                typeValidation: 'strict',
                caseSensitive: true,
              },
            },
          },
          notes: { category: 'BASE' },
        },
        {
          id: 'set_screen_bridge',
          name: 'set_screen_win_bridge',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [1320, 0],
          parameters: {
            assignments: {
              assignments: [{ name: 'emoji', value: 'Happy', type: 'string' }],
            },
            options: {},
          },
          notes: { category: 'BASE', sub: { execute_emoji: 'Happy' } },
        },
        {
          id: 'screen_win',
          name: 'code_screen_win',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [1540, 0],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'SCREEN', sub: {} },
        },
      ],
      connections: {
        schedule_trigger: {
          main: [[{ node: 'if_robot_choice', type: 'main', index: 0 }]],
        },
        if_robot_choice: {
          main: [[{ node: 'set_robot_rock_bridge', type: 'main', index: 0 }], []],
        },
        set_robot_rock_bridge: {
          main: [[{ node: 'code_hand_rock', type: 'main', index: 0 }]],
        },
        code_hand_rock: {
          main: [[{ node: 'set_robot_assign_rock', type: 'main', index: 0 }]],
        },
        set_robot_assign_rock: {
          main: [[{ node: 'if_result_win', type: 'main', index: 0 }]],
        },
        if_result_win: {
          main: [[{ node: 'set_screen_win_bridge', type: 'main', index: 0 }], []],
        },
        set_screen_win_bridge: {
          main: [[{ node: 'code_screen_win', type: 'main', index: 0 }]],
        },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.code',
        displayName: 'Code',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const nodeNames = new Set((wf.nodes || []).map((node: any) => node.name));
        expect(nodeNames.has('set_robot_rock_bridge')).toBe(false);
        expect(nodeNames.has('set_screen_win_bridge')).toBe(false);

        expect(wf.connections?.if_robot_choice?.main?.[0]?.[0]?.node).toBe('code_hand_rock');
        expect(wf.connections?.if_result_win?.main?.[0]?.[0]?.node).toBe('code_screen_win');
        expect(wf.connections?.code_hand_rock?.main?.[0]?.[0]?.node).toBe('set_robot_assign_rock');

        const handNode = wf.nodes.find((node: any) => node.name === 'code_hand_rock');
        const screenNode = wf.nodes.find((node: any) => node.name === 'code_screen_win');
        expect(handNode?.notes?.sub?.execute_gesture).toBe('Rock');
        expect(screenNode?.notes?.sub?.execute_emoji).toBe('Happy');

        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 1,
            validConnections: 5,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('splits shared executors when IF branches require different HAND/SCREEN parameters', async () => {
    const workflow = {
      name: 'Split Shared Executors',
      nodes: [
        {
          id: 'if_1',
          name: 'if_robot_n_eq_1',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 0],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [],
              options: { version: 1, typeValidation: 'strict', caseSensitive: true },
            },
          },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_2',
          name: 'if_robot_n_eq_2',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 120],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [],
              options: { version: 1, typeValidation: 'strict', caseSensitive: true },
            },
          },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_3',
          name: 'if_robot_n_eq_3',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 240],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [],
              options: { version: 1, typeValidation: 'strict', caseSensitive: true },
            },
          },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_win',
          name: 'if_robot_rock_user_scissors_win',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [760, 0],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [],
              options: { version: 1, typeValidation: 'strict', caseSensitive: true },
            },
          },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_lose',
          name: 'if_robot_scissors_user_rock_lose',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [760, 120],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [],
              options: { version: 1, typeValidation: 'strict', caseSensitive: true },
            },
          },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_draw',
          name: 'if_draw_game',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [760, 240],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [],
              options: { version: 1, typeValidation: 'strict', caseSensitive: true },
            },
          },
          notes: { category: 'BASE' },
        },
        {
          id: 'hand_shared',
          name: 'code_mechanical_hand_execute',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [260, 120],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'HAND', sub: { execute_gesture: 'Rock' } },
        },
        {
          id: 'assign_shared',
          name: 'set_assign_shared',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [470, 120],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'ASSIGN', sub: { robotGesture: 'rock' } },
        },
        {
          id: 'camera_1',
          name: 'http_camera_snapshot',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.3,
          position: [680, 120],
          parameters: { method: 'POST', url: 'http://robot.local/api/camera/snapshot', options: {} },
          notes: { category: 'CAM', sub: { output: 'camera1' } },
        },
        {
          id: 'screen_shared',
          name: 'code_screen_display_emoji',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [1020, 120],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'SCREEN', sub: { execute_emoji: 'Angry' } },
        },
      ],
      connections: {
        if_robot_n_eq_1: { main: [[{ node: 'code_mechanical_hand_execute', type: 'main', index: 0 }], []] },
        if_robot_n_eq_2: { main: [[{ node: 'code_mechanical_hand_execute', type: 'main', index: 0 }], []] },
        if_robot_n_eq_3: { main: [[{ node: 'code_mechanical_hand_execute', type: 'main', index: 0 }], []] },
        code_mechanical_hand_execute: { main: [[{ node: 'set_assign_shared', type: 'main', index: 0 }]] },
        set_assign_shared: { main: [[{ node: 'http_camera_snapshot', type: 'main', index: 0 }]] },
        if_robot_rock_user_scissors_win: { main: [[{ node: 'code_screen_display_emoji', type: 'main', index: 0 }], []] },
        if_robot_scissors_user_rock_lose: { main: [[{ node: 'code_screen_display_emoji', type: 'main', index: 0 }], []] },
        if_draw_game: { main: [[{ node: 'code_screen_display_emoji', type: 'main', index: 0 }], []] },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.code',
        displayName: 'Code',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const byName = new Map((wf.nodes || []).map((node: any) => [node.name, node]));
        const resolveIfTarget = (ifName: string) => wf.connections?.[ifName]?.main?.[0]?.[0]?.node;

        const handCases: Array<{ ifName: string; expected: string }> = [
          { ifName: 'if_robot_n_eq_1', expected: 'Rock' },
          { ifName: 'if_robot_n_eq_2', expected: 'Scissors' },
          { ifName: 'if_robot_n_eq_3', expected: 'Paper' },
        ];
        const handTargets = handCases.map((item) => resolveIfTarget(item.ifName));
        expect(new Set(handTargets).size).toBe(3);
        handCases.forEach((item) => {
          const targetName = resolveIfTarget(item.ifName);
          const node = byName.get(targetName);
          expect(node?.notes?.category).toBe('HAND');
          expect(node?.notes?.sub?.execute_gesture).toBe(item.expected);
          const expectedTitle =
            item.expected === 'Rock'
              ? '机械手出石头'
              : item.expected === 'Scissors'
                ? '机械手出剪刀'
                : '机械手出布';
          expect(node?.notes?.title).toBe(expectedTitle);
        });

        const screenCases: Array<{ ifName: string; expected: string }> = [
          { ifName: 'if_robot_rock_user_scissors_win', expected: 'Happy' },
          { ifName: 'if_robot_scissors_user_rock_lose', expected: 'Sad' },
          { ifName: 'if_draw_game', expected: 'Angry' },
        ];
        const screenTargets = screenCases.map((item) => resolveIfTarget(item.ifName));
        expect(new Set(screenTargets).size).toBe(3);
        screenCases.forEach((item) => {
          const targetName = resolveIfTarget(item.ifName);
          const node = byName.get(targetName);
          expect(node?.notes?.category).toBe('SCREEN');
          expect(node?.notes?.sub?.execute_emoji).toBe(item.expected);
        });

        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 9,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('builds independent result branches for empty/draw/win/lose', async () => {
    const workflow = {
      name: 'Result Branch Split',
      nodes: [
        {
          id: 'if_1',
          name: 'if_gesture_empty',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 0],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_2',
          name: 'if_draw',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 120],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_3',
          name: 'if_rock_vs_scissors',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 240],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_4',
          name: 'if_scissors_vs_paper',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 320],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_5',
          name: 'if_paper_vs_rock',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 400],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_6',
          name: 'if_rock_vs_paper',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 520],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_7',
          name: 'if_scissors_vs_rock',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 600],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_8',
          name: 'if_paper_vs_scissors',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 680],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE' },
        },
        {
          id: 'screen_shared',
          name: 'http_screen_emoji',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [400, 320],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'SCREEN', sub: { execute_emoji: 'Angry' } },
        },
        {
          id: 'tts_shared',
          name: 'set_audio_generate_result',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [620, 320],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'TTS', sub: { TTS_input: 'result', audio_name: 'result_audio' } },
        },
        {
          id: 'speaker_shared',
          name: 'code_speaker_execute_result',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [840, 320],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'SPEAKER', sub: { audio_name: 'result_audio' } },
        },
      ],
      connections: {
        if_gesture_empty: { main: [[{ node: 'http_screen_emoji', type: 'main', index: 0 }], []] },
        if_draw: { main: [[{ node: 'http_screen_emoji', type: 'main', index: 0 }], []] },
        if_rock_vs_scissors: { main: [[{ node: 'http_screen_emoji', type: 'main', index: 0 }], []] },
        if_scissors_vs_paper: { main: [[{ node: 'http_screen_emoji', type: 'main', index: 0 }], []] },
        if_paper_vs_rock: { main: [[{ node: 'http_screen_emoji', type: 'main', index: 0 }], []] },
        if_rock_vs_paper: { main: [[{ node: 'http_screen_emoji', type: 'main', index: 0 }], []] },
        if_scissors_vs_rock: { main: [[{ node: 'http_screen_emoji', type: 'main', index: 0 }], []] },
        if_paper_vs_scissors: { main: [[{ node: 'http_screen_emoji', type: 'main', index: 0 }], []] },
        http_screen_emoji: { main: [[{ node: 'set_audio_generate_result', type: 'main', index: 0 }]] },
        set_audio_generate_result: { main: [[{ node: 'code_speaker_execute_result', type: 'main', index: 0 }]] },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.code',
        displayName: 'Code',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const expectTarget = (ifName: string) => wf.connections?.[ifName]?.main?.[0]?.[0]?.node;

        expect(expectTarget('if_gesture_empty')).toBe('code_screen_execute_empty_angry');
        expect(expectTarget('if_draw')).toBe('code_screen_execute_draw_angry');
        expect(expectTarget('if_rock_vs_scissors')).toBe('code_screen_execute_win_happy');
        expect(expectTarget('if_rock_vs_paper')).toBe('code_screen_execute_lose_sad');

        expect(wf.connections?.code_screen_execute_empty_angry?.main?.[0]?.[0]?.node).toBe('set_audio_generate_empty');
        expect(wf.connections?.set_audio_generate_empty?.main?.[0]?.[0]?.node).toBe('code_speaker_execute_empty');
        expect(wf.connections?.code_screen_execute_draw_angry?.main?.[0]?.[0]?.node).toBe('set_audio_generate_draw');
        expect(wf.connections?.set_audio_generate_draw?.main?.[0]?.[0]?.node).toBe('code_speaker_execute_draw');
        expect(wf.connections?.code_screen_execute_win_happy?.main?.[0]?.[0]?.node).toBe('set_audio_generate_win');
        expect(wf.connections?.set_audio_generate_win?.main?.[0]?.[0]?.node).toBe('code_speaker_execute_win');
        expect(wf.connections?.code_screen_execute_lose_sad?.main?.[0]?.[0]?.node).toBe('set_audio_generate_lose');
        expect(wf.connections?.set_audio_generate_lose?.main?.[0]?.[0]?.node).toBe('code_speaker_execute_lose');

        const byName = new Map((wf.nodes || []).map((node: any) => [node.name, node]));
        expect(byName.get('code_screen_execute_win_happy')?.notes?.sub?.execute_emoji).toBe('Happy');
        expect(byName.get('code_screen_execute_lose_sad')?.notes?.sub?.execute_emoji).toBe('Sad');
        expect(byName.get('set_audio_generate_win')?.notes?.sub?.audio_name).toBe('win_audio');
        expect(byName.get('code_speaker_execute_lose')?.notes?.sub?.audio_name).toBe('lose_audio');

        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 16,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('can disable result-branch safety net to observe raw shared-branch output', async () => {
    const workflow = {
      name: 'Shared Result Branches',
      nodes: [
        {
          id: 'if_1',
          name: 'if_draw',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 0],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE' },
        },
        {
          id: 'screen_shared',
          name: 'http_screen_emoji',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [300, 0],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'SCREEN', sub: { execute_emoji: 'Angry' } },
        },
      ],
      connections: {
        if_draw: { main: [[{ node: 'http_screen_emoji', type: 'main', index: 0 }], []] },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 保持原始结构。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.code',
        displayName: 'Code',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const nodeNames = new Set((wf.nodes || []).map((node: any) => node.name));
        expect(nodeNames.has('http_screen_emoji')).toBe(true);
        expect(nodeNames.has('code_screen_execute_draw_angry')).toBe(false);
        expect(wf.connections?.if_draw?.main?.[0]?.[0]?.node).toBe('http_screen_emoji');
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 1,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient, {
      sceneSafetyNetFlags: {
        ensureResultBranches: false,
      },
    });
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('bypasses ASSIGN bridge between IF and shared HAND to keep 3-way gesture branches', async () => {
    const workflow = {
      name: 'If Assign Bridge Hand',
      nodes: [
        {
          id: 'if_1',
          name: 'if_robot_rock',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 0],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_2',
          name: 'if_robot_scissors',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 120],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_3',
          name: 'if_robot_paper',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 240],
          parameters: { conditions: { combinator: 'and', conditions: [], options: { version: 1 } } },
          notes: { category: 'BASE' },
        },
        {
          id: 'set_1',
          name: 'set_robot_gesture_rock',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [220, 0],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'ASSIGN', sub: { robotGesture: 'rock' } },
        },
        {
          id: 'set_2',
          name: 'set_robot_gesture_scissors',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [220, 120],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'ASSIGN', sub: { robotGesture: 'scissors' } },
        },
        {
          id: 'set_3',
          name: 'set_robot_gesture_paper',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [220, 240],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'ASSIGN', sub: { robotGesture: 'paper' } },
        },
        {
          id: 'hand_shared',
          name: 'code_mechanical_hand_execute',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [440, 120],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'HAND', sub: { execute_gesture: 'Rock' } },
        },
        {
          id: 'camera_1',
          name: 'http_camera_snapshot',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.3,
          position: [760, 120],
          parameters: { method: 'POST', url: 'http://robot.local/api/camera/snapshot', options: {} },
          notes: { category: 'CAM', sub: { output: 'camera1' } },
        },
      ],
      connections: {
        if_robot_rock: { main: [[{ node: 'set_robot_gesture_rock', type: 'main', index: 0 }], []] },
        if_robot_scissors: { main: [[{ node: 'set_robot_gesture_scissors', type: 'main', index: 0 }], []] },
        if_robot_paper: { main: [[{ node: 'set_robot_gesture_paper', type: 'main', index: 0 }], []] },
        set_robot_gesture_rock: { main: [[{ node: 'code_mechanical_hand_execute', type: 'main', index: 0 }]] },
        set_robot_gesture_scissors: { main: [[{ node: 'code_mechanical_hand_execute', type: 'main', index: 0 }]] },
        set_robot_gesture_paper: { main: [[{ node: 'code_mechanical_hand_execute', type: 'main', index: 0 }]] },
        code_mechanical_hand_execute: { main: [[{ node: 'http_camera_snapshot', type: 'main', index: 0 }]] },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.code',
        displayName: 'Code',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const nodeNames = new Set((wf.nodes || []).map((node: any) => node.name));
        expect(nodeNames.has('set_robot_gesture_rock')).toBe(false);
        expect(nodeNames.has('set_robot_gesture_scissors')).toBe(false);
        expect(nodeNames.has('set_robot_gesture_paper')).toBe(false);

        const byName = new Map((wf.nodes || []).map((node: any) => [node.name, node]));
        const resolveIfTarget = (ifName: string) => wf.connections?.[ifName]?.main?.[0]?.[0]?.node;

        const cases = [
          { ifName: 'if_robot_rock', expected: 'Rock' },
          { ifName: 'if_robot_scissors', expected: 'Scissors' },
          { ifName: 'if_robot_paper', expected: 'Paper' },
        ];
        const targets = cases.map((c) => resolveIfTarget(c.ifName));
        expect(new Set(targets).size).toBe(3);
        cases.forEach((item) => {
          const node = byName.get(resolveIfTarget(item.ifName));
          expect(node?.notes?.category).toBe('HAND');
          expect(node?.notes?.sub?.execute_gesture).toBe(item.expected);
        });

        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 6,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('builds result branches from IF condition semantics when names are non-semantic', async () => {
    const workflow = {
      name: 'Semantic Branch Inference',
      nodes: [
        {
          id: 'if_a',
          name: 'if_branch_a',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 0],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [
                { id: 'robot_rock', leftValue: '={{$json.robotGesture}}', rightValue: 'rock' },
                { id: 'user_scissors', leftValue: '={{$json.userGesture}}', rightValue: 'scissors' },
              ],
              options: { version: 1 },
            },
          },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_b',
          name: 'if_branch_b',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 120],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [
                { id: 'robot_scissors', leftValue: '={{$json.robotGesture}}', rightValue: 'scissors' },
                { id: 'user_rock', leftValue: '={{$json.userGesture}}', rightValue: 'rock' },
              ],
              options: { version: 1 },
            },
          },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_c',
          name: 'if_branch_c',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 240],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [
                { id: 'robot_paper', leftValue: '={{$json.robotGesture}}', rightValue: 'paper' },
                { id: 'user_paper', leftValue: '={{$json.userGesture}}', rightValue: 'paper' },
              ],
              options: { version: 1 },
            },
          },
          notes: { category: 'BASE' },
        },
        {
          id: 'if_d',
          name: 'if_branch_d',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 360],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [
                { id: 'user_gesture_empty', leftValue: '={{$json.userGesture}}', rightValue: '' },
              ],
              options: { version: 1 },
            },
          },
          notes: { category: 'BASE' },
        },
        {
          id: 'screen_shared',
          name: 'http_screen_emoji',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [420, 180],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'SCREEN', sub: { execute_emoji: 'Angry' } },
        },
      ],
      connections: {
        if_branch_a: { main: [[{ node: 'http_screen_emoji', type: 'main', index: 0 }], []] },
        if_branch_b: { main: [[{ node: 'http_screen_emoji', type: 'main', index: 0 }], []] },
        if_branch_c: { main: [[{ node: 'http_screen_emoji', type: 'main', index: 0 }], []] },
        if_branch_d: { main: [[{ node: 'http_screen_emoji', type: 'main', index: 0 }], []] },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.code',
        displayName: 'Code',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const expectTarget = (ifName: string) => wf.connections?.[ifName]?.main?.[0]?.[0]?.node;
        expect(expectTarget('if_branch_a')).toBe('code_screen_execute_win_happy');
        expect(expectTarget('if_branch_b')).toBe('code_screen_execute_lose_sad');
        expect(expectTarget('if_branch_c')).toBe('code_screen_execute_draw_angry');
        expect(expectTarget('if_branch_d')).toBe('code_screen_execute_empty_angry');

        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 8,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('uses IF notes.sub metadata to drive executor split when branch names are non-semantic', async () => {
    const workflow = {
      name: 'Metadata Driven Split',
      nodes: [
        {
          id: 'if_a',
          name: 'if_branch_a',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 0],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [],
              options: { version: 1, typeValidation: 'strict', caseSensitive: true },
            },
          },
          notes: { category: 'BASE', sub: { expected_hand_gesture: 'Rock' } },
        },
        {
          id: 'if_b',
          name: 'if_branch_b',
          type: 'n8n-nodes-base.if',
          typeVersion: 2.2,
          position: [0, 120],
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [],
              options: { version: 1, typeValidation: 'strict', caseSensitive: true },
            },
          },
          notes: { category: 'BASE', sub: { expected_hand_gesture: 'Scissors' } },
        },
        {
          id: 'hand_shared',
          name: 'code_hand_execute',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [220, 60],
          parameters: { jsCode: 'return items;' },
          notes: { category: 'HAND', sub: { execute_gesture: 'Rock' } },
        },
        {
          id: 'assign_shared',
          name: 'set_assign_shared',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [440, 60],
          parameters: { assignments: { assignments: [] }, options: {} },
          notes: { category: 'ASSIGN', sub: { robotGesture: 'rock' } },
        },
      ],
      connections: {
        if_branch_a: { main: [[{ node: 'code_hand_execute', type: 'main', index: 0 }], []] },
        if_branch_b: { main: [[{ node: 'code_hand_execute', type: 'main', index: 0 }], []] },
        code_hand_execute: { main: [[{ node: 'set_assign_shared', type: 'main', index: 0 }]] },
      },
    };

    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.code',
        displayName: 'Code',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const byName = new Map((wf.nodes || []).map((node: any) => [node.name, node]));
        const targetA = wf.connections?.if_branch_a?.main?.[0]?.[0]?.node;
        const targetB = wf.connections?.if_branch_b?.main?.[0]?.[0]?.node;
        expect(targetA).not.toBe(targetB);
        expect(byName.get(targetA)?.notes?.sub?.execute_gesture).toBe('Rock');
        expect(byName.get(targetB)?.notes?.sub?.execute_gesture).toBe('Scissors');

        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 3,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('extracts JSON from uppercase code fences and ignores leading text', async () => {
    const workflow = { name: 'Fence Workflow', nodes: [], connections: {} };
    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        [
          '说明: {person_name, gesture}',
          '```JSON\r',
          JSON.stringify(workflow, null, 2),
          '```',
        ].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.webhook',
        displayName: 'Webhook',
        defaultVersion: 2,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        statistics: {
          totalNodes: 0,
          enabledNodes: 0,
          triggerNodes: 0,
          validConnections: 0,
          invalidConnections: 0,
          expressionsValidated: 0,
        },
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
    expect(result.workflow?.name).toBe('Fence Workflow');
  });

  it('normalizes node naming and notes metadata fields', async () => {
    const workflow = {
      name: 'Metadata Normalize',
      nodes: [
        {
          id: 'node_schedule',
          name: 'Schedule Trigger',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.1,
          position: [0, 0],
          parameters: { rule: { interval: [{}] } },
          notes: '{"extra":"pending"}',
        },
        {
          id: 'node_tts',
          name: 'Set Countdown',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [200, 0],
          parameters: {
            assignments: {
              assignments: [
                { name: 'countdownText', type: 'string', value: '三、二、一！' },
              ],
            },
            options: {},
          },
        },
      ],
      connections: {
        node_schedule: {
          main: [[{ node: 'node_tts', type: 'main', index: 0 }]],
        },
      },
    };
    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.set',
        displayName: 'Set',
        defaultVersion: 3.4,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const scheduleNode = wf.nodes.find((node: any) => node.type === 'n8n-nodes-base.scheduleTrigger');
        const ttsNode = wf.nodes.find((node: any) => node.type === 'n8n-nodes-base.set');
        expect(scheduleNode.name).toMatch(/^schedule_trigger_/);
        expect(scheduleNode.notes).toEqual(
          expect.objectContaining({
            title: '游戏开始触发器',
            category: 'BASE',
            extra: 'configured',
          })
        );
        expect(scheduleNode.notes.sub).toEqual(expect.objectContaining({ seconds: 0.5 }));
        expect(ttsNode.notes).toEqual(
          expect.objectContaining({
            category: 'TTS',
            title: '倒数语音合成',
          })
        );
        expect(ttsNode.notes.sub).toEqual(
          expect.objectContaining({ TTS_input: '准备开始石头剪刀布游戏！三！二！一！' })
        );
        expect(Object.keys(wf.connections)).toContain(scheduleNode.name);
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 1,
            validConnections: 1,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });

  it('ensures duplicate node names are made unique', async () => {
    const workflow = {
      name: 'Duplicate Names',
      nodes: [
        {
          id: 'n1',
          name: 'set_tts_generate_countdown',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [0, 0],
          parameters: {},
        },
        {
          id: 'n2',
          name: 'set_tts_generate_countdown',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.4,
          position: [200, 0],
          parameters: {},
        },
      ],
      connections: {
        n1: {
          main: [[{ node: 'n2', type: 'main', index: 0 }]],
        },
      },
    };
    const llmClient = {
      chat: vi.fn().mockResolvedValue(
        ['Reasoning: 测试。', '```json', JSON.stringify(workflow, null, 2), '```'].join('\n')
      ),
    };
    const mcpClient = {
      searchNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
      getNode: vi.fn().mockResolvedValue({
        nodeType: 'n8n-nodes-base.set',
        displayName: 'Set',
        defaultVersion: 3.4,
        properties: [],
      }),
      validateWorkflow: vi.fn().mockImplementation(async (wf: any) => {
        const names = wf.nodes.map((node: any) => node.name);
        expect(new Set(names).size).toBe(names.length);
        expect(names[0]).toBe('set_tts_generate_countdown');
        expect(names[1]).toBe('set_tts_generate_countdown_1');
        const connectionTargets = Object.values(wf.connections as Record<string, any>)
          .flatMap((mapping: any) => (Array.isArray(mapping.main) ? mapping.main : []))
          .flatMap((group: any) => (Array.isArray(group) ? group : []))
          .map((connection: any) => connection.node);
        expect(connectionTargets).toContain(names[1]);
        return {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: wf.nodes.length,
            enabledNodes: wf.nodes.length,
            triggerNodes: 0,
            validConnections: 1,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        };
      }),
      autofixWorkflow: vi.fn(),
    } as any;

    const architect = new WorkflowArchitect(llmClient as any, mcpClient);
    const result = await architect.generateWorkflow({
      userIntent: '测试',
      entities: {},
      hardwareComponents: [],
      conversationHistory: [],
    });

    expect(result.success).toBe(true);
  });
});
