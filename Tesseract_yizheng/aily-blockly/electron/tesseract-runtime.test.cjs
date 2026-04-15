/**
 * [INPUT]: 依赖 Node.js `node:test`、`node:assert/strict` 与 CommonJS 版 TesseractRuntime。
 * [OUTPUT]: 对外提供 external backend 模式硬件状态降级测试，锁住缺席 backend 时 `getHardwareStatus()` 返回结构化 disconnected 快照而非抛 IPC 级异常。
 * [POS]: electron 层运行时回归测试，防止被动状态查询重新退化成致命启动错误。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { TesseractRuntime } = require("./tesseract-runtime");

test("getHardwareStatus returns a disconnected snapshot when external backend is unavailable", async () => {
  const runtime = new TesseractRuntime();
  runtime.backendMode = "external";
  runtime.lastError =
    "External backend mode is enabled, but no backend is listening on 127.0.0.1:3006";
  runtime.start = async () => {
    throw new Error(runtime.lastError);
  };

  const result = await runtime.getHardwareStatus();

  assert.deepEqual(result, {
    success: true,
    data: {
      connectionState: "disconnected",
      lastError: runtime.lastError,
      message: runtime.lastError,
    },
  });
});

test("getHardwareStatus still rethrows non-external startup failures", async () => {
  const runtime = new TesseractRuntime();
  runtime.backendMode = "auto";
  runtime.start = async () => {
    throw new Error("backend dist missing");
  };

  await assert.rejects(() => runtime.getHardwareStatus(), /backend dist missing/);
});
