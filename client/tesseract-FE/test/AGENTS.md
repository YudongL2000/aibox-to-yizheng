# test/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend/AGENTS.md

成员清单
AGENTS.md: frontend 测试目录地图，标记对话模式与硬件桥回归切片。
hardware_bridge_service_test.dart: 硬件桥 facade 与 physical cue 分发回归。
dialogue_mode_instant_play_test.dart: 分支 A 映射回归，锁住“装备齐全直接开玩”的 UI 折叠。
dialogue_mode_hardware_guidance_test.dart: 分支 B 映射回归，锁住缺件引导、校验 loading 与部署 CTA。
dialogue_mode_teaching_handoff_test.dart: 分支 C 映射回归，锁住教学接力按钮与预填目标。
digital_twin_scene_envelope_test.dart: scene envelope 解析与 preview sessions / top controls / 预览模型隐藏回归。

法则
- 测试优先锁定 backend-first 契约折叠，不在 widget 层重复猜业务分支。
- 对话模式新增字段时，先补这里的映射回归，再改 UI。
- scene envelope / preview runtime state 新增字段时，先补纯逻辑回归，再改工作台布局。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
