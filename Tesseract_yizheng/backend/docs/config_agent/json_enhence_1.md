对比了两份工作流 JSON，发现以下问题：

  ---
  问题分析对照表

  | 维度               | 范例 (game_0203.json)                                                          | 当前输出 (020401.json)                                       | 问题                                                   |
  |--------------------|--------------------------------------------------------------------------------|--------------------------------------------------------------|--------------------------------------------------------|
  | 节点命名           | schedule_trigger_5s、set_audio_generate_countdown、code_hand_execute_rock      | Schedule Trigger、Set Countdown、httpRequest - TTS Countdown | ❌ 未遵循 {type}_{category}_{action}_{detail} 命名规范 |
  | notes 格式         | 对象格式 { "title": "...", ... }                                               | 字符串格式 "{\"title\":\"...\"}}"                            | ❌ notes 被序列化为字符串而非对象                      |
  | category 分类      | 精确分类：TTS、SPEAKER、RAM、ASSIGN、HAND、CAM、YOLO-RPS、SCREEN               | 大量使用 BASE                                                | ❌ 未正确识别节点功能类别                              |
  | sub 字段           | 完整填充：TTS_input、audio_name、execute_gesture、yolov_input、robotGesture 等 | 大部分为空 {} 或缺失                                         | ❌ sub 字段未按 game_nodes.md 规范填充                 |
  | title/subtitle     | 中文描述性标题："游戏开始触发器"、"倒数语音合成"                               | 英文节点名重复："Schedule Trigger"、"Set Countdown"          | ❌ 未生成有意义的中文标题描述                          |
  | extra 状态         | 混合状态：pending、configuring、configured、前端状态自定义字段                 | 大部分为 pending，逻辑器为 configured                        | ⚠️ 基本正确，但缺少 configuring 中间态                 |
  | topology/device_ID | 硬件节点有值："usb1"、"hand1"、"cam1"                                          | 全部为 null                                                  | ⚠️ 预期行为（ConfigAgent 填充）                        |
  | 缺失输/赢分支      | 完整的 win/lose/draw 三分支                                                    | 只有 win 分支，缺少 lose 分支                                | ❌ 游戏逻辑不完整                                      |

  ---
  优化方案执行文档

  Phase 1: 修复节点命名规范

  文件: src/agents/workflow-architect.ts

  // 添加节点命名生成函数
  function generateNodeName(params: {
    n8nType: string;
    category: NodeCategory;
    action: string;
    detail: string;
  }): string {
    const typeMap: Record<string, string> = {
      'n8n-nodes-base.scheduleTrigger': 'schedule_trigger',
      'n8n-nodes-base.httpRequest': 'http_request',
      'n8n-nodes-base.set': 'set',
      'n8n-nodes-base.code': 'code',
      'n8n-nodes-base.if': 'if',
      'n8n-nodes-base.switch': 'switch'
    };

    const prefix = typeMap[params.n8nType] || 'node';
    // 格式: {type}_{category}_{action}_{detail}
    return `${prefix}_${params.category.toLowerCase()}_${params.action}_${params.detail}`;
  }

  // 示例输出:
  // schedule_trigger_base_start_5s
  // set_tts_generate_countdown
  // http_request_speaker_execute_countdown
  // code_hand_execute_rock

  测试命令:
  npm test -- tests/unit/agents/workflow-architect.test.ts --grep "node naming"

  ---
  Phase 2: 修复 notes 格式（对象而非字符串）

  文件: src/agents/workflow-architect.ts

  // 当前问题代码
  node.notes = JSON.stringify(notesObj);  // ❌ 序列化为字符串

  // 修复后
  node.notes = notesObj;  // ✅ 保持对象格式

  // n8n API 会自动处理 notes 字段的序列化

  验证: 检查 n8n 工作流导出格式，确认 notes 应为对象

  ---
  Phase 3: 修复 category 分类逻辑

  文件: src/agents/prompts/category-mapping.ts (新建)

  // 节点类型到 category 的映射规则
  export const NODE_CATEGORY_RULES: Array<{
    match: (node: any) => boolean;
    category: NodeCategory;
  }> = [
    // 触发器
    { match: (n) => n.type.includes('Trigger'), category: 'BASE' },

    // 逻辑器
    { match: (n) => ['if', 'switch', 'merge'].some(t => n.type.includes(t)), category: 'BASE' },

    // TTS 处理器 - 包含 TTS 或语音合成相关
    { match: (n) => n.name.toLowerCase().includes('tts') || n.parameters?.url?.includes('tts'), category: 'TTS' },

    // SPEAKER 执行器 - 包含 speaker 或音频播放
    { match: (n) => n.name.toLowerCase().includes('speaker') || n.parameters?.url?.includes('speaker'), category: 'SPEAKER' },

    // CAM 感知器 - 包含 camera 或 snapshot
    { match: (n) => n.name.toLowerCase().includes('camera') || n.parameters?.url?.includes('camera'), category: 'CAM' },

    // HAND 执行器 - 包含 hand 或 gesture
    { match: (n) => n.name.toLowerCase().includes('hand') && n.type === 'n8n-nodes-base.httpRequest', category: 'HAND' },

    // SCREEN 执行器 - 包含 screen 或 emoji
    { match: (n) => n.name.toLowerCase().includes('screen') || n.parameters?.url?.includes('screen'), category: 'SCREEN' },

    // YOLO-RPS 处理器 - 包含 yolo 或 gesture detection
    { match: (n) => n.name.toLowerCase().includes('yolo') || n.parameters?.url?.includes('yolov'), category: 'YOLO-RPS' },

    // RAM 处理器 - 包含 random
    { match: (n) => n.name.toLowerCase().includes('random'), category: 'RAM' },

    // ASSIGN 处理器 - 赋值节点
    { match: (n) => n.name.toLowerCase().includes('robot=') || n.name.toLowerCase().includes('gesture'), category: 'ASSIGN' },

    // 默认
    { match: () => true, category: 'BASE' }
  ];

  export function detectNodeCategory(node: any): NodeCategory {
    for (const rule of NODE_CATEGORY_RULES) {
      if (rule.match(node)) {
        return rule.category;
      }
    }
    return 'BASE';
  }

  ---
  Phase 4: 修复 sub 字段填充

  文件: src/agents/prompts/sub-field-extractor.ts (新建)

  // 根据 category 提取 sub 字段
  export function extractSubFields(node: any, category: NodeCategory): NodeSubParams {
    const sub: NodeSubParams = {};

    switch (category) {
      case 'TTS':
        // 从 parameters 中提取 TTS_input
        const ttsText = node.parameters?.assignments?.assignments?.find(
          (a: any) => a.name === 'countdownText' || a.name === 'resultText'
        )?.value;
        if (ttsText) sub.TTS_input = ttsText;
        sub.audio_name = node.name.replace(/\s+/g, '_').toLowerCase();
        break;

      case 'SPEAKER':
        sub.audio_name = extractAudioName(node);
        break;

      case 'CAM':
        sub.output = 'camera_frame';
        break;

      case 'YOLO-RPS':
        sub.yolov_input = 'camera_frame';
        sub.yolov_output = 'userGesture';
        break;

      case 'RAM':
        sub.random_rule = '1|2|3';
        sub.output = 'n';
        break;

      case 'ASSIGN':
        const gesture = node.parameters?.assignments?.assignments?.find(
          (a: any) => a.name === 'robotGesture'
        )?.value;
        if (gesture) sub.robotGesture = gesture;
        break;

      case 'HAND':
        sub.execute_gesture = extractGestureFromNode(node);
        break;

      case 'SCREEN':
        sub.execute_emoji = extractEmojiFromNode(node);
        break;
    }

    return sub;
  }

  ---
  Phase 5: 修复 title/subtitle 生成

  文件: src/agents/prompts/title-generator.ts (新建)

  // 节点标题生成规则
  export const TITLE_TEMPLATES: Record<NodeCategory, {
    titleTemplate: (node: any) => string;
    subtitleTemplate: (node: any) => string;
  }> = {
    'BASE': {
      titleTemplate: (n) => n.type.includes('Trigger') ? '游戏开始触发器' : '逻辑判断',
      subtitleTemplate: (n) => n.type.includes('Trigger')
        ? '游戏的"发令枪"，定时开启新一轮游戏流程'
        : '内部逻辑开关，根据条件引导流程分支'
    },
    'TTS': {
      titleTemplate: (n) => extractTitleFromContext(n, '语音合成'),
      subtitleTemplate: () => '表达转换单元，将文字实时转化为语音文件'
    },
    'SPEAKER': {
      titleTemplate: () => '音频播报',
      subtitleTemplate: () => '物理反馈单元，通过喇叭播放语音'
    },
    'CAM': {
      titleTemplate: () => '用户快照',
      subtitleTemplate: () => '调用摄像头，捕捉用户的手势画面'
    },
    'YOLO-RPS': {
      titleTemplate: () => '手势识别',
      subtitleTemplate: () => '数据登记单元，将AI认出的用户手势标签存入系统'
    },
    'RAM': {
      titleTemplate: () => '随机出拳计算',
      subtitleTemplate: () => '机器人"出拳"决策单元，利用随机算法选择招式'
    },
    'ASSIGN': {
      titleTemplate: (n) => '机器人手势赋值',
      subtitleTemplate: () => '数据记录单元，将随机数字翻译成具体的游戏手势标签'
    },
    'HAND': {
      titleTemplate: () => '物理手势驱动',
      subtitleTemplate: () => '物理动作单元，驱动机械手摆出对应的手势形状'
    },
    'SCREEN': {
      titleTemplate: () => '胜负表情展示',
      subtitleTemplate: () => '物理显示单元，根据裁判结果显示机器人情绪眼神'
    }
  };

  ---
  Phase 6: 补全游戏逻辑（lose 分支）

  文件: src/agents/prompts/few-shot-examples.ts

  // 确保 Few-Shot 示例包含完整的 win/lose/draw 三分支
  // 当前缺失的 lose 分支节点:
  // - if_robot_rock_user_paper_lose
  // - if_robot_scissors_user_rock_lose
  // - if_robot_paper_user_scissors_lose
  // - code_screen_execute_lose_sad
  // - set_audio_generate_lose
  // - code_speaker_execute_lose

  ---
  执行顺序与测试

  | Phase | 文件                   | 测试命令                                | Commit                                            |
  |-------|------------------------|-----------------------------------------|---------------------------------------------------|
  | 1     | workflow-architect.ts  | npm test -- --grep "node naming"        | fix(architect): implement node naming convention  |
  | 2     | workflow-architect.ts  | npm test -- --grep "notes format"       | fix(architect): output notes as object not string |
  | 3     | category-mapping.ts    | npm test -- --grep "category detection" | feat(prompts): add category mapping rules         |
  | 4     | sub-field-extractor.ts | npm test -- --grep "sub field"          | feat(prompts): add sub field extraction           |
  | 5     | title-generator.ts     | npm test -- --grep "title generation"   | feat(prompts): add Chinese title templates        |
  | 6     | few-shot-examples.ts   | npm test -- --grep "game workflow"      | fix(prompts): add complete win/lose/draw branches |

  ---
  预期修复后输出示例

  {
    "name": "schedule_trigger_base_start_5s",
    "type": "n8n-nodes-base.scheduleTrigger",
    "notes": {
      "title": "游戏开始触发器",
      "subtitle": "游戏的"发令枪"，每隔5秒自动开启一轮新的游戏流程",
      "category": "BASE",
      "session_ID": "ee8db55c-c991-4a61-8c79-b6a43be52ceb",
      "extra": "pending",
      "topology": null,
      "device_ID": null,
      "sub": {
        "seconds": 5
      }
    }
  }