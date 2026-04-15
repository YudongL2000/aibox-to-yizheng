/// API使用示例
/// 
/// 此文件展示了如何在实际代码中使用封装好的API接口
/// 根据飞书文档中的具体接口进行调用

import 'package:aitesseract/server/api/ai_interaction_api.dart';
import 'package:aitesseract/server/core/http_error_base.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';

class APIUsageExample {
  final AIInteractionApi _api = AIInteractionApi();

  /// 示例1: 发送用户消息并处理响应
  Future<void> exampleSendMessage() async {
    try {
      // 显示加载提示
      EasyLoading.show(status: '发送中...');

      // 调用API
      final message = await _api.sendMessage("用户输入的内容");

      // 隐藏加载提示
      EasyLoading.dismiss();

      if (message != null) {
        // 处理成功响应
        print("消息ID: ${message.id}");
        print("消息内容: ${message.content}");
        print("消息类型: ${message.type}");

        // 更新UI状态
        // setState(() {
        //   _messages.add(message);
        // });
      } else {
        EasyLoading.showError("发送失败，请重试");
      }
    } on HXNetError catch (e) {
      // 处理业务错误
      EasyLoading.dismiss();
      EasyLoading.showError(e.msg);
      print("业务错误: ${e.code} - ${e.msg}");
    } catch (e) {
      // 处理其他异常
      EasyLoading.dismiss();
      EasyLoading.showError("网络异常，请检查网络连接");
      print("异常: $e");
    }
  }

  /// 示例2: 获取历史对话列表
  Future<void> exampleGetHistory() async {
    try {
      EasyLoading.show(status: '加载中...');

      final history = await _api.getHistory(
        page: 1,
        pageSize: 20,
      );

      EasyLoading.dismiss();

      if (history.isNotEmpty) {
        print("获取到 ${history.length} 条历史记录");
        for (var msg in history) {
          print("${msg.type}: ${msg.content}");
        }

        // 更新UI
        // setState(() {
        //   _messageList = history;
        // });
      } else {
        print("暂无历史记录");
      }
    } on HXNetError catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError(e.msg);
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError("加载失败");
    }
  }

  /// 示例3: 上传图片
  Future<void> exampleUploadImage() async {
    try {
      EasyLoading.show(status: '上传中...');

      // 方式1: 使用图片URL
      final result1 = await _api.uploadImage(
        imageUrl: "https://example.com/image.jpg",
      );

      // 方式2: 使用图片字节数据
      // final imageBytes = await File("path/to/image.jpg").readAsBytes();
      // final result2 = await _api.uploadImage(
      //   imageBytes: imageBytes,
      // );

      EasyLoading.dismiss();

      if (result1 != null) {
        print("上传成功: $result1");
        // 处理上传结果
        // 例如：显示图片预览、提取特征等
      }
    } on HXNetError catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError(e.msg);
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError("上传失败");
    }
  }

  /// 示例4: 获取语音配置并确认
  Future<void> exampleVoiceConfig() async {
    try {
      // 1. 获取语音选项列表
      EasyLoading.show(status: '加载语音选项...');
      final voiceOptions = await _api.getVoiceOptions();
      EasyLoading.dismiss();

      if (voiceOptions.isEmpty) {
        EasyLoading.showError("暂无可用语音选项");
        return;
      }

      // 显示语音选项供用户选择
      print("可用语音选项:");
      for (var voice in voiceOptions) {
        print("${voice.voiceId}: ${voice.voiceName}");
      }

      // 2. 用户选择后确认配置
      final selectedVoiceId = voiceOptions.first.voiceId; // 示例：选择第一个

      EasyLoading.show(status: '确认配置中...');
      final confirmedVoice = await _api.confirmVoiceConfig(selectedVoiceId);
      EasyLoading.dismiss();

      if (confirmedVoice != null) {
        print("语音配置确认成功:");
        print("音色ID: ${confirmedVoice.timbreId}");
        print("情感系数: ${confirmedVoice.emoCoef}");
      }
    } on HXNetError catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError(e.msg);
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError("操作失败");
    }
  }

  /// 示例5: 构建工作流并部署
  Future<void> exampleBuildAndDeploy() async {
    try {
      // 1. 构建工作流
      EasyLoading.show(status: '构建工作流中...');
      final workflow = await _api.buildWorkflow({
        'characterName': '老刘',
        'action': '中指',
        'voiceContent': '你是猪-音色: 暴躁大妈',
        // 根据文档添加其他必要字段
      });
      EasyLoading.dismiss();

      if (workflow == null) {
        EasyLoading.showError("构建工作流失败");
        return;
      }

      print("工作流构建成功: ${workflow.workflowId}");
      print("工作流状态: ${workflow.status}");

      // 2. 部署到硬件
      EasyLoading.show(status: '部署中...');
      final deployResult = await _api.deployToHardware(
        workflowId: workflow.workflowId,
        hardwareId: "hardware_001", // 可选
      );
      EasyLoading.dismiss();

      if (deployResult != null) {
        print("部署成功: $deployResult");
        EasyLoading.showSuccess("部署成功");
      }
    } on HXNetError catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError(e.msg);
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError("操作失败");
    }
  }

  /// 示例6: 在StatefulWidget中使用
  /// 
  /// 在您的StatefulWidget中：
  /// 
  /// ```dart
  /// class YourWidget extends StatefulWidget {
  ///   @override
  ///   _YourWidgetState createState() => _YourWidgetState();
  /// }
  /// 
  /// class _YourWidgetState extends State<YourWidget> {
  ///   final _api = AIInteractionApi();
  ///   List<AIMessage> _messages = [];
  ///   bool _isLoading = false;
  /// 
  ///   Future<void> _sendMessage(String content) async {
  ///     setState(() => _isLoading = true);
  ///     
  ///     try {
  ///       final message = await _api.sendMessage(content);
  ///       if (message != null) {
  ///         setState(() {
  ///           _messages.add(message);
  ///           _isLoading = false;
  ///         });
  ///       }
  ///     } on HXNetError catch (e) {
  ///       setState(() => _isLoading = false);
  ///       EasyLoading.showError(e.msg);
  ///     } catch (e) {
  ///       setState(() => _isLoading = false);
  ///       EasyLoading.showError("网络异常");
  ///     }
  ///   }
  /// 
  ///   @override
  ///   Widget build(BuildContext context) {
  ///     // 构建UI
  ///   }
  /// }
  /// ```
}
