# x-aily-button-viewer/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/components/x-dialog/AGENTS.md

成员清单
x-aily-button-viewer.component.ts: 通用动作按钮 viewer，负责把 aily-button block 渲染成 CTA，并在硬件端口确认场景补齐 backend 真实接口选择。
x-aily-button-viewer.component.spec.ts: 按钮 viewer 回归测试，锁住端口选择会折叠成 `portId/topology` 再派发。

法则
- `tesseract-confirm-node` 的接口选择只消费 backend 给的 `portOptions/selectedPortId`，不在前端偷偷猜接口表或补 mock 插入逻辑。
- viewer 只负责渲染与派发 `aily-chat-action`，不直接操纵会话状态。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
