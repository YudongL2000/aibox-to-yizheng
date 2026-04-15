/*
 * [INPUT]: 依赖平台条件导出，在 Web 与 VM 环境之间切换 MiniClaw WebSocket 实现。
 * [OUTPUT]: 对外提供 MiniClaw WebSocket 桥的统一入口。
 * [POS]: server/hardware_bridge 的条件导出门面，避免上层感知 web/stub 差异。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

export 'miniclaw_ws_bridge_stub.dart'
    if (dart.library.html) 'miniclaw_ws_bridge_web.dart';
