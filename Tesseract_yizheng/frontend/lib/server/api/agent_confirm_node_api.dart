import 'package:dio/dio.dart';
import 'dart:convert';
import 'package:aitesseract/server/api/agent_start_config_api.dart'
    show ConfigNode, ConfigProgress, ConfigMetadata;
import 'package:aitesseract/server/api/agent_chat_api.dart'
    show Interaction, ResponseData;
import 'package:aitesseract/server/Http_config.dart';

/// Agent 确认节点接口配置
class HttpConfig_AgentConfirmNode {
  /// 确认节点接口
  static const String confirmNode = "/api/agent/confirm-node";

  /// 基础URL
  static String get baseUrl => HttpConfig.agentBaseUrl;
}

/// 确认节点请求参数
/// 上传人脸样本后再次调用 confirm-node 时，需传 sub：{ face_info: 上传接口返回的 profile }
class ConfirmNodeRequest {
  final String sessionId; // 必须
  final String
      nodeName; // 推荐传 currentNode.name（FACE-NET 节点如 set_face_net_recognition_liu）
  final String? topology; // 可选
  final String? executeEmoji; // 可选，用户操作结果（SCREEN 类别使用）
  final String? ttsInput; // 可选，TTS 输入内容（TTS 类别使用）
  /// 可选，人脸节点确认时传：{ "face_info": "老刘" }
  final Map<String, dynamic>? sub;

  ConfirmNodeRequest({
    required this.sessionId,
    required this.nodeName,
    this.topology,
    this.executeEmoji,
    this.ttsInput,
    this.sub,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'sessionId': sessionId,
      'nodeName': nodeName,
    };
    if (topology != null) {
      json['topology'] = topology;
    }
    if (executeEmoji != null) {
      json['execute_emoji'] = executeEmoji;
    }
    if (ttsInput != null) {
      json['TTS_input'] = ttsInput;
    }
    if (sub != null && sub!.isNotEmpty) {
      json['sub'] = sub;
    }
    return json;
  }
}

/// 确认节点响应（使用统一的 ResponseData）
class ConfirmNodeResponse {
  final String sessionId;
  final ResponseData response;

  ConfirmNodeResponse({
    required this.sessionId,
    required this.response,
  });

  factory ConfirmNodeResponse.fromJson(Map<String, dynamic> json) {
    return ConfirmNodeResponse(
      sessionId: json['sessionId'] ?? '',
      response: ResponseData.fromJson(
        json['response'] as Map<String, dynamic>,
      ),
    );
  }
}

/// 确认节点响应数据
/// type 字段和之前会话中 Message 列表里的 type 是一致的
/// 可能的值包括：config_node_pending | select_single | config_complete | error | tts | select_multi 等
/// 其中 config_node_pending | config_complete | error 这几种类型归于纯文本类型（MessageType.instruction）
/// 其他类型如 select_single、tts 等需要根据类型进行特殊处理
class ConfirmNodeResponseData {
  final String type; // 类型字符串，和 ResponseData.type 一致
  final String message;
  final ConfigNode? currentNode;
  final ConfigProgress? progress;
  final ConfigMetadata? metadata;
  final Interaction? interaction; // 交互信息（用于 select_single、select_multi 等类型）

  ConfirmNodeResponseData({
    required this.type,
    required this.message,
    this.currentNode,
    this.progress,
    this.metadata,
    this.interaction,
  });

  factory ConfirmNodeResponseData.fromJson(Map<String, dynamic> json) {
    return ConfirmNodeResponseData(
      type: json['type'] ?? '',
      message: json['message'] ?? '',
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

/// Agent 确认节点 API 服务
class AgentConfirmNodeApi {
  final Dio _dio;

  AgentConfirmNodeApi()
      : _dio = Dio(BaseOptions(
          baseUrl: HttpConfig_AgentConfirmNode.baseUrl,
          connectTimeout: const Duration(minutes: 5).inMilliseconds,
          receiveTimeout: const Duration(minutes: 5).inMilliseconds,
          headers: {
            'Content-Type': 'application/json',
          },
        ));

  /// 确认节点
  /// [sub] 上传人脸样本后再次确认 FACE-NET 节点时传：{ "face_info": "老刘" }
  Future<ConfirmNodeResponse?> confirmNode({
    required String sessionId,
    required String nodeName,
    String? topology,
    String? executeEmoji,
    String? ttsInput,
    Map<String, dynamic>? sub,
  }) async {
    try {
      final request = ConfirmNodeRequest(
        sessionId: sessionId,
        nodeName: nodeName,
        topology: topology,
        executeEmoji: executeEmoji,
        ttsInput: ttsInput,
        sub: sub,
      );
      final requestData = request.toJson();
      final url =
          '${HttpConfig_AgentConfirmNode.baseUrl}${HttpConfig_AgentConfirmNode.confirmNode}';

      print('========== Agent Confirm Node API ==========');
      print('URL: $url');
      print('Method: POST');
      print('Request: ${JsonEncoder.withIndent('  ').convert(requestData)}');
      print('============================================');

      final response = await _dio.post(
        HttpConfig_AgentConfirmNode.confirmNode,
        data: requestData,
      );

      print('========== Agent Confirm Node Response ==========');
      print('Status Code: ${response.statusCode}');
      if (response.data != null) {
        print(
            'Response: ${JsonEncoder.withIndent('  ').convert(response.data)}');
      }
      print('================================================');

      if (response.statusCode == 200 && response.data != null) {
        return ConfirmNodeResponse.fromJson(
          response.data as Map<String, dynamic>,
        );
      }
      return null;
    } catch (e) {
      print('========== Agent Confirm Node Error ==========');
      print('Error: $e');
      if (e is DioError && e.response != null) {
        print('Response Data: ${e.response?.data}');
      }
      print('==============================================');
      return null;
    }
  }
}
