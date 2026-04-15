/*
 * [INPUT]: 依赖 backend /api/agent/dialogue/validate-hardware 协议与 hardware bridge 事件。
 * [OUTPUT]: 对外提供对话模式硬件校验客户端。
 * [POS]: module/server/api 的对话模式后续请求入口，和 chat / start-deploy 共享真相源。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:aitesseract/server/Http_config.dart';
import 'package:aitesseract/server/api/agent_chat_api.dart' show ChatResponse;
import 'package:aitesseract/server/hardware_bridge/hardware_bridge_models.dart';
import 'package:dio/dio.dart';

class HttpConfig_AgentValidateHardware {
  static const String validateHardware =
      '/api/agent/dialogue/validate-hardware';

  static String get baseUrl => HttpConfig.agentBaseUrl;
}

class AgentValidateHardwareApi {
  Future<ChatResponse?> validateHardware({
    required String sessionId,
    required HardwareBridgeEvent event,
  }) async {
    if (sessionId.trim().isEmpty) {
      throw ArgumentError('sessionId is required');
    }

    final dio = Dio(
      BaseOptions(
        baseUrl: HttpConfig_AgentValidateHardware.baseUrl,
        connectTimeout: const Duration(seconds: 30).inMilliseconds,
        receiveTimeout: const Duration(seconds: 30).inMilliseconds,
      ),
    );

    final response = await dio.post(
      HttpConfig_AgentValidateHardware.validateHardware,
      data: <String, dynamic>{
        'sessionId': sessionId,
        'event': event.toValidationJson(),
      },
      options: Options(headers: {'Content-Type': 'application/json'}),
    );

    if (response.statusCode == 200 && response.data != null) {
      return ChatResponse.fromJson(response.data as Map<String, dynamic>);
    }
    return null;
  }
}
