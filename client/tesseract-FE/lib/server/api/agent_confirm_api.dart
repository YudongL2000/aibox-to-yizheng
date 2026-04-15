import 'package:dio/dio.dart';
import 'package:aitesseract/server/api/agent_chat_api.dart';
import 'package:aitesseract/server/Http_config.dart';
import 'dart:convert';

/// Agent确认接口配置
class HttpConfig_AgentConfirm {
  /// 确认接口
  static const String confirm = "/api/agent/confirm";
  
  /// 基础URL
  static String get baseUrl => HttpConfig.agentBaseUrl;
}

/// 确认请求参数
class ConfirmRequest {
  final String sessionId;

  ConfirmRequest({
    required this.sessionId,
  });

  Map<String, dynamic> toJson() {
    return {
      'sessionId': sessionId,
    };
  }
}

/// Agent确认API服务
class AgentConfirmApi {
  final Dio _dio;

  AgentConfirmApi() : _dio = Dio(BaseOptions(
    baseUrl: HttpConfig_AgentConfirm.baseUrl,
    connectTimeout: const Duration(minutes: 5).inMilliseconds,
    receiveTimeout: const Duration(minutes: 5).inMilliseconds,
    headers: {
      'Content-Type': 'application/json',
    },
  ));

  /// 确认构建
  /// [sessionId] 服务端会话ID，必须
  /// 返回结构和 /api/agent/chat 相同
  Future<ChatResponse?> confirm({
    required String sessionId,
  }) async {
    try {
      final request = ConfirmRequest(sessionId: sessionId);
      final requestData = request.toJson();
      final url = '${HttpConfig_AgentConfirm.baseUrl}${HttpConfig_AgentConfirm.confirm}';
      
      // 打印请求参数
      print('========== Agent Confirm API ==========');
      print('URL: $url');
      print('Method: POST');
      print('Request: ${JsonEncoder.withIndent('  ').convert(requestData)}');
      print('=======================================');

      final response = await _dio.post(
        HttpConfig_AgentConfirm.confirm,
        data: requestData,
      );

      // 打印返回值
      print('========== Agent Confirm Response ==========');
      print('Status Code: ${response.statusCode}');
      if (response.data != null) {
        print('Response: ${JsonEncoder.withIndent('  ').convert(response.data)}');
      }
      print('===========================================');

      if (response.statusCode == 200 && response.data != null) {
        return ChatResponse.fromJson(response.data as Map<String, dynamic>);
      }
      return null;
    } on DioError catch (e) {
      print('========== Agent Confirm Error ==========');
      print('Error: $e');
      if (e.response != null) {
        print('Response Data: ${e.response?.data}');
      }
      print('========================================');
      return null;
    } catch (e) {
      print('========== Agent Confirm Error ==========');
      print('Error: $e');
      print('========================================');
      return null;
    }
  }
}
