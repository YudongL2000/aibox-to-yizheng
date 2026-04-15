import 'package:aitesseract/server/api/base_api_service.dart';
import 'package:aitesseract/server/Http_config.dart';
import 'package:dio/dio.dart';
import 'dart:convert';

/// 健康检查接口配置
class HttpConfig_HealthCheck {
  /// 健康检查接口
  static const String healthCheck = "/api/health";

  /// 基础URL
  static String get baseUrl => HttpConfig.agentBaseUrl;
}

/// 健康检查响应模型
class HealthCheckResponse {
  final String status;

  HealthCheckResponse({required this.status});

  factory HealthCheckResponse.fromJson(Map<String, dynamic> json) {
    return HealthCheckResponse(
      status: json['status'] ?? '',
    );
  }

  bool get isOk => status == 'ok';
}

/// 健康检查API服务
class HealthCheckApi extends BaseApiService {
  /// 检查服务健康状态
  ///
  /// 返回 true 表示服务正常（status == "ok"），否则返回 false
  Future<bool> checkHealth() async {
    try {
      // 使用 Dio 直接请求，因为这是外部服务，不在 baseUrl 配置中
      final dio = Dio(BaseOptions(
        baseUrl: HttpConfig_HealthCheck.baseUrl,
        connectTimeout: const Duration(seconds: 5).inMilliseconds,
        receiveTimeout: const Duration(seconds: 5).inMilliseconds,
      ));

      final url =
          '${HttpConfig_HealthCheck.baseUrl}${HttpConfig_HealthCheck.healthCheck}';

      // 打印请求参数
      print('========== Health Check API ==========');
      print('URL: $url');
      print('Method: GET');
      print('=====================================');

      final response = await dio.get(
        HttpConfig_HealthCheck.healthCheck,
        options: Options(
          headers: {
            'Content-Type': 'application/json',
          },
        ),
      );

      // 打印返回值
      print('========== Health Check Response ==========');
      print('Status Code: ${response.statusCode}');
      if (response.data != null) {
        print(
            'Response: ${JsonEncoder.withIndent('  ').convert(response.data)}');
      }
      print('===========================================');

      if (response.statusCode == 200 && response.data != null) {
        final healthResponse = HealthCheckResponse.fromJson(
          response.data as Map<String, dynamic>,
        );
        return healthResponse.isOk;
      }

      return false;
    } catch (e) {
      // 网络错误或其他异常，返回 false
      print('========== Health Check Error ==========');
      print('Error: $e');
      print('========================================');
      return false;
    }
  }
}
