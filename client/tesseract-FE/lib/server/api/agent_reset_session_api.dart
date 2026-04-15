import 'package:dio/dio.dart';
import 'dart:convert';
import 'package:aitesseract/server/Http_config.dart';

/// Agent重置会话接口配置
class HttpConfig_AgentResetSession {
  /// 重置会话接口
  static const String resetSession = "/api/agent/reset-session";
  
  /// 基础URL
  static String get baseUrl => HttpConfig.agentBaseUrl;
}

/// 重置会话请求参数
class ResetSessionRequest {
  final String sessionId;

  ResetSessionRequest({
    required this.sessionId,
  });

  Map<String, dynamic> toJson() {
    return {
      'sessionId': sessionId,
    };
  }
}

/// 重置会话响应
class ResetSessionResponse {
  final bool success;

  ResetSessionResponse({
    required this.success,
  });

  factory ResetSessionResponse.fromJson(Map<String, dynamic> json) {
    return ResetSessionResponse(
      success: json['success'] ?? false,
    );
  }
}

/// Agent重置会话API服务
class AgentResetSessionApi {
  final Dio _dio;

  AgentResetSessionApi() : _dio = Dio(BaseOptions(
    baseUrl: HttpConfig_AgentResetSession.baseUrl,
    connectTimeout: const Duration(seconds: 10).inMilliseconds,
    receiveTimeout: const Duration(seconds: 10).inMilliseconds,
    headers: {
      'Content-Type': 'application/json',
    },
  ));

  /// 重置会话
  /// [sessionId] 服务端会话ID，必须
  Future<ResetSessionResponse?> resetSession({
    required String sessionId,
  }) async {
    try {
      final request = ResetSessionRequest(sessionId: sessionId);
      final requestData = request.toJson();
      final url = '${HttpConfig_AgentResetSession.baseUrl}${HttpConfig_AgentResetSession.resetSession}';
      
      // 打印请求参数
      print('========== Agent Reset Session API ==========');
      print('URL: $url');
      print('Method: POST');
      print('Request: ${JsonEncoder.withIndent('  ').convert(requestData)}');
      print('==============================================');

      final response = await _dio.post(
        HttpConfig_AgentResetSession.resetSession,
        data: requestData,
      );

      // 打印返回值
      print('========== Agent Reset Session Response ==========');
      print('Status Code: ${response.statusCode}');
      if (response.data != null) {
        print('Response: ${JsonEncoder.withIndent('  ').convert(response.data)}');
      }
      print('==================================================');

      if (response.statusCode == 200 && response.data != null) {
        return ResetSessionResponse.fromJson(response.data as Map<String, dynamic>);
      }
      return null;
    } on DioError catch (e) {
      print('========== Agent Reset Session Error ==========');
      print('Error: $e');
      if (e.response != null) {
        print('Response Data: ${e.response?.data}');
      }
      print('===============================================');
      return null;
    } catch (e) {
      print('========== Agent Reset Session Error ==========');
      print('Error: $e');
      print('===============================================');
      return null;
    }
  }
}
