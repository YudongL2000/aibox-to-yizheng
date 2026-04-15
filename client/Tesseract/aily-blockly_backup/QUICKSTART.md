# aily-blockly Quickstart

## 常规一体化调试

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly
npm run electron
```

这条命令会：
- 准备本地 runtime 资产
- 启动 Angular dev server
- 启动 Electron
- 在需要时由 Electron 托管 backend

## 复用前端热更新

终端 A:

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly
npm start -- --host 127.0.0.1 --port 4200
```

终端 B:

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly
npm run electron:reuse
```

## 外部 backend 调试模式

当你要频繁重启 [backend](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend) 而不想让客户端跟着退出/重编译时，使用外部 backend 模式。

终端 A:

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend
npm run agent:restart
```

终端 B:

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly
npm start -- --host 127.0.0.1 --port 4200
```

终端 C:

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly
npm run electron:reuse:external
```

此模式下：
- Electron 只 attach 已运行 backend
- attach 失败会报错
- 不会自启或托管 backend
- `npm run agent:restart` 不再需要关闭客户端

## 如果 dev server 端口不是 4200

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly
npm run electron:reuse -- --dev-server-url http://127.0.0.1:4300
```

外部 backend 模式同理：

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly
npm run electron:reuse:external -- --dev-server-url http://127.0.0.1:4300
```
