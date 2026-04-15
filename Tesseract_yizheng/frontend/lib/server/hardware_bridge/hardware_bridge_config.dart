/*
 * [INPUT]: 依赖编译期环境变量与硬件桥路由信息。
 * [OUTPUT]: 对外提供硬件桥环境配置与源优先级。
 * [POS]: server/hardware_bridge 的轻量配置层，供 facade 选择 MiniClaw 或 MQTT；不再内置固定局域网 fallback。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:aitesseract/server/api/dialogue_mode_models.dart';

class HardwareBridgeConfig {
  final String miniclawWebSocketUrl;
  final DialogueModeHardwareSource? preferredSource;

  const HardwareBridgeConfig({
    required this.miniclawWebSocketUrl,
    this.preferredSource,
  });

  factory HardwareBridgeConfig.fromEnvironment() {
    final preferred = const String.fromEnvironment(
      'TESSERACT_HARDWARE_BRIDGE_SOURCE',
      defaultValue: '',
    ).trim();
    return HardwareBridgeConfig(
      miniclawWebSocketUrl: const String.fromEnvironment(
        'TESSERACT_MINICLAW_WS_URL',
        defaultValue: '',
      ).trim(),
      preferredSource: _parsePreferredSource(preferred),
    );
  }
}

DialogueModeHardwareSource? _parsePreferredSource(String value) {
  switch (value) {
    case 'miniclaw_ws':
      return DialogueModeHardwareSource.miniclawWs;
    case 'mqtt_proxy':
      return DialogueModeHardwareSource.mqttProxy;
    case 'backend_cache':
      return DialogueModeHardwareSource.backendCache;
    default:
      return null;
  }
}
