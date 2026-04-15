优化文档 2：工作流生成质量修复

  问题诊断

  问题 1：n8n 节点参数字段填充过度

  现象：Agent 在 parameters 中填充了大量业务逻辑值，而非留空

  范例要求 (game_nodes.md)：
  // 触发器 - parameters 留空
  "parameters": {
    "rule": {
      "interval": [{}]  // ✅ 空对象
    }
  }

  // Set 节点 - parameters 留空
  "parameters": {
    "assignments": {
      "assignments": []  // ✅ 空数组
    },
    "options": {}
  }

  // Code 节点 - parameters 留空
  "parameters": {}  // ✅ 完全空

  当前输出：
  // 触发器 - 填充了具体值
  "parameters": {
    "rule": {
      "interval": [{
        "intervalValue": 5,        // ❌ 不应填充
        "intervalUnit": "seconds"  // ❌ 不应填充
      }]
    }
  }

  // Set 节点 - 填充了业务逻辑
  "parameters": {
    "values": {
      "string": [{
        "name": "countdownText",
        "value": "三、二、一！"  // ❌ 不应填充，应放入 notes.sub.TTS_input
      }]
    }
  }

  ---
  问题 2：工作流验证失败（20 个错误）

  | 错误类型                       | 数量 | 原因                                       
          |
  |--------------------------------|------|------------------------------------------------------|
  | Duplicate node name            | 多个 | 节点命名重复（如 set_base_condition_route  出现多次） |
  | onError: 'continueErrorOutput' | 6 个 | httpRequest 节点设置了错误输出但未连接错误 处理节点   |
  | 其他验证错误                   | 若干 | 节点连接、参数格式问题                     
          |

  ---
  优化方案

  Phase 1: 修复 parameters 留空规则

  文件: src/agents/prompts/node-templates.ts (新建)

  /**
   * [INPUT]: 依赖 types.ts 的 NodeCategory
   * [OUTPUT]: 对外提供 NODE_PARAMETER_TEMPLATES
   * [POS]: prompts 模块的节点参数模板，确保 parameters 字段留空
   * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
   */

  // ============================================================
  // 节点参数模板（严格基于 game_nodes.md）
  // 所有业务值放入 notes.sub，parameters 保持空结构
  // ============================================================

  export const NODE_PARAMETER_TEMPLATES = {
    // 触发器 - scheduleTrigger
    'n8n-nodes-base.scheduleTrigger': {
      parameters: {
        rule: {
          interval: [{}]  // 空对象，具体值放 notes.sub.seconds
        }
      },
      typeVersion: 1.1
    },

    // 感知器 - httpRequest (CAM)
    'n8n-nodes-base.httpRequest': {
      parameters: {
        method: 'POST',
        url: 'http://robot.local/api/camera/snapshot',  // 占位符 URL
        options: {}
      },
      typeVersion: 4.3
    },

    // 处理器 - set (TTS/RAM/ASSIGN/YOLO-RPS)
    'n8n-nodes-base.set': {
      parameters: {
        assignments: {
          assignments: []  // 空数组，具体值放 notes.sub
        },
        options: {}
      },
      typeVersion: 3.4
    },

    // 执行器 - code (HAND/SPEAKER/SCREEN)
    'n8n-nodes-base.code': {
      parameters: {},  // 完全空，具体值放 notes.sub
      typeVersion: 2
    },

    // 逻辑器 - if
    'n8n-nodes-base.if': {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'strict',
            version: 1
          },
          conditions: [],  // 空数组
          combinator: 'and'
        },
        options: {}
      },
      typeVersion: 2.2
    },

    // 逻辑器 - switch
    'n8n-nodes-base.switch': {
      parameters: {
        rules: {
          rules: []  // 空数组
        },
        options: {}
      },
      typeVersion: 3.2
    }
  };

  // 获取节点参数模板
  export function getNodeParameterTemplate(nodeType: string): any {
    return NODE_PARAMETER_TEMPLATES[nodeType] || { parameters: {} };
  }

  ---
  Phase 2: 修复节点命名唯一性

  文件: src/agents/workflow-architect.ts

  // ============================================================
  // 节点命名唯一性保证
  // ============================================================

  class NodeNameGenerator {
    private usedNames: Set<string> = new Set();
    private nameCounters: Map<string, number> = new Map();

    // 生成唯一节点名
    generateUniqueName(params: {
      n8nType: string;
      category: string;
      action: string;
      detail: string;
    }): string {
      const { n8nType, category, action, detail } = params;

      // 基础名称
      const typePrefix = this.getTypePrefix(n8nType);
      const baseName = `${typePrefix}_${category.toLowerCase()}_${action}_${detail}`;  

      // 检查唯一性
      if (!this.usedNames.has(baseName)) {
        this.usedNames.add(baseName);
        return baseName;
      }

      // 添加序号保证唯一
      const counter = (this.nameCounters.get(baseName) || 0) + 1;
      this.nameCounters.set(baseName, counter);
      const uniqueName = `${baseName}_${counter}`;
      this.usedNames.add(uniqueName);

      return uniqueName;
    }

    private getTypePrefix(n8nType: string): string {
      const prefixMap: Record<string, string> = {
        'n8n-nodes-base.scheduleTrigger': 'schedule_trigger',
        'n8n-nodes-base.httpRequest': 'http_request',
        'n8n-nodes-base.set': 'set',
        'n8n-nodes-base.code': 'code',
        'n8n-nodes-base.if': 'if',
        'n8n-nodes-base.switch': 'switch',
        'n8n-nodes-base.merge': 'merge'
      };
      return prefixMap[n8nType] || 'node';
    }

    // 重置（新工作流时调用）
    reset(): void {
      this.usedNames.clear();
      this.nameCounters.clear();
    }
  }

  ---
  Phase 3: 修复 httpRequest 错误处理配置

  文件: src/agents/prompts/node-templates.ts (更新)

  // httpRequest 节点 - 移除 onError 配置或添加默认值
  'n8n-nodes-base.httpRequest': {
    parameters: {
      method: 'POST',
      url: 'http://robot.local/api/placeholder',
      options: {
        // 不设置 onError，使用默认行为
        // 或显式设置为 stopWorkflow
      }
    },
    typeVersion: 4.3,
    // 不设置 onError 字段，避免验证错误
  }

  // 如果需要错误处理，在 workflow-architect 中统一处理
  export function sanitizeHttpRequestNode(node: any): any {
    // 移除可能导致验证错误的 onError 配置
    if (node.type === 'n8n-nodes-base.httpRequest') {
      if (node.onError === 'continueErrorOutput') {
        // 如果没有错误输出连接，改为默认行为
        delete node.onError;
      }
    }
    return node;
  }

  ---
  Phase 4: 更新 Few-Shot 示例（严格遵循 game_nodes.md）

  文件: src/agents/prompts/few-shot-examples.ts

  // ============================================================
  // 猜拳游戏工作流示例（严格基于 game_nodes.md）
  // 核心原则：parameters 留空，业务值放 notes.sub
  // ============================================================

  export const GAME_WORKFLOW_NODES = [
    // ===== 触发器 (BASE) =====
    {
      id: 'uuid-trigger-001',
      name: 'schedule_trigger_5s',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.1,
      position: [-2384, 1968],
      parameters: {
        rule: {
          interval: [{}]  // ✅ 空对象
        }
      },
      notes: {
        title: '游戏开始触发器',
        subtitle: '游戏的"发令枪"，每隔5秒自动开启一轮新的游戏流程',
        category: 'BASE',
        session_ID: '{{ sessionId }}',
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: {
          seconds: 5  // ✅ 业务值放这里
        }
      }
    },

    // ===== 处理器 TTS (倒数语音) =====
    {
      id: 'uuid-set-001',
      name: 'set_audio_generate_countdown',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-2160, 1968],
      parameters: {
        assignments: {
          assignments: []  // ✅ 空数组
        },
        options: {}
      },
      notes: {
        title: '倒数语音合成',
        subtitle: '表达转换单元，将"3, 2, 1"文字实时转化为语音文件',
        category: 'TTS',
        session_ID: '{{ sessionId }}',
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: {
          TTS_input: '',           // ✅ ConfigAgent 填充
          audio_name: 'count_down' // ✅ IntakeAgent 填充
        }
      }
    },

    // ===== 执行器 SPEAKER (倒数播报) =====
    {
      id: 'uuid-code-001',
      name: 'code_speaker_execute_countdown',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [-1936, 1968],
      parameters: {},  // ✅ 完全空
      notes: {
        title: '倒数音频播报',
        subtitle: '物理反馈单元，通过喇叭播放倒数语音',
        category: 'SPEAKER',
        session_ID: '{{ sessionId }}',
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: {
          audio_name: 'count_down'  // ✅ 引用前置 TTS 输出
        }
      }
    },

    // ===== 处理器 RAM (随机数) =====
    {
      id: 'uuid-set-002',
      name: 'set_generate_random_n',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-1040, 2160],
      parameters: {
        assignments: {
          assignments: []  // ✅ 空数组
        },
        options: {}
      },
      notes: {
        title: '随机出拳计算',
        subtitle: '机器人"出拳"决策单元，利用随机算法在1-3之间选一个数',
        category: 'RAM',
        session_ID: '{{ sessionId }}',
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: {
          random_rule: 3,  // ✅ 固定值
          output: 'n'      // ✅ 输出变量名
        }
      }
    },

    // ===== 感知器 CAM (摄像头) =====
    {
      id: 'uuid-http-001',
      name: 'http_request_camera_snapshot',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.3,
      position: [-816, 1968],
      parameters: {
        method: 'POST',
        url: 'http://robot.local/api/camera/snapshot',
        options: {}
      },
      notes: {
        title: '用户快照',
        subtitle: '调用摄像头，在倒数结束的瞬间捕捉用户的手势画面',
        category: 'CAM',
        session_ID: '{{ sessionId }}',
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: {
          output: 'camera1'  // ✅ 输出变量名
        }
      }
    },

    // ===== 处理器 YOLO-RPS (手势识别) =====
    {
      id: 'uuid-set-003',
      name: 'set_rps_recognition',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-592, 1968],
      parameters: {
        assignments: {
          assignments: []  // ✅ 空数组
        },
        options: {}
      },
      notes: {
        title: '用户出拳结果登记',
        subtitle: '数据登记单元，将AI认出的用户手势标签存入系统',
        category: 'YOLO-RPS',
        session_ID: '{{ sessionId }}',
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: {
          yolov_input: 'camera1',      // ✅ 引用前置 CAM 输出
          yolov_output: 'userGesture'  // ✅ 输出变量名
        }
      }
    },

    // ===== 执行器 HAND (机械手) =====
    {
      id: 'uuid-code-002',
      name: 'code_hand_execute_rock',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [-1264, 1776],
      parameters: {},  // ✅ 完全空
      notes: {
        title: '物理手势驱动',
        subtitle: '物理动作单元，驱动机械手实时摆出对应的手势形状',
        category: 'HAND',
        session_ID: '{{ sessionId }}',
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: {
          execute_gesture: 'Rock'  // ✅ 手势类型
        }
      }
    },

    // ===== 执行器 SCREEN (屏幕) =====
    {
      id: 'uuid-code-003',
      name: 'code_screen_execute_win_happy',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [-144, 1296],
      parameters: {},  // ✅ 完全空
      notes: {
        title: '胜负表情展示',
        subtitle: '物理显示单元，根据裁判结果显示机器人情绪眼神',
        category: 'SCREEN',
        session_ID: '{{ sessionId }}',
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: {
          execute_emoji: ''  // ✅ ConfigAgent 填充
        }
      }
    }
  ];

  ---
  Phase 5: 更新 System Prompt 强调规则

  文件: src/agents/prompts/architect-system.ts

  // 在 system prompt 中添加强制规则

  export const WORKFLOW_GENERATION_RULES = `
  ## 工作流生成强制规则

  ### 规则 1: parameters 字段留空
  - scheduleTrigger: parameters.rule.interval = [{}]
  - set: parameters.assignments.assignments = []
  - code: parameters = {}
  - httpRequest: 仅填充 method, url, options

  ### 规则 2: 业务值放入 notes.sub
  - 所有业务逻辑值（TTS_input, audio_name, execute_gesture 等）必须放入 notes.sub      
  - parameters 中不允许出现业务数据

  ### 规则 3: 节点命名唯一性
  - 每个节点名称必须唯一
  - 格式: {type}_{category}_{action}_{detail}
  - 相同功能节点添加序号: _1, _2, _3

  ### 规则 4: httpRequest 错误处理
  - 不设置 onError: 'continueErrorOutput'
  - 使用默认错误处理行为

  ### 规则 5: 节点类型映射
  | n8n 类型 | category | 说明 |
  |---------|----------|------|
  | scheduleTrigger | BASE | 触发器 |
  | set | TTS/RAM/ASSIGN/YOLO-RPS | 处理器 |
  | code | HAND/SPEAKER/SCREEN | 执行器 |
  | httpRequest | CAM | 感知器 |
  | if/switch | BASE | 逻辑器 |
  `;

  ---
  执行顺序与测试

  | Phase | 文件                  | 测试命令                                | Commit                                                         |
  |-------|-----------------------|-----------------------------------------|----------------------------------------------------------------|
  | 1     | node-templates.ts     | npm test -- --grep "parameter template" | feat(prompts): add empty parameter templates per game_nodes.md |
  | 2     | workflow-architect.ts | npm test -- --grep "unique name"        | fix(architect): ensure unique node names with counter          |
  | 3     | node-templates.ts     | npm test -- --grep "httpRequest"        | fix(prompts): remove onError config from httpRequest           |
  | 4     | few-shot-examples.ts  | npm test -- --grep "game workflow"      | fix(prompts): update few-shot with empty parameters            |
  | 5     | architect-system.ts   | npm test -- --grep "system prompt"      | feat(prompts): add workflow generation rules to system prompt  |

  ---
  预期修复后输出

  {
    "name": "set_audio_generate_countdown",
    "type": "n8n-nodes-base.set",
    "typeVersion": 3.4,
    "parameters": {
      "assignments": {
        "assignments": []
      },
      "options": {}
    },
    "notes": {
      "title": "倒数语音合成",
      "subtitle": "表达转换单元，将文字实时转化为语音文件",
      "category": "TTS",
      "session_ID": "5fc0f840-2a82-4937-afe7-5fd805c4880e",
      "extra": "pending",
      "topology": null,
      "device_ID": null,
      "sub": {
        "TTS_input": "",
        "audio_name": "count_down"
      }
    }
  }

  ---
  验证检查清单

  - parameters 字段仅包含空结构（[], {}, [{}]）
  - 所有业务值在 notes.sub 中
  - 节点名称无重复
  - httpRequest 节点无 onError: 'continueErrorOutput'
  - 工作流验证通过（0 errors）
