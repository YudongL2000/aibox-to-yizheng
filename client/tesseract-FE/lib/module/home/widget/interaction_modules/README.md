# 交互模块组件说明

所有交互对话框中的展示模块都已封装为独立组件，方便通过数据驱动显示不同的内容。

## 组件列表

### 1. UserInputBubble - 用户输入气泡
显示用户输入的消息气泡。

```dart
UserInputBubble(text: '用户输入的文本')
```

### 2. InstructionText - 指令文本
显示AI指令文本。

```dart
InstructionText(text: '意图解析完毕。为了建立视觉识别模型,请上传照片:')
```

### 3. ImageUploadArea - 图片上传区域
显示图片上传区域，支持点击上传。

```dart
ImageUploadArea(
  onTap: () {
    // 处理图片上传
  },
)
```

### 4. ImagePreview - 图片预览
显示上传的图片预览和确认按钮。

```dart
ImagePreview(
  imageUrl: 'https://example.com/image.jpg', // 可选
  onConfirm: () {
    // 确认并开始特征提取
  },
)
```

### 5. SuccessCard - 成功卡片
显示成功消息卡片，支持显示详细信息。

```dart
SuccessCard(
  text: '操作成功',
  data: {
    'name': '老刘',
    'dataHash': '#007LX',
    'confidence': '99.2%',
  },
)
```

### 6. VoiceOption - 语音选项
单个语音选项组件。

```dart
VoiceOption(
  voice: '暴躁大妈',
  isSelected: true,
  onTap: () {
    // 选择语音
  },
)
```

### 7. VoiceSetupWidget - 语音设置
完整的语音设置组件，包含多个语音选项。

```dart
VoiceSetupWidget(
  voiceOptions: ['暴躁大妈', '机械冷酷'],
  selectedVoice: '暴躁大妈',
  onVoiceSelected: (voice) {
    // 选择语音
  },
  onConfirm: () {
    // 确认语音配置
  },
)
```

### 8. VoiceMappingCard - 语音映射卡片
显示语音映射信息。

```dart
VoiceMappingCard(
  voiceData: {
    'voice': '暴躁大妈',
    'timbreId': '#B_AUNT',
    'emoCoef': 0.88,
  },
)
```

### 9. WorkflowDetailsWidget - 工作流详情
显示工作流详情和操作按钮。

```dart
WorkflowDetailsWidget(
  details: {
    '人物名称': '老刘',
    '动作手势': '中指',
    '语音内容': '你是猪-音色: 暴躁大妈',
  },
  onContinue: () {
    // 继续交流
  },
  onConfirm: () {
    // 确认构建工作流
  },
)
```

### 10. DeploymentSectionWidget - 部署区域
显示部署选项。

```dart
DeploymentSectionWidget(
  question: '是否启动一键同步,部署至硬件终端?',
  cancelText: '暂不部署',
  confirmText: '一键部署到硬件',
  onCancel: () {
    // 暂不部署
  },
  onConfirm: () {
    // 一键部署到硬件
  },
)
```

### 11. SystemMessageWidget - 系统消息
显示系统消息文本。

```dart
SystemMessageWidget(text: '正在处理您的指令...')
```

## 数据驱动示例

### 根据消息类型动态显示组件

```dart
Widget buildMessage(InteractionMessage message) {
  switch (message.type) {
    case MessageType.userInput:
      return UserInputBubble(text: message.text);
    case MessageType.instruction:
      return InstructionText(text: message.text);
    case MessageType.success:
      return SuccessCard(text: message.text, data: message.data);
    case MessageType.voiceMapping:
      return VoiceMappingCard(voiceData: message.voiceData!);
    case MessageType.system:
      return SystemMessageWidget(text: message.text);
    default:
      return const SizedBox.shrink();
  }
}
```

### 根据交互状态显示不同组件

```dart
Widget buildContentByState(InteractionState state) {
  switch (state) {
    case InteractionState.uploading:
      return ImageUploadArea(onTap: handleUpload);
    case InteractionState.imageUploaded:
      return ImagePreview(imageUrl: imageUrl, onConfirm: handleConfirm);
    case InteractionState.voiceSetup:
      return VoiceSetupWidget(
        voiceOptions: ['暴躁大妈', '机械冷酷'],
        selectedVoice: selectedVoice,
        onVoiceSelected: selectVoice,
        onConfirm: confirmVoice,
      );
    case InteractionState.workflowReady:
      return WorkflowDetailsWidget(
        details: workflowDetails,
        onConfirm: confirmWorkflow,
      );
    case InteractionState.deployment:
      return DeploymentSectionWidget(
        onConfirm: deployToHardware,
      );
    default:
      return const SizedBox.shrink();
  }
}
```

## 模型定义

所有模型定义在 `interaction_models.dart` 中：

- `InteractionMessage`: 交互消息模型
- `MessageType`: 消息类型枚举
- `InteractionState`: 交互状态枚举

## 使用建议

1. **数据驱动**: 通过 `MessageType` 和 `InteractionState` 枚举来控制显示哪个组件
2. **组件复用**: 所有组件都是独立的，可以在任何地方复用
3. **灵活配置**: 每个组件都支持通过参数自定义内容和行为
4. **统一导出**: 通过 `interaction_modules.dart` 统一导出所有组件和模型
