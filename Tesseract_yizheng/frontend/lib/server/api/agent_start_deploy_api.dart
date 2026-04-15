/*
 * [INPUT]: 依赖 backend /api/agent/dialogue/start-deploy 协议。
 * [OUTPUT]: 对外提供对话模式开始部署客户端。
 * [POS]: module/server/api 的对话模式后续请求入口，负责把部署确认交给 backend 真相源。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:aitesseract/server/Http_config.dart';
import 'package:aitesseract/server/api/agent_chat_api.dart' show ChatResponse;
import 'package:dio/dio.dart';

class HttpConfig_AgentStartDeploy {
  static const String startDeploy = '/api/agent/dialogue/start-deploy';

  static String get baseUrl => HttpConfig.agentBaseUrl;
}

class AgentStartDeployApi {
  Future<ChatResponse?> startDeploy({
    required String sessionId,
  }) async {
    if (sessionId.trim().isEmpty) {
      throw ArgumentError('sessionId is required');
    }

    final dio = Dio(
      BaseOptions(
        baseUrl: HttpConfig_AgentStartDeploy.baseUrl,
        connectTimeout: const Duration(seconds: 30).inMilliseconds,
        receiveTimeout: const Duration(seconds: 30).inMilliseconds,
      ),
    );

    final response = await dio.post(
      HttpConfig_AgentStartDeploy.startDeploy,
      data: <String, dynamic>{'sessionId': sessionId},
      options: Options(headers: {'Content-Type': 'application/json'}),
    );

    if (response.statusCode == 200 && response.data != null) {
      return ChatResponse.fromJson(response.data as Map<String, dynamic>);
    }
    return null;
  }
}
