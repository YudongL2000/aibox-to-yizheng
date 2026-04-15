/*
 * [INPUT]: 依赖 Dio 与 agent API 协议，接收后端对话/配置响应原始 JSON。
 * [OUTPUT]: 对外提供 chat DTO，并把 backend-first 的 digital twin scene 与 dialogueMode envelope 一并解析给 UI。
 * [POS]: module/server/api 的 Agent 协议边界层，被 AI 交互窗口与配置流程直接消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:convert';

import 'package:aitesseract/server/api/agent_start_config_api.dart'
    show ConfigNode, ConfigProgress, ConfigMetadata;
import 'package:aitesseract/server/api/dialogue_mode_models.dart';
import 'package:aitesseract/server/Http_config.dart';
import 'package:dio/dio.dart';

/// Agent对话接口配置
class HttpConfig_AgentChat {
  /// 对话接口
  static const String chat = "/api/agent/chat";

  /// 基础URL
  static String get baseUrl => HttpConfig.agentBaseUrl;
}

/// 对话请求参数
class ChatRequest {
  final String message;
  final String? sessionId;
  final DialogueModeInteractionMode? interactionMode;
  final DialogueModeTeachingContext? teachingContext;

  ChatRequest({
    required this.message,
    this.sessionId,
    this.interactionMode,
    this.teachingContext,
  });

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> json = {'message': message};
    if (sessionId != null && sessionId!.isNotEmpty) {
      json['sessionId'] = sessionId;
    }
    if (interactionMode != null) {
      json['interactionMode'] =
          interactionMode == DialogueModeInteractionMode.dialogue
              ? 'dialogue'
              : 'teaching';
    }
    if (teachingContext != null) {
      json['teachingContext'] = teachingContext!.toJson();
    }
    return json;
  }
}

/// 蓝图配置
class Blueprint {
  final String? intentSummary;
  final List<Map<String, dynamic>>? triggers;
  final List<Map<String, dynamic>>? logic;
  final List<Map<String, dynamic>>? executors;
  final List<String>? missingFields;

  Blueprint({
    this.intentSummary,
    this.triggers,
    this.logic,
    this.executors,
    this.missingFields,
  });

  factory Blueprint.fromJson(Map<String, dynamic> json) {
    return Blueprint(
      intentSummary: json['intentSummary'],
      triggers: json['triggers'] != null
          ? List<Map<String, dynamic>>.from(json['triggers'])
          : null,
      logic: json['logic'] != null
          ? List<Map<String, dynamic>>.from(json['logic'])
          : null,
      executors: json['executors'] != null
          ? List<Map<String, dynamic>>.from(json['executors'])
          : null,
      missingFields: json['missingFields'] != null
          ? List<String>.from(json['missingFields'])
          : null,
    );
  }
}

/// 工作流配置
class Workflow {
  final String? name;
  final List<dynamic>? nodes;
  final Map<String, dynamic>? connections;
  final Map<String, dynamic>? settings;
  final Map<String, dynamic>? meta;

  Workflow({this.name, this.nodes, this.connections, this.settings, this.meta});

  factory Workflow.fromJson(Map<String, dynamic> json) {
    return Workflow(
      name: json['name'],
      nodes: json['nodes'],
      connections: json['connections'] != null
          ? Map<String, dynamic>.from(json['connections'])
          : null,
      settings: json['settings'] != null
          ? Map<String, dynamic>.from(json['settings'])
          : null,
      meta:
          json['meta'] != null ? Map<String, dynamic>.from(json['meta']) : null,
    );
  }
}

/// 交互选项
class InteractionOption {
  final String label;
  final String value;

  InteractionOption({required this.label, required this.value});

  factory InteractionOption.fromJson(Map<String, dynamic> json) {
    return InteractionOption(
      label: json['label'] ?? '',
      value: json['value'] ?? '',
    );
  }
}

/// 交互配置
class Interaction {
  final String id;
  final String mode; // "single" | "multi" | "image"
  final String
      field; // tts_voice | screen_emoji | chassis_action | hand_gestures | yolo_gestures | emotion_labels | arm_actions | face_profiles
  final String? title;
  final String? description;
  final List<InteractionOption>? options;
  final int? minSelections;
  final int? maxSelections;
  final dynamic selected; // string | string[]
  final bool? allowUpload;
  final String? uploadHint;

  Interaction({
    required this.id,
    required this.mode,
    required this.field,
    this.title,
    this.description,
    this.options,
    this.minSelections,
    this.maxSelections,
    this.selected,
    this.allowUpload,
    this.uploadHint,
  });

  factory Interaction.fromJson(Map<String, dynamic> json) {
    return Interaction(
      id: json['id'] ?? '',
      mode: json['mode'] ?? 'single',
      field: json['field'] ?? '',
      title: json['title'],
      description: json['description'],
      options: json['options'] != null
          ? (json['options'] as List)
              .map(
                (item) =>
                    InteractionOption.fromJson(item as Map<String, dynamic>),
              )
              .toList()
          : null,
      minSelections: json['minSelections'],
      maxSelections: json['maxSelections'],
      selected: json['selected'],
      allowUpload: json['allowUpload'],
      uploadHint: json['uploadHint'],
    );
  }
}

/// 响应元数据
class ResponseMetadata {
  final int? iterations;
  final int? nodeCount;

  ResponseMetadata({this.iterations, this.nodeCount});

  factory ResponseMetadata.fromJson(Map<String, dynamic> json) {
    return ResponseMetadata(
      iterations: json['iterations'],
      nodeCount: json['nodeCount'],
    );
  }
}

/// 对话响应
class ChatResponse {
  final String sessionId;
  final ResponseData response;

  ChatResponse({required this.sessionId, required this.response});

  factory ChatResponse.fromJson(Map<String, dynamic> json) {
    return ChatResponse(
      sessionId: json['sessionId'] ?? '',
      response: ResponseData.fromJson(json['response'] as Map<String, dynamic>),
    );
  }
}

/// 响应数据类型枚举
enum ResponseType {
  guidance, // 继续收集信息
  summaryReady, // 给出结构化摘要 + 蓝图
  workflowReady, // 生成了可用的 n8n workflow JSON
  selectSingle, // 单选交互
  selectMulti, // 多选交互
  imageUpload, // 图片上传交互
  error, // 异常
  configStart, // 配置开始
  configNodePending, // 配置节点待处理
  configComplete, // 配置完成
  hotPlugging, // 热插拔
  configInput, // 配置输入
  dialogueMode, // 对话模式 envelope
}

/// 响应数据（统一所有对话类型的响应结构）
class ResponseData {
  final ResponseType type;
  final String? message;
  final Blueprint? blueprint;
  final Workflow? workflow;
  // final String? reasoning;
  final Interaction? interaction;
  final ResponseMetadata? metadata;
  // 配置相关字段
  final int? totalNodes;
  final ConfigNode? currentNode;
  final ConfigProgress? progress;
  final ConfigMetadata? configMetadata;
  final Map<String, dynamic>? digitalTwinScene;
  final DialogueModeEnvelope? dialogueMode;

  ResponseData({
    required this.type,
    this.message,
    this.blueprint,
    this.workflow,
    // this.reasoning,
    this.interaction,
    this.metadata,
    this.totalNodes,
    this.currentNode,
    this.progress,
    this.configMetadata,
    this.digitalTwinScene,
    this.dialogueMode,
  });

  factory ResponseData.fromJson(Map<String, dynamic> json) {
    // 解析 type
    ResponseType responseType;
    final typeStr = json['type'] ?? '';
    switch (typeStr) {
      case 'guidance':
        responseType = ResponseType.guidance;
        break;
      case 'summary_ready':
        responseType = ResponseType.summaryReady;
        break;
      case 'workflow_ready':
        responseType = ResponseType.workflowReady;
        break;
      case 'select_single':
        responseType = ResponseType.selectSingle;
        break;
      case 'select_multi':
        responseType = ResponseType.selectMulti;
        break;
      case 'image_upload':
        responseType = ResponseType.imageUpload;
        break;
      case 'error':
        responseType = ResponseType.error;
        break;
      case 'config_start':
        responseType = ResponseType.configStart;
        break;
      case 'config_node_pending':
        responseType = ResponseType.configNodePending;
        break;
      case 'config_complete':
        responseType = ResponseType.configComplete;
        break;
      case 'hot_plugging':
        responseType = ResponseType.hotPlugging;
        break;
      case 'config_input':
        responseType = ResponseType.configInput;
        break;
      case 'dialogue_mode':
        responseType = ResponseType.dialogueMode;
        break;
      default:
        responseType = ResponseType.guidance;
    }

    return ResponseData(
      type: responseType,
      message: json['message'],
      blueprint: json['blueprint'] != null
          ? Blueprint.fromJson(json['blueprint'] as Map<String, dynamic>)
          : null,
      workflow: json['workflow'] != null
          ? Workflow.fromJson(json['workflow'] as Map<String, dynamic>)
          : null,
      // reasoning: json['reasoning'],
      interaction: json['interaction'] != null
          ? Interaction.fromJson(json['interaction'] as Map<String, dynamic>)
          : null,
      metadata: json['metadata'] != null
          ? ResponseMetadata.fromJson(json['metadata'] as Map<String, dynamic>)
          : null,
      // 配置相关字段
      totalNodes: json['totalNodes'] as int?,
      currentNode: json['currentNode'] != null
          ? ConfigNode.fromJson(json['currentNode'] as Map<String, dynamic>)
          : null,
      progress: json['progress'] != null
          ? ConfigProgress.fromJson(json['progress'] as Map<String, dynamic>)
          : null,
      configMetadata: json['metadata'] != null &&
              (json['metadata'] is Map<String, dynamic>) &&
              (json['metadata'] as Map<String, dynamic>).containsKey(
                'workflowId',
              )
          ? ConfigMetadata.fromJson(json['metadata'] as Map<String, dynamic>)
          : null,
      digitalTwinScene: _readDigitalTwinScene(json),
      dialogueMode: DialogueModeEnvelope.tryParse(
        json['dialogueMode'] ?? json['dialogue_mode'],
      ),
    );
  }

  static Map<String, dynamic>? _readDigitalTwinScene(
    Map<String, dynamic> json,
  ) {
    final raw = json['digitalTwinScene'] ??
        json['digital_twin_scene'] ??
        json['scene_config'] ??
        json['sceneConfig'];
    if (raw is Map<String, dynamic>) {
      return Map<String, dynamic>.from(raw);
    }
    if (raw is Map) {
      return Map<String, dynamic>.from(raw.cast<String, dynamic>());
    }
    return null;
  }
}

/// Agent对话API服务
class AgentChatApi {
  /// 发送对话消息
  ///
  /// [message] 用户输入文本（必填）
  /// [sessionId] 服务端会话ID（可选，首次不传）
  ///
  /// 返回对话响应
  Future<ChatResponse?> sendMessage({
    required String message,
    String? sessionId,
    DialogueModeInteractionMode? interactionMode,
    DialogueModeTeachingContext? teachingContext,
  }) async {
    if (message.isEmpty) {
      throw ArgumentError('消息内容不能为空');
    }

    try {
      final dio = Dio(
        BaseOptions(
          baseUrl: HttpConfig_AgentChat.baseUrl,
          connectTimeout: const Duration(seconds: 30).inMilliseconds,
          receiveTimeout: const Duration(seconds: 30).inMilliseconds,
        ),
      );

      final request = ChatRequest(
        message: message,
        sessionId: sessionId,
        interactionMode: interactionMode,
        teachingContext: teachingContext,
      );

      final requestData = request.toJson();
      final url = '${HttpConfig_AgentChat.baseUrl}${HttpConfig_AgentChat.chat}';

      // 打印请求参数
      print('========== Agent Chat API ==========');
      print('URL: $url');
      print('Method: POST');
      print('Request: ${JsonEncoder.withIndent('  ').convert(requestData)}');
      print('===================================');

      final response = await dio.post(
        HttpConfig_AgentChat.chat,
        data: requestData,
        options: Options(headers: {'Content-Type': 'application/json'}),
      );

      // 打印返回值
      print('========== Agent Chat Response ==========');
      print('Status Code: ${response.statusCode}');
      if (response.data != null) {
        print(
          'Response: ${JsonEncoder.withIndent('  ').convert(response.data)}',
        );
      }
      print('========================================');

      if (response.statusCode == 200 && response.data != null) {
        return ChatResponse.fromJson(response.data as Map<String, dynamic>);
      }

      return null;
    } on DioError catch (e) {
      print('========== Agent Chat Error ==========');
      print('Error: $e');
      if (e.response != null) {
        print('Response Data: ${e.response?.data}');
      }
      print('=====================================');
      return null;
    } catch (e) {
      print('========== Agent Chat Error ==========');
      print('Error: $e');
      print('=====================================');
      return null;
    }
  }
}
