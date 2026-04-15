import 'package:dio/dio.dart';
import 'dart:convert';
import 'package:aitesseract/server/Http_config.dart';

/// Workflow接口配置
class HttpConfig_Workflow {
  /// 创建workflow接口
  static const String createWorkflow = "/api/workflow/create";
  
  /// 基础URL
  static String get baseUrl => HttpConfig.agentBaseUrl;
}

/// 创建Workflow请求参数
class CreateWorkflowRequest {
  final String sessionId; // 会话ID（必须）

  CreateWorkflowRequest({
    required this.sessionId,
  });

  Map<String, dynamic> toJson() {
    return {
      'sessionId': sessionId,
    };
  }
}

/// 创建Workflow响应
class CreateWorkflowResponse {
  final String workflowId;
  final String workflowName;
  final String workflowUrl;

  CreateWorkflowResponse({
    required this.workflowId,
    required this.workflowName,
    required this.workflowUrl,
  });

  factory CreateWorkflowResponse.fromJson(Map<String, dynamic> json) {
    return CreateWorkflowResponse(
      workflowId: json['workflowId'] ?? '',
      workflowName: json['workflowName'] ?? '',
      workflowUrl: json['workflowUrl'] ?? '',
    );
  }
}

/// Workflow API服务
class WorkflowApi {
  /// 创建workflow
  /// 
  /// [sessionId] 会话ID（必须）
  /// 
  /// 返回创建结果
  Future<CreateWorkflowResponse?> createWorkflow({
    required String sessionId,
  }) async {
    try {
      final dio = Dio(BaseOptions(
        baseUrl: HttpConfig_Workflow.baseUrl,
        connectTimeout: const Duration(seconds: 30).inMilliseconds,
        receiveTimeout: const Duration(seconds: 30).inMilliseconds,
      ));

      final request = CreateWorkflowRequest(sessionId: sessionId);
      final requestData = request.toJson();
      final url = '${HttpConfig_Workflow.baseUrl}${HttpConfig_Workflow.createWorkflow}';
      
      // 打印请求参数
      print('========== Workflow Create API ==========');
      print('URL: $url');
      print('Method: POST');
      print('Request: ${JsonEncoder.withIndent('  ').convert(requestData)}');
      print('=========================================');

      final response = await dio.post(
        HttpConfig_Workflow.createWorkflow,
        data: requestData,
        options: Options(
          headers: {
            'Content-Type': 'application/json',
          },
        ),
      );

      // 打印返回值
      print('========== Workflow Create Response ==========');
      print('Status Code: ${response.statusCode}');
      if (response.data != null) {
        print('Response: ${JsonEncoder.withIndent('  ').convert(response.data)}');
      }
      print('===============================================');

      if (response.statusCode == 200 && response.data != null) {
        return CreateWorkflowResponse.fromJson(
          response.data as Map<String, dynamic>,
        );
      }

      return null;
    } catch (e) {
      print('========== Workflow Create Error ==========');
      print('Error: $e');
      if (e is DioError && e.response != null) {
        print('Response Data: ${e.response?.data}');
      }
      print('===========================================');
      rethrow;
    }
  }
}
