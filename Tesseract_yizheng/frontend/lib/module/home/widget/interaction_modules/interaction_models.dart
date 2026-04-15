/// 交互消息模型
class InteractionMessage {
  final String text;
  final bool isUser;
  final MessageType type;
  final Map<String, dynamic>? voiceData;
  final Map<String, dynamic>? data;

  InteractionMessage({
    required this.text,
    required this.isUser,
    required this.type,
    this.voiceData,
    this.data,
  });
}

/// 消息类型枚举
enum MessageType {
  userInput, // 用户输入
  instruction, // 指令
  success, // 成功消息
  voiceMapping, // 语音映射
  system, // 系统消息
  blueprintCard, // 蓝图摘要卡片（与消息同一时间线）
  workflowCard, // 工作流详情卡片
  deploymentCard, // 部署卡片
}

/// 交互状态枚举
enum InteractionState {
  idle, // 空闲
  analyzing, // 分析中
  uploading, // 上传中
  imageSelected, // 图片已选择（等待确认上传）
  imageUploaded, // 图片已上传
  voiceSetup, // 语音设置
  selectInteraction, // 单选/多选交互
  summaryReady, // 蓝图摘要就绪
  workflowReady, // 工作流就绪
  deployment, // 部署中
  configInput, // 等待配置输入（config_input 类型）
}
