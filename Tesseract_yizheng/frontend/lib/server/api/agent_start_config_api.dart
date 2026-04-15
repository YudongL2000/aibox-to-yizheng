import 'package:dio/dio.dart';
import 'dart:convert';
import 'package:aitesseract/server/api/agent_chat_api.dart'
    show Interaction, ResponseData;
import 'package:aitesseract/server/Http_config.dart';

/// Agent 开始配置接口配置
class HttpConfig_AgentStartConfig {
  /// 开始配置接口
  static const String startConfig = "/api/agent/start-config";

  /// 基础URL
  static String get baseUrl => HttpConfig.agentBaseUrl;
}

/// 开始配置请求参数
class StartConfigRequest {
  final String sessionId; // 必须
  final String? workflowId; // 可选
  final Map<String, dynamic>? workflowJson; // 可选

  StartConfigRequest({
    required this.sessionId,
    this.workflowId,
    this.workflowJson,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'sessionId': sessionId,
    };
    if (workflowId != null) {
      json['workflowId'] = workflowId;
    }
    if (workflowJson != null) {
      json['workflowJson'] = workflowJson;
    }
    return json;
  }
}

/// 开始配置响应（使用统一的 ResponseData）
class StartConfigResponse {
  final String sessionId;
  final ResponseData response;

  StartConfigResponse({
    required this.sessionId,
    required this.response,
  });

  factory StartConfigResponse.fromJson(Map<String, dynamic> json) {
    return StartConfigResponse(
      sessionId: json['sessionId'] ?? '',
      response: ResponseData.fromJson(
        json['response'] as Map<String, dynamic>,
      ),
    );
  }
}

/// 开始配置响应数据
/// type 字段和之前会话中 Message 列表里的 type 是一致的
/// 可能的值包括：config_start | config_node_pending | config_complete | error | select_single | tts | select_multi | image_upload 等
/// 其中 config_start | config_node_pending | config_complete | error 这四种类型归于纯文本类型（MessageType.instruction）
/// 其他类型如 select_single、tts 等需要根据类型进行特殊处理
class StartConfigResponseData {
  final String type; // 类型字符串，和 ResponseData.type 一致
  final String message;
  final int? totalNodes;
  final ConfigNode? currentNode;
  final ConfigProgress? progress;
  final ConfigMetadata? metadata;
  final Interaction? interaction; // 交互信息（用于 select_single、select_multi 等类型）

  StartConfigResponseData({
    required this.type,
    required this.message,
    this.totalNodes,
    this.currentNode,
    this.progress,
    this.metadata,
    this.interaction,
  });

  factory StartConfigResponseData.fromJson(Map<String, dynamic> json) {
    return StartConfigResponseData(
      type: json['type'] ?? '',
      message: json['message'] ?? '',
      totalNodes: json['totalNodes'] as int?,
      currentNode: json['currentNode'] != null
          ? ConfigNode.fromJson(json['currentNode'] as Map<String, dynamic>)
          : null,
      progress: json['progress'] != null
          ? ConfigProgress.fromJson(json['progress'] as Map<String, dynamic>)
          : null,
      metadata: json['metadata'] != null
          ? ConfigMetadata.fromJson(json['metadata'] as Map<String, dynamic>)
          : null,
      interaction: json['interaction'] != null
          ? Interaction.fromJson(json['interaction'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// 配置节点
class ConfigNode {
  final String name;
  final String? type;
  final String? category; // SCREEN | CAM | etc.
  final String? title;
  final String? subtitle;
  final String? extra;
  final int? index;
  final String? status;
  final String? displayName;
  final Map<String, dynamic>? configFields;
  final Map<String, dynamic>? configValues;

  ConfigNode({
    required this.name,
    this.type,
    this.category,
    this.title,
    this.subtitle,
    this.extra,
    this.index,
    this.status,
    this.displayName,
    this.configFields,
    this.configValues,
  });

  factory ConfigNode.fromJson(Map<String, dynamic> json) {
    return ConfigNode(
      name: json['name'] ?? '',
      type: json['type'] as String?,
      category: json['category'] as String?,
      title: json['title'] as String?,
      subtitle: json['subtitle'] as String?,
      extra: json['extra'] as String?,
      index: json['index'] as int?,
      status: json['status'] as String?,
      displayName: json['displayName'] as String?,
      configFields: json['configFields'] != null
          ? Map<String, dynamic>.from(json['configFields'])
          : null,
      configValues: json['configValues'] != null
          ? Map<String, dynamic>.from(json['configValues'])
          : null,
    );
  }
}

/// 配置进度
class ConfigProgress {
  final int completed;
  final int total;

  ConfigProgress({
    required this.completed,
    required this.total,
  });

  factory ConfigProgress.fromJson(Map<String, dynamic> json) {
    return ConfigProgress(
      completed: json['completed'] ?? 0,
      total: json['total'] ?? 0,
    );
  }
}

/// 配置元数据
class ConfigMetadata {
  final String? workflowId;
  final bool? showConfirmButton;

  ConfigMetadata({
    this.workflowId,
    this.showConfirmButton,
  });

  factory ConfigMetadata.fromJson(Map<String, dynamic> json) {
    return ConfigMetadata(
      workflowId: json['workflowId'] as String?,
      showConfirmButton: json['showConfirmButton'] as bool?,
    );
  }
}

/// Agent 开始配置 API 服务
class AgentStartConfigApi {
  final Dio _dio;

  AgentStartConfigApi()
      : _dio = Dio(BaseOptions(
          baseUrl: HttpConfig_AgentStartConfig.baseUrl,
          connectTimeout: const Duration(minutes: 5).inMilliseconds,
          receiveTimeout: const Duration(minutes: 5).inMilliseconds,
          headers: {
            'Content-Type': 'application/json',
          },
        ));

  /// 开始配置
  Future<StartConfigResponse?> startConfig({
    required String sessionId,
    String? workflowId,
    Map<String, dynamic>? workflowJson,
  }) async {
    try {
      final request = StartConfigRequest(
        sessionId: sessionId,
        workflowId: workflowId,
        workflowJson: workflowJson,
      );
      final requestData = request.toJson();
      final url =
          '${HttpConfig_AgentStartConfig.baseUrl}${HttpConfig_AgentStartConfig.startConfig}';

      print('========== Agent Start Config API ==========');
      print('URL: $url');
      print('Method: POST');
      print('Request: ${JsonEncoder.withIndent('  ').convert(requestData)}');
      print('===========================================');

      final response = await _dio.post(
        HttpConfig_AgentStartConfig.startConfig,
        data: requestData,
      );

      print('========== Agent Start Config Response ==========');
      print('Status Code: ${response.statusCode}');
      if (response.data != null) {
        print(
            'Response: ${JsonEncoder.withIndent('  ').convert(response.data)}');
      }
      print('================================================');

      if (response.statusCode == 200 && response.data != null) {
        return StartConfigResponse.fromJson(
          response.data as Map<String, dynamic>,
        );
      }
      return null;
    } catch (e) {
      print('========== Agent Start Config Error ==========');
      print('Error: $e');
      if (e is DioError && e.response != null) {
        print('Response Data: ${e.response?.data}');
      }
      print('==============================================');
      return null;
    }
  }
}
