# Reliability

## 当前可靠性模型
`aily-blockly` 的可靠性建立在三个本地前提之上:
- Electron 能正常启动桌面宿主
- 兄弟目录 `../backend` 可构建并提供 Tesseract Agent sidecar
- 兄弟目录 `../n8n/n8n-master` 可构建并提供嵌入式 n8n 运行时

## 最短健康检查
从工作区根目录执行:

```bash
cd backend && npm run build
cd ../n8n/n8n-master && pnpm build:n8n
cd ../../aily-blockly && npm run prepare:tesseract-runtime
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npm run smoke:tesseract -- --project /absolute/path/to/project
```

## 常见失效点
- `prepare:tesseract-runtime` 失败
  - 常见原因: `../backend/dist` 缺失
  - 处理: 先执行 `cd ../backend && npm run build`
- n8n iframe 空白或无法打开
  - 常见原因: `../n8n/n8n-master/packages/cli/dist` 不存在或 n8n 未正确启动
  - 处理: 先执行 `cd ../n8n/n8n-master && pnpm build:n8n`
- 项目打开到错误编辑器
  - 常见原因: `.tesseract/manifest.json` 或 `project.abi` 缺失/冲突
  - 处理: 明确项目模式，只保留一种主标识

## 可靠性原则
- 明确失败优于静默降级
- 本地单机优先于过早的多实例抽象
- 兼容路径存在，但不能吞掉主路径质量
