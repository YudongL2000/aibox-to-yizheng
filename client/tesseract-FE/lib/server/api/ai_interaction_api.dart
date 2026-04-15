import 'package:aitesseract/server/api/base_api_service.dart';
import 'package:aitesseract/server/api/models/base_response.dart';

/// AI交互接口配置
/// 根据飞书文档中的接口路径进行配置
class HttpConfig_AI_Interaction {
  // TODO: 根据飞书文档中的接口路径替换以下路径
  
  /// 发送用户消息
  static const String sendMessage = "/ai/interact";
  
  /// 获取历史对话列表
  static const String getHistory = "/ai/history";
  
  /// 上传图片
  static const String uploadImage = "/ai/upload_image";
  
  /// 获取语音配置
  static const String getVoiceConfig = "/ai/voice/config";
  
  /// 确认语音配置
  static const String confirmVoiceConfig = "/ai/voice/confirm";
  
  /// 构建工作流
  static const String buildWorkflow = "/ai/workflow/build";
  
  /// 部署到硬件
  static const String deployToHardware = "/ai/deploy/hardware";
}

/// AI交互消息模型
/// 根据飞书文档中的返回数据结构进行定义
class AIMessage {
  final String id;
  final String content;
  final String type; // "user" | "ai" | "system"
  final DateTime? timestamp;
  final Map<String, dynamic>? extraData;

  AIMessage({
    required this.id,
    required this.content,
    required this.type,
    this.timestamp,
    this.extraData,
  });

  factory AIMessage.fromJson(Map<String, dynamic> json) {
    return AIMessage(
      id: json['id']?.toString() ?? '',
      content: json['content'] ?? json['text'] ?? '',
      type: json['type'] ?? 'user',
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'].toString())
          : null,
      extraData: json['extraData'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'type': type,
      'timestamp': timestamp?.toIso8601String(),
      'extraData': extraData,
    };
  }
}

/// 语音配置模型
class VoiceConfig {
  final String voiceId;
  final String voiceName;
  final String timbreId;
  final double emoCoef;

  VoiceConfig({
    required this.voiceId,
    required this.voiceName,
    required this.timbreId,
    required this.emoCoef,
  });

  factory VoiceConfig.fromJson(Map<String, dynamic> json) {
    return VoiceConfig(
      voiceId: json['voiceId'] ?? '',
      voiceName: json['voiceName'] ?? json['voice'] ?? '',
      timbreId: json['timbreId'] ?? '',
      emoCoef: (json['emoCoef'] ?? json['emo_coef'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'voiceId': voiceId,
      'voiceName': voiceName,
      'timbreId': timbreId,
      'emoCoef': emoCoef,
    };
  }
}

/// 工作流详情模型
class WorkflowDetail {
  final String workflowId;
  final Map<String, String> details;
  final String status;

  WorkflowDetail({
    required this.workflowId,
    required this.details,
    required this.status,
  });

  factory WorkflowDetail.fromJson(Map<String, dynamic> json) {
    return WorkflowDetail(
      workflowId: json['workflowId'] ?? '',
      details: Map<String, String>.from(json['details'] ?? {}),
      status: json['status'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'workflowId': workflowId,
      'details': details,
      'status': status,
    };
  }
}

/// AI交互API服务
class AIInteractionApi extends BaseApiService {
  /// 发送用户消息
  /// 
  /// [content] 用户输入的内容
  /// 
  /// 返回AI响应消息
  Future<AIMessage?> sendMessage(String content) async {
    try {
      final result = await request<Map<String, dynamic>>(
        HttpConfig_AI_Interaction.sendMessage,
        params: {
          'content': content,
          // TODO: 根据文档添加其他必要参数
        },
        fromJson: (json) => json,
      );

      if (result != null) {
        return AIMessage.fromJson(result);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }

  /// 获取历史对话列表
  /// 
  /// [page] 页码，从1开始
  /// [pageSize] 每页数量
  /// 
  /// 返回对话消息列表
  Future<List<AIMessage>> getHistory({
    int page = 1,
    int pageSize = 20,
  }) async {
    try {
      return await requestList<AIMessage>(
        HttpConfig_AI_Interaction.getHistory,
        params: {
          'page': page,
          'pageSize': pageSize,
          // TODO: 根据文档添加其他必要参数
        },
        fromJson: (json) => AIMessage.fromJson(json),
      );
    } catch (e) {
      rethrow;
    }
  }

  /// 上传图片
  /// 
  /// [imageUrl] 图片URL或base64
  /// [imageBytes] 图片字节数据（可选）
  /// 
  /// 返回上传后的图片URL或识别结果
  Future<Map<String, dynamic>?> uploadImage({
    String? imageUrl,
    List<int>? imageBytes,
  }) async {
    try {
      final params = <String, dynamic>{};
      
      if (imageUrl != null) {
        params['imageUrl'] = imageUrl;
      }
      if (imageBytes != null) {
        params['imageBytes'] = imageBytes;
      }

      final result = await request<Map<String, dynamic>>(
        HttpConfig_AI_Interaction.uploadImage,
        params: params,
        fromJson: (json) => json,
      );

      return result;
    } catch (e) {
      rethrow;
    }
  }

  /// 获取语音配置选项
  /// 
  /// 返回可用的语音选项列表
  Future<List<VoiceConfig>> getVoiceOptions() async {
    try {
      return await requestList<VoiceConfig>(
        HttpConfig_AI_Interaction.getVoiceConfig,
        fromJson: (json) => VoiceConfig.fromJson(json),
      );
    } catch (e) {
      rethrow;
    }
  }

  /// 确认语音配置
  /// 
  /// [voiceId] 选中的语音ID
  /// 
  /// 返回确认后的语音配置信息
  Future<VoiceConfig?> confirmVoiceConfig(String voiceId) async {
    try {
      final result = await request<Map<String, dynamic>>(
        HttpConfig_AI_Interaction.confirmVoiceConfig,
        params: {
          'voiceId': voiceId,
          // TODO: 根据文档添加其他必要参数
        },
        fromJson: (json) => json,
      );

      if (result != null) {
        return VoiceConfig.fromJson(result);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }

  /// 构建工作流
  /// 
  /// [workflowData] 工作流数据
  /// 
  /// 返回构建结果
  Future<WorkflowDetail?> buildWorkflow(Map<String, dynamic> workflowData) async {
    try {
      final result = await request<Map<String, dynamic>>(
        HttpConfig_AI_Interaction.buildWorkflow,
        params: workflowData,
        fromJson: (json) => json,
      );

      if (result != null) {
        return WorkflowDetail.fromJson(result);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }

  /// 部署到硬件
  /// 
  /// [workflowId] 工作流ID
  /// [hardwareId] 硬件设备ID（可选）
  /// 
  /// 返回部署结果
  Future<Map<String, dynamic>?> deployToHardware({
    required String workflowId,
    String? hardwareId,
  }) async {
    try {
      final params = <String, dynamic>{
        'workflowId': workflowId,
      };
      
      if (hardwareId != null) {
        params['hardwareId'] = hardwareId;
      }

      final result = await request<Map<String, dynamic>>(
        HttpConfig_AI_Interaction.deployToHardware,
        params: params,
        fromJson: (json) => json,
      );

      return result;
    } catch (e) {
      rethrow;
    }
  }
}
