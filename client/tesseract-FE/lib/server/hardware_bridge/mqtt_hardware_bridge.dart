/*
 * [INPUT]: 依赖平台条件导出，在 Web 与 VM 环境之间切换 MQTT bridge 实现。
 * [OUTPUT]: 对外提供 MQTT 硬件桥的统一入口。
 * [POS]: server/hardware_bridge 的条件导出门面，避免 facade 感知 web/stub 差异。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

export 'mqtt_hardware_bridge_stub.dart'
    if (dart.library.html) 'mqtt_hardware_bridge_web.dart';
