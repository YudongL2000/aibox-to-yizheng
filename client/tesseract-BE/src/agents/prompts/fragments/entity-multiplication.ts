/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 ENTITY_MULTIPLICATION_CONTENT 实体驱动节点乘法规则
 * [POS]: prompts/fragments 的实体分支规则库，被 architect-system.ts 组装进系统提示词
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const ENTITY_MULTIPLICATION_CONTENT = `# 实体驱动规则

当用户提到 N 个实体（人、条件、状态），对应执行链路需要实例化 N 次：
- N 个 IF 节点（每个判断一个实体条件）
- N × 每分支的执行器节点数

示例（2 人场景）：
1 个 FACE-NET → 2 个 IF → 每个 IF 下并行 [HAND, TTS→SPEAKER]
= 1 + 2 + 2×3 = 9 个分支相关节点

不要把多个实体压缩成同一个 IF 或同一个执行器节点。
如果没有 entity-multiplication 明确要求，不要为同一 category 额外复制第二个节点。

当实体绑定里已经给出动作参数时：
- 人物绑定不同 gesture → 为每个人物生成独立 HAND 节点
- 人物绑定不同 tts_text / audio_name → 为每个人物生成独立 TTS / SPEAKER 链路
- 条件分支绑定不同 emoji → 为每个结果生成独立 SCREEN 节点

## 身份路由详细模式（多主体视觉识别）

当 entity 类型为人物且使用 FACE-NET 识别时：

核心规则：N 个主体 → N 个 FACE-NET 节点 → N 个 IF 节点。
每个 FACE-NET 节点代表一个独立的人脸识别任务，让用户为每个人逐个上传人脸图片。

1. 为每个人物创建独立 FACE-NET 检测节点：
   - set_face_net_{person_alias}
   - notes.sub.face_info = "{person_alias}"
   - notes.sub.facenet_input = "camera1"
   - notes.sub.facenet_output = "facenet_output"
2. FACE-NET 节点按人物顺序线性串联：
   CAM → face_A → face_B → ... → face_N
3. 最后一个 FACE-NET 节点 fan-out 到所有 IF 节点：
   face_N → [if_identity_is_A, if_identity_is_B, ...]
4. 每个 IF true 分支接该人物专属执行链：
   IF → HAND + TTS → SPEAKER

示例（2 人：老刘、老付）：
schedule → CAM → set_face_net_liu → set_face_net_fu
                                         ↓
                              [if_identity_is_liu, if_identity_is_fu]
                                    ↓                    ↓
                              [code_hand_liu,       [code_hand_fu,
                               set_tts_liu →         set_tts_fu →
                               code_speaker_liu]     code_speaker_fu]

总计：1(trigger) + 1(CAM) + 2(FACE-NET) + 2(IF) + 2×3(HAND+TTS+SPEAKER) = 12 节点

禁止：
- 用 1 个 FACE-NET 节点直接替代所有人物身份配置
- 把多个人物压缩进同一个 IF 条件
- 让多个 IF 分支共享同一个 HAND / TTS / SPEAKER 节点`;
