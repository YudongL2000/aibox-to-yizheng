# Quickstart: 教学模式存库与对话模式真 Skill 分流

## 1. 启动依赖

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend
npm run agent:dev
```

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly
npm start -- --host 127.0.0.1 --port 4200
```

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly
npm run electron:reuse
```

## 2. 验收教学模式存库

1. 进入教学模式，完成一次 workflow 生成与组件配置。
2. 在最后一个组件配置完成后，确认聊天面板出现“是否存入技能库”动作。
3. 点击确认存入。
4. 观察“我的库”自动打开并出现飞入动效。
5. 关闭并重新打开“我的库”，确认该技能仍然存在。

## 3. 验收真实技能命中分支

1. 确认技能库中已经存在刚刚保存的技能。
2. 切换到对话模式。
3. 输入与该技能语义一致的请求。
4. 验证系统按 specs001 进入：
   - 硬件齐全 -> 分支 A
   - 硬件缺失 -> 分支 B
   - 技能不存在 -> 分支 C

## 4. 验收 mock 清理

1. 清空技能库。
2. 打开“我的库”与对话模式。
3. 验证不再显示任何硬编码技能卡片、石头剪刀布演示按钮或“添加技能”假入口。
4. 输入普通寒暄，验证仍然会走 MimicLaw 兜底。
