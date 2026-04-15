/*
 * [INPUT]: 依赖 agent chat/confirm/validate/deploy 接口、硬件桥 facade、缓存上传能力，并接收工作台传入的布局状态与 workflow URL/教学接力回调。
 * [OUTPUT]: 对外提供 AiInteractionWindow 双模组件，统一承接教学模式与 OpenClaw 对话模式，并向父层回传 workflow URL 与 backend-first digital twin scene，同时复用 Spatial dark shell 的硬边 panel/button/input/status 语义。
 * [POS]: module/home/widget 的 AI 交互总壳，负责把 backend 响应折叠为工作流卡片或对话模式状态，同时转发物理 cue、部署确认与教学跳转；未接线的本地占位 workflow/config UI 不再保留，并统一工作台对话壳层语法。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:aitesseract/module/home/widget/dialogue_mode/dialogue_mode_card.dart';
import 'package:aitesseract/module/home/widget/dialogue_mode/dialogue_mode_mapper.dart';
import 'package:aitesseract/module/home/widget/dialogue_mode/dialogue_mode_models.dart';
import 'package:aitesseract/module/home/widget/dialogue_mode/dialogue_mode_state.dart';
import 'package:aitesseract/module/home/widget/interaction_modules/interaction_modules.dart';
import 'package:aitesseract/server/api/agent_chat_api.dart';
import 'package:aitesseract/server/api/agent_confirm_api.dart';
import 'package:aitesseract/server/api/agent_confirm_node_api.dart'
    show AgentConfirmNodeApi;
import 'package:aitesseract/server/api/agent_reset_session_api.dart';
import 'package:aitesseract/server/api/agent_start_deploy_api.dart';
import 'package:aitesseract/server/api/agent_start_config_api.dart'
    show AgentStartConfigApi, ConfigNode;
import 'package:aitesseract/server/api/agent_upload_api.dart';
import 'package:aitesseract/server/api/agent_validate_hardware_api.dart';
import 'package:aitesseract/server/api/dialogue_mode_models.dart'
    as dialogue_api;
import 'package:aitesseract/server/api/health_check_api.dart';
import 'package:aitesseract/server/hardware_bridge/hardware_bridge_models.dart';
import 'package:aitesseract/server/hardware_bridge/hardware_bridge_service.dart';
import 'package:aitesseract/server/api/workflow_api.dart';
import 'package:aitesseract/server/Http_config.dart';
import 'package:aitesseract/server/mqtt/mqtt_device_service.dart';
import 'package:dio/dio.dart' hide ResponseType;
import 'package:flutter/gestures.dart' show PointerDeviceKind;
import 'package:flutter/material.dart';
import 'package:aitesseract/utils/cache/cache_manager.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:image_picker/image_picker.dart';

/// AI交互窗口组件
/// 参考图片实现完整的AI交互界面
enum _AssistantPanelMode { teaching, dialogue }

class AiInteractionWindow extends StatefulWidget {
  final String? initialPrompt; // 初始提示文本
  final bool startInDialogueMode;
  final Function(String)? onWorkflowUrlUpdated; // workflow URL更新回调
  final ValueChanged<DigitalTwinSceneConfig?>?
      onDigitalTwinSceneUpdated; // 数字孪生场景更新回调
  final VoidCallback? onNewChat; // 结束当前会话（未传则使用内部 _clearChat）
  final VoidCallback? onFullscreenTap; // AI 对话框全屏 / 退出全屏
  final VoidCallback? onViewHistoryTap; // 查看历史
  /// 进入配置阶段时回调（用于工作空间收起工作流窗口）
  final VoidCallback? onEnterConfigStage;

  /// Code console 更新：构建工作流/部署时展示 JSON，(visible, jsonText)
  final void Function(bool visible, String? json)? onCodeConsoleUpdate;

  /// 当前是否为 AI 对话框全屏状态（用于显示全屏/退出全屏图标）
  final bool isAiPanelFullscreen;

  /// n8n WebView 是否已加载完成，未加载完成时不显示「开始配置」可点击状态
  final bool isN8nLoaded;

  /// 标题栏高度，与工作空间左中栏一致（不传则使用默认值）
  final double? headerHeight;

  /// 是否为三栏同时显示（n8n 流程图 + 数字孪生 + 对话框），为 true 时对话框内组件最大宽度为对话框宽度的 4/5
  final bool isThreeColumnLayout;
  final ValueChanged<String>? onTeachingHandoffRequested;

  const AiInteractionWindow({
    super.key,
    this.initialPrompt,
    this.startInDialogueMode = false,
    this.onWorkflowUrlUpdated,
    this.onDigitalTwinSceneUpdated,
    this.onNewChat,
    this.onFullscreenTap,
    this.onViewHistoryTap,
    this.onEnterConfigStage,
    this.onCodeConsoleUpdate,
    this.isAiPanelFullscreen = false,
    this.isN8nLoaded = true,
    this.headerHeight,
    this.isThreeColumnLayout = false,
    this.onTeachingHandoffRequested,
  });

  @override
  State<AiInteractionWindow> createState() => _AiInteractionWindowState();
}

class _AiInteractionWindowState extends State<AiInteractionWindow> {
  final TextEditingController _commandController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ScrollController _suggestionScrollController = ScrollController();
  final HealthCheckApi _healthCheckApi = HealthCheckApi();
  final AgentChatApi _agentChatApi = AgentChatApi();
  final AgentUploadApi _agentUploadApi = AgentUploadApi();
  final AgentConfirmApi _agentConfirmApi = AgentConfirmApi();
  final AgentResetSessionApi _agentResetSessionApi = AgentResetSessionApi();
  final AgentStartConfigApi _agentStartConfigApi = AgentStartConfigApi();
  final AgentStartDeployApi _agentStartDeployApi = AgentStartDeployApi();
  final AgentConfirmNodeApi _agentConfirmNodeApi = AgentConfirmNodeApi();
  final AgentValidateHardwareApi _agentValidateHardwareApi =
      AgentValidateHardwareApi();
  final WorkflowApi _workflowApi = WorkflowApi();
  final HardwareBridgeService _hardwareBridgeService = HardwareBridgeService();
  final ImagePicker _imagePicker = ImagePicker();

  // 配置流程相关状态
  bool _isConfiguring = false; // 是否正在配置
  ConfigNode? _currentConfigNode; // 当前配置节点
  String? _currentWorkflowId; // 当前工作流ID
  MqttDeviceService? _mqttService; // MQTT 服务（用于发送 workflow JSON）
  int _currentStep =
      0; // 当前进度步骤（0-4）：0=未开始，1=开始聊天，2=summary_ready，3=workflow_ready，4=一键部署
  bool _isHealthOk = false; // 健康检查状态
  bool _isCheckingHealth = false; // 是否正在检查健康状态
  bool _isSending = false; // 是否正在发送消息
  bool _isUploading = false; // 是否正在上传图片
  bool _isCreatingWorkflow = false; // 是否正在创建workflow
  bool _isConfirmingBlueprint = false; // 是否正在确认构建（蓝图卡片蒙板）
  String? _sessionId; // 服务端会话ID

  // 交互状态
  InteractionState _interactionState = InteractionState.idle;
  String? _uploadedImageId;
  String? _uploadedImageBase64; // 上传的图片base64数据
  String? _uploadProfile; // 上传的人物名称（老刘 | 老付 | 老王）
  /// 上传人脸图片之前那次接口返回的 currentNode.name，再次调用 confirm-node 时用此作为 nodeName
  String? _faceUploadNodeName;
  // 选择的图片（未上传）
  String? _selectedImageBase64; // 选择的图片base64数据（用于预览）
  String? _selectedImageExtension; // 选择的图片扩展名
  int? _selectedImageWidth; // 选择图片的宽度
  int? _selectedImageHeight; // 选择图片的高度
  Map<String, dynamic>? _workflowData;
  Blueprint? _currentBlueprint; // 当前蓝图数据
  Workflow? _currentWorkflow; // 当前workflow数据
  Interaction? _currentInteraction; // 当前交互配置
  bool _isBlueprintBuilt = false; // 蓝图是否已完成构建状态
  bool _isWorkflowCreated = false; // 是否已创建 n8n 工作流
  bool _isWorkflowDeployed = false; // 是否已部署到硬件
  bool _isDeployingWorkflow = false; // 是否正在部署
  bool _isHotPlugConfirmed = false; // hot_plugging 是否已确认
  _AssistantPanelMode _panelMode = _AssistantPanelMode.teaching;
  DialogueModePanelState _dialoguePanelState = DialogueModePanelState.initial();
  dialogue_api.DialogueModeEnvelope? _dialogueEnvelope;
  String? _dialogueLastUserPrompt;
  final Set<String> _dialogueTriggeredCueKeys = <String>{};
  StreamSubscription<HardwareBridgeEvent>? _hardwareBridgeEventSub;
  StreamSubscription<HardwareBridgeState>? _hardwareBridgeStateSub;

  SpatialThemeData get _spatial => context.spatial;

  Color _toneColor(SpatialStatusTone tone) => _spatial.status(tone);

  // 对话消息列表
  final List<InteractionMessage> _messages = [];

  /// 快捷输入文案列表（横向 ListView 展示，多时可滚动）
  static const List<String> _teachingSuggestionTexts = <String>[
    '见过老付打招呼',
    '和我共情',
    '石头剪刀布',
  ];
  static const List<String> _dialogueSuggestionTexts = <String>[
    '跟我玩石头剪刀布',
    '帮我给花浇水',
  ];

  void _emitDigitalTwinSceneFromResponse(ResponseData responseData) {
    final scene = DigitalTwinSceneConfig.tryParse(
      responseData.digitalTwinScene,
    );
    if (scene == null) {
      return;
    }
    widget.onDigitalTwinSceneUpdated?.call(scene);
  }

  Future<void> _ensureDialogueBridgeConnected() async {
    if (_hardwareBridgeEventSub != null && _hardwareBridgeStateSub != null) {
      return;
    }

    setState(() {
      _dialoguePanelState = _dialoguePanelState.copyWith(
        isBridgeConnecting: true,
      );
    });

    _hardwareBridgeEventSub = _hardwareBridgeService.events.listen(
      _handleDialogueHardwareEvent,
    );
    _hardwareBridgeStateSub = _hardwareBridgeService.states.listen((state) {
      if (!mounted) {
        return;
      }
      setState(() {
        _dialoguePanelState = _dialoguePanelState.copyWith(
          isBridgeConnecting: false,
        );
      });
    });

    final connected = await _hardwareBridgeService.connect();
    if (!mounted) {
      return;
    }
    setState(() {
      _dialoguePanelState = _dialoguePanelState.copyWith(
        isBridgeConnecting: false,
      );
    });

    if (!connected) {
      final nextModel = _dialoguePanelState.viewModel.copyWith(
        message: '硬件桥暂时还没连上，我先在本地等你发指令。',
      );
      setState(() {
        _dialoguePanelState = _dialoguePanelState.withViewModel(nextModel);
      });
    }
  }

  void _handleDialogueHardwareEvent(HardwareBridgeEvent event) {
    if (!_shouldValidateDialogueHardware(event)) {
      return;
    }

    final loadingModel = _dialoguePanelState.viewModel.copyWith(
      message: '正在校验硬件/同步数据...',
      showValidationLoader: true,
      actions: const [],
    );
    setState(() {
      _dialoguePanelState = _dialoguePanelState.withViewModel(
        loadingModel,
        sessionId: _dialoguePanelState.sessionId,
      );
    });

    unawaited(_validateDialogueHardware(event));
  }

  bool _shouldValidateDialogueHardware(HardwareBridgeEvent event) {
    if (_panelMode != _AssistantPanelMode.dialogue) {
      return false;
    }
    if (_dialoguePanelState.sessionId == null ||
        _dialoguePanelState.sessionId!.isEmpty) {
      return false;
    }
    if (_dialogueEnvelope == null) {
      return false;
    }
    return event.eventType !=
        dialogue_api.DialogueModeHardwareEventType.heartbeat;
  }

  Future<void> _validateDialogueHardware(HardwareBridgeEvent event) async {
    final sessionId = _dialoguePanelState.sessionId;
    if (sessionId == null || sessionId.isEmpty) {
      return;
    }

    try {
      final response = await _agentValidateHardwareApi.validateHardware(
        sessionId: sessionId,
        event: event,
      );
      if (response == null) {
        return;
      }
      _handleDialogueResponse(
        response,
        fallbackMessage: response.response.message ?? '硬件状态已刷新。',
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      final failedModel = _dialoguePanelState.viewModel.copyWith(
        message: '好像没插对哦，再检查一下接口？',
        showValidationLoader: false,
      );
      setState(() {
        _dialoguePanelState = _dialoguePanelState.withViewModel(
          failedModel,
          sessionId: sessionId,
        );
      });
    }
  }

  void _handleDialogueResponse(
    ChatResponse response, {
    required String fallbackMessage,
  }) {
    _emitDigitalTwinSceneFromResponse(response.response);

    final envelope = response.response.dialogueMode;
    if (envelope == null) {
      final fallbackModel = _dialoguePanelState.viewModel.copyWith(
        message: fallbackMessage,
        showValidationLoader: false,
      );
      setState(() {
        _dialoguePanelState = _dialoguePanelState.withViewModel(
          fallbackModel,
          sessionId: response.sessionId,
        );
      });
      return;
    }

    final nextViewModel = mapDialogueEnvelopeToViewModel(
      envelope,
      fallbackMessage: fallbackMessage,
    );

    setState(() {
      _dialogueEnvelope = envelope;
      _dialoguePanelState = _dialoguePanelState.withViewModel(
        nextViewModel,
        sessionId: response.sessionId,
      );
    });

    final cue = envelope.physicalCue ??
        (envelope.deploymentPrompt?.wakeCue?.autoTrigger == true
            ? envelope.deploymentPrompt?.wakeCue
            : null);
    if (cue != null && cue.autoTrigger) {
      unawaited(
        _dispatchDialoguePhysicalCue(
          cue,
          sessionId: response.sessionId,
          phase: envelope.phase,
        ),
      );
    }
  }

  Future<void> _dispatchDialoguePhysicalCue(
    dialogue_api.DialogueModePhysicalCue cue, {
    required String sessionId,
    required dialogue_api.DialogueModePhase phase,
  }) async {
    final cueKey =
        '$sessionId:${cue.action.name}:${cue.targetComponentId ?? 'any'}:${phase.name}';
    if (_dialogueTriggeredCueKeys.contains(cueKey)) {
      return;
    }

    _dialogueTriggeredCueKeys.add(cueKey);
    final dispatched = await _hardwareBridgeService.dispatchPhysicalCue(
      cue,
      sessionId: sessionId,
    );
    if (!dispatched) {
      _dialogueTriggeredCueKeys.remove(cueKey);
    }
  }

  Future<void> _handleDialogueActionTap(DialogueModeAction action) async {
    switch (action.id) {
      case 'start_deploy':
        await _startDialogueDeploy();
        return;
      case 'open_teaching_mode':
        _openTeachingModeFromDialogue();
        return;
      default:
        return;
    }
  }

  Future<void> _startDialogueDeploy() async {
    final sessionId = _dialoguePanelState.sessionId;
    if (sessionId == null || sessionId.isEmpty) {
      EasyLoading.showError('当前还没有可部署的会话');
      return;
    }

    try {
      EasyLoading.show(status: '开始部署...');
      final response = await _agentStartDeployApi.startDeploy(
        sessionId: sessionId,
      );
      EasyLoading.dismiss();
      if (response == null) {
        EasyLoading.showError('开始部署失败');
        return;
      }
      _handleDialogueResponse(
        response,
        fallbackMessage: response.response.message ?? '装备齐全，来玩吧！',
      );
    } catch (error) {
      EasyLoading.dismiss();
      EasyLoading.showError('开始部署失败: $error');
    }
  }

  void _openTeachingModeFromDialogue() {
    final handoff = _dialogueEnvelope?.teachingHandoff;
    final teachingGoal =
        handoff?.prefilledGoal ?? _dialoguePanelState.viewModel.teachingGoal;
    if (teachingGoal == null || teachingGoal.trim().isEmpty) {
      EasyLoading.showError('缺少教学目标，无法切换');
      return;
    }
    widget.onTeachingHandoffRequested?.call(teachingGoal);
  }

  void _handleDialogueSkillTap(String prompt) {
    _commandController.text = prompt;
    unawaited(_sendDialogueCommand());
  }

  @override
  void initState() {
    super.initState();
    _panelMode = widget.startInDialogueMode
        ? _AssistantPanelMode.dialogue
        : _AssistantPanelMode.teaching;
    if (_panelMode == _AssistantPanelMode.dialogue) {
      unawaited(_ensureDialogueBridgeConnected());
    }
    // 初始化时检查健康状态
    if (widget.initialPrompt != null && widget.initialPrompt!.isNotEmpty) {
      // 如果有初始提示，先检查健康状态，然后自动发送
      _checkHealthStatus().then((_) {
        // 健康检查完成后，延迟一下确保页面已加载，然后处理初始提示
        Future.delayed(SpatialDesignTokens.motionSlow, () {
          _processInitialPrompt(widget.initialPrompt!);
        });
      });
    } else {
      // 没有初始提示时，只检查健康状态
      _checkHealthStatus();
    }
  }

  /// 检查健康状态
  Future<void> _checkHealthStatus() async {
    if (_isCheckingHealth) return;

    setState(() {
      _isCheckingHealth = true;
    });

    try {
      final isOk = await _healthCheckApi.checkHealth();
      setState(() {
        _isHealthOk = isOk;
        _isCheckingHealth = false;
      });
    } catch (e) {
      setState(() {
        _isHealthOk = false;
        _isCheckingHealth = false;
      });
    }
  }

  @override
  void dispose() {
    _commandController.dispose();
    _scrollController.dispose();
    _suggestionScrollController.dispose();
    _hardwareBridgeEventSub?.cancel();
    _hardwareBridgeStateSub?.cancel();
    _hardwareBridgeService.dispose();
    super.dispose();
  }

  void _processInitialPrompt(String prompt) {
    // 将初始提示填充到输入框并自动发送
    setState(() {
      _commandController.text = prompt;
    });
    // 延迟一下确保输入框已更新，然后自动发送
    Future.delayed(SpatialDesignTokens.motionBase, () {
      _sendCommand();
    });
  }

  void _sendCommand() async {
    if (_panelMode == _AssistantPanelMode.dialogue) {
      await _sendDialogueCommand();
      return;
    }

    final command = _commandController.text.trim();

    // 检查输入是否为空
    if (command.isEmpty) {
      EasyLoading.showError('请输入消息内容');
      return;
    }

    // 检查是否正在发送
    if (_isSending) {
      return;
    }

    // 先检查健康状态
    if (!_isHealthOk) {
      // 如果健康检查未通过，先执行健康检查
      EasyLoading.show(status: '检查服务状态...');
      await _checkHealthStatus();
      EasyLoading.dismiss();

      if (!_isHealthOk) {
        EasyLoading.showError('服务不可用，请稍后重试');
        return;
      }
    }

    // 清空输入框
    _commandController.clear();

    // 添加用户消息到列表
    setState(() {
      _messages.add(
        InteractionMessage(
          text: command,
          isUser: true,
          type: MessageType.userInput,
        ),
      );
      _isSending = true;
    });

    // 检查是否是 config_input 状态
    if (_interactionState == InteractionState.configInput &&
        _currentConfigNode != null) {
      // 处理 config_input 类型的输入
      await _handleConfigInput(command);
      return;
    }

    // 调用对话接口
    try {
      EasyLoading.show(status: '发送中...');

      final chatResponse = await _agentChatApi.sendMessage(
        message: command,
        sessionId: _sessionId,
      );

      EasyLoading.dismiss();

      if (chatResponse != null) {
        // 保存 sessionId
        _sessionId = chatResponse.sessionId;

        // 开始聊天，点亮节点1
        if (_currentStep < 1) {
          setState(() {
            _currentStep = 1;
          });
        }

        // 处理响应
        _handleChatResponse(chatResponse);
      } else {
        EasyLoading.showError('发送失败，请重试');
      }
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError('发送失败: ${e.toString()}');
    } finally {
      setState(() {
        _isSending = false;
      });
    }
  }

  Future<void> _sendDialogueCommand() async {
    final command = _commandController.text.trim();
    if (command.isEmpty) {
      EasyLoading.showError('请输入消息内容');
      return;
    }

    if (_dialoguePanelState.isSending) {
      return;
    }

    if (!_isHealthOk) {
      EasyLoading.show(status: '检查服务状态...');
      await _checkHealthStatus();
      EasyLoading.dismiss();
      if (!_isHealthOk) {
        EasyLoading.showError('服务不可用，请稍后重试');
        return;
      }
    }

    _commandController.clear();
    setState(() {
      _dialogueLastUserPrompt = command;
      _dialoguePanelState = _dialoguePanelState.copyWith(isSending: true);
    });

    try {
      EasyLoading.show(status: 'OpenClaw 正在思考...');
      final chatResponse = await _agentChatApi.sendMessage(
        message: command,
        sessionId: _dialoguePanelState.sessionId,
        interactionMode: dialogue_api.DialogueModeInteractionMode.dialogue,
      );
      EasyLoading.dismiss();

      if (chatResponse == null) {
        EasyLoading.showError('发送失败，请重试');
        return;
      }

      _handleDialogueResponse(
        chatResponse,
        fallbackMessage: chatResponse.response.message ?? '我准备好了，继续吧。',
      );
    } catch (error) {
      EasyLoading.dismiss();
      EasyLoading.showError('发送失败: $error');
    } finally {
      if (mounted) {
        setState(() {
          _dialoguePanelState = _dialoguePanelState.copyWith(isSending: false);
        });
      }
    }
  }

  /// 统一处理响应（支持所有对话类型和配置类型）
  void _handleResponse(ResponseData responseData) {
    setState(() {
      // 根据响应类型处理不同的交互
      switch (responseData.type) {
        case ResponseType.guidance:
          // 继续收集信息 - 显示纯文本组件（InstructionText）
          if (responseData.message != null) {
            _messages.add(
              InteractionMessage(
                text: responseData.message!,
                isUser: false,
                type: MessageType.instruction,
              ),
            );
          }
          _interactionState = InteractionState.idle;
          break;

        case ResponseType.configInput:
          // 配置输入类型 - 显示文本并等待用户输入
          if (responseData.message != null) {
            _messages.add(
              InteractionMessage(
                text: responseData.message!,
                isUser: false,
                type: MessageType.instruction,
              ),
            );
          }
          // 保存当前节点信息，用于后续处理用户输入
          _currentConfigNode = responseData.currentNode;
          if (responseData.configMetadata?.workflowId != null) {
            _currentWorkflowId = responseData.configMetadata!.workflowId;
          }
          // 设置状态为等待配置输入
          _interactionState = InteractionState.configInput;
          break;

        case ResponseType.hotPlugging:
          // 热插拔类型 - 显示文本+确认按钮（如果 showConfirmButton 为 true）
          if (responseData.message != null) {
            _messages.add(
              InteractionMessage(
                text: responseData.message!,
                isUser: false,
                type: MessageType.instruction,
                data: {
                  'hotPlugging': true,
                  'showConfirmButton':
                      responseData.configMetadata?.showConfirmButton ?? false,
                  'responseData': responseData, // 保存响应数据用于按钮点击
                },
              ),
            );
          }
          // 新一轮 hot_plugging 交互开始，重置确认状态
          _isHotPlugConfirmed = false;
          _interactionState = InteractionState.idle;
          break;

        case ResponseType.summaryReady:
          // 给出结构化摘要 + 蓝图 - 显示BlueprintSummaryWidget
          if (responseData.message != null) {
            _messages.add(
              InteractionMessage(
                text: responseData.message!,
                isUser: false,
                type: MessageType.instruction,
              ),
            );
          }
          // 保存蓝图数据
          if (responseData.blueprint != null) {
            _currentBlueprint = responseData.blueprint;
            // 新一轮蓝图 / 工作流流程开始，重置相关状态
            _isBlueprintBuilt = false;
            _isWorkflowCreated = false;
            _isWorkflowDeployed = false;
            _interactionState = InteractionState.summaryReady;
            _addCardMessageIfNeeded(MessageType.blueprintCard);
            // 触发summary_ready，点亮节点2
            _currentStep = 2;
          }
          break;

        case ResponseType.workflowReady:
          // 生成了可用的 workflow - 先显示部署选择
          if (responseData.message != null) {
            _messages.add(
              InteractionMessage(
                text: responseData.message!,
                isUser: false,
                type: MessageType.instruction,
              ),
            );
          }
          // 保存workflow数据
          if (responseData.workflow != null) {
            _currentWorkflow = responseData.workflow;
            _workflowData = {
              'name': responseData.workflow!.name ?? '',
              'nodeCount': responseData.metadata?.nodeCount?.toString() ?? '0',
            };
            // 新的 workflow 就绪，重置构建 / 部署状态
            _isWorkflowCreated = false;
            _isWorkflowDeployed = false;
            _addCardMessageIfNeeded(MessageType.workflowCard);
            // 直接显示部署选择；部署卡片仅在 configComplete 时插入
            _interactionState = InteractionState.deployment;
            // 触发workflow_ready，点亮节点3
            _currentStep = 3;
          }
          break;

        case ResponseType.selectSingle:
          // 单选交互（用于音色/emoji/底盘动作等）
          // 不单独插 message：SelectInteractionWidget 会展示 interaction.description，与 message 通常相同，避免重复
          if (responseData.interaction != null) {
            _handleSingleSelectInteraction(responseData.interaction!);
          }
          // 保存配置相关数据
          _currentConfigNode = responseData.currentNode;
          if (responseData.configMetadata?.workflowId != null) {
            _currentWorkflowId = responseData.configMetadata!.workflowId;
          }
          return; // 等待用户交互

        case ResponseType.selectMulti:
          // 多选交互（用于机械手/手势识别/情绪分类/机械臂）
          // 不单独插 message：SelectInteractionWidget 会展示 interaction.description，避免与 message 重复
          if (responseData.interaction != null) {
            _handleMultiSelectInteraction(responseData.interaction!);
          }
          // 保存配置相关数据
          _currentConfigNode = responseData.currentNode;
          if (responseData.configMetadata?.workflowId != null) {
            _currentWorkflowId = responseData.configMetadata!.workflowId;
          }
          return; // 等待用户交互

        case ResponseType.imageUpload:
          // 图片上传交互（用于人脸识别样本）
          if (responseData.message != null) {
            _messages.add(
              InteractionMessage(
                text: responseData.message!,
                isUser: false,
                type: MessageType.instruction,
              ),
            );
          }
          // 保存当前交互配置，用于上传时获取profile等信息
          _currentInteraction = responseData.interaction;
          _interactionState = InteractionState.uploading;
          // 保存配置相关数据；保存本次 currentNode.name，上传人脸后再次 confirm-node 时用
          _currentConfigNode = responseData.currentNode;
          _faceUploadNodeName = responseData.currentNode?.name;
          if (responseData.configMetadata?.workflowId != null) {
            _currentWorkflowId = responseData.configMetadata!.workflowId;
          }
          return; // 等待用户交互

        case ResponseType.error:
          // 异常
          _messages.add(
            InteractionMessage(
              text: responseData.message ?? '发生错误，请重试',
              isUser: false,
              type: MessageType.system,
            ),
          );
          break;

        case ResponseType.dialogueMode:
          if (responseData.dialogueMode != null) {
            _panelMode = _AssistantPanelMode.dialogue;
            _dialogueEnvelope = responseData.dialogueMode;
            _dialoguePanelState = _dialoguePanelState.withViewModel(
              mapDialogueEnvelopeToViewModel(
                responseData.dialogueMode!,
                fallbackMessage: responseData.message ?? 'OpenClaw 已上线。',
              ),
              sessionId: _dialoguePanelState.sessionId,
            );
          }
          break;

        case ResponseType.configStart:
        case ResponseType.configNodePending:
        case ResponseType.configComplete:
          // 配置相关类型 - 显示纯文本消息
          if (responseData.message != null &&
              responseData.message!.isNotEmpty) {
            _messages.add(
              InteractionMessage(
                text: responseData.message!,
                isUser: false,
                type: MessageType.instruction,
                data: {
                  'configType': responseData.type.toString(),
                  'currentNode': responseData.currentNode?.name,
                  'progress': responseData.progress != null
                      ? '${responseData.progress!.completed}/${responseData.progress!.total}'
                      : null,
                },
              ),
            );
          }

          // 保存配置相关数据
          _currentConfigNode = responseData.currentNode;
          if (responseData.configMetadata?.workflowId != null) {
            _currentWorkflowId = responseData.configMetadata!.workflowId;
          }

          // 配置完成：插入部署卡片（DeploymentSectionWidget）并调用 workflow 接口
          if ((responseData.progress != null &&
                  responseData.progress!.completed ==
                      responseData.progress!.total) ||
              responseData.type == ResponseType.configComplete) {
            _addCardMessageIfNeeded(MessageType.deploymentCard);
            _interactionState = InteractionState.deployment;
            _currentStep = 4;
            return;
          }

          // SCREEN 和 TTS 类别需要单独处理（用户交互）
          if (responseData.currentNode != null &&
              (responseData.currentNode!.category == 'SCREEN' ||
                  responseData.currentNode!.category == 'TTS')) {
            // SCREEN 或 TTS：显示交互界面，等待用户操作
            _showInteractiveConfig(responseData.currentNode!);
          } else {
            // 其他情况：直接调用下一步接口（自动继续配置）
            _continueConfig(responseData);
          }
          break;
      }
    });
    _emitDigitalTwinSceneFromResponse(responseData);
  }

  /// 处理对话响应（兼容旧接口）
  void _handleChatResponse(ChatResponse response) {
    _handleResponse(response.response);
  }

  /// 处理单选交互
  void _handleSingleSelectInteraction(Interaction interaction) {
    setState(() {
      _currentInteraction = interaction;
      // 统一使用 SelectInteractionWidget
      _interactionState = InteractionState.selectInteraction;

      // 显示交互消息
      if (interaction.title != null || interaction.description != null) {
        _messages.add(
          InteractionMessage(
            text: interaction.description ?? interaction.title ?? '',
            isUser: false,
            type: MessageType.instruction,
          ),
        );
      }
    });
  }

  /// 处理多选交互
  void _handleMultiSelectInteraction(Interaction interaction) {
    setState(() {
      _currentInteraction = interaction;
      _interactionState = InteractionState.selectInteraction;

      // 显示交互消息
      if (interaction.title != null || interaction.description != null) {
        _messages.add(
          InteractionMessage(
            text: interaction.description ?? interaction.title ?? '',
            isUser: false,
            type: MessageType.instruction,
          ),
        );
      }
    });
  }

  /// 提交选择的值
  void _submitSelection(List<String> selectedValues) async {
    if (selectedValues.isEmpty || _currentInteraction == null) return;

    try {
      // 多选用逗号隔开，单选直接传值
      final message = selectedValues.join(',');

      // 获取选中项的label用于显示
      final selectedLabels = <String>[];
      if (_currentInteraction!.options != null) {
        for (final value in selectedValues) {
          final option = _currentInteraction!.options!.firstWhere(
            (opt) => opt.value == value,
            orElse: () => InteractionOption(label: value, value: value),
          );
          selectedLabels.add(option.label);
        }
      } else {
        selectedLabels.addAll(selectedValues);
      }

      // 添加用户消息到列表（显示用户选择的内容）
      setState(() {
        _messages.add(
          InteractionMessage(
            text: selectedLabels.join(', '),
            isUser: true,
            type: MessageType.userInput,
          ),
        );
        _isSending = true;
        // 清空选择交互状态
        _interactionState = InteractionState.idle;
        _currentInteraction = null;
      });

      EasyLoading.show(status: '提交中...');

      // 调用 /api/agent/chat 接口，参数 message 为选择项的 value（多选用逗号隔开）
      final chatResponse = await _agentChatApi.sendMessage(
        message: message,
        sessionId: _sessionId,
      );

      EasyLoading.dismiss();

      if (chatResponse != null) {
        // 保存 sessionId
        _sessionId = chatResponse.sessionId;

        // 开始聊天，点亮节点1
        if (_currentStep < 1) {
          setState(() {
            _currentStep = 1;
          });
        }

        // 处理响应
        _handleChatResponse(chatResponse);
      } else {
        EasyLoading.showError('提交失败，请重试');
      }
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError('提交失败: ${e.toString()}');
    } finally {
      setState(() {
        _isSending = false;
      });
    }
  }

  /// 选择图片（只选择，不立即上传）
  void _handleImagePick() async {
    try {
      // 使用图片选择器选择图片
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );

      if (image == null) return;

      // 读取图片文件并转换为base64（用于预览）
      // 使用 XFile.readAsBytes() 而不是 File，以支持 Web 平台
      final Uint8List imageBytes = await image.readAsBytes();
      final String base64Image = base64Encode(imageBytes);
      final ui.Size imageSize = await _decodeSelectedImageSize(imageBytes);

      // 获取文件扩展名
      final String extension = image.path.split('.').last.toLowerCase();
      final String mimeType = extension == 'png'
          ? 'image/png'
          : extension == 'jpg' || extension == 'jpeg'
              ? 'image/jpeg'
              : 'image/png';

      // 构建base64数据URI
      final String contentBase64 = 'data:$mimeType;base64,$base64Image';

      // 保存图片信息并自动上传（选图即上传，无需额外确认）
      setState(() {
        _selectedImageBase64 = contentBase64;
        _selectedImageExtension = extension;
        _selectedImageWidth = imageSize.width.round();
        _selectedImageHeight = imageSize.height.round();
        _interactionState = InteractionState.imageSelected;
      });

      // 选图后自动触发上传
      _confirmImageUpload();
    } catch (e) {
      EasyLoading.showError('选择图片失败: ${e.toString()}');
    }
  }

  Future<ui.Size> _decodeSelectedImageSize(Uint8List imageBytes) async {
    final codec = await ui.instantiateImageCodec(imageBytes);
    final frame = await codec.getNextFrame();
    final image = frame.image;
    final size = ui.Size(image.width.toDouble(), image.height.toDouble());
    image.dispose();
    codec.dispose();
    return size;
  }

  /// 确认上传图片（「确认并开始特征提取」按钮回调，调用 uploadFace 并刷新对话）
  void _confirmImageUpload() async {
    if (_isUploading || _selectedImageBase64 == null) return;

    try {
      EasyLoading.show(status: '上传中...');
      setState(() {
        _isUploading = true;
      });

      // 从交互配置中获取profile，如果没有则使用默认值
      String profile = '老刘'; // 默认值
      if (_currentInteraction != null &&
          _currentInteraction!.field == 'face_profiles') {
        // 尝试从interaction的description或title中提取profile
        final description = _currentInteraction!.description ??
            _currentInteraction!.title ??
            '';
        // 检查是否包含人物名称（老刘、老付、老王）
        if (description.contains('老刘')) {
          profile = '老刘';
        } else if (description.contains('老付')) {
          profile = '老付';
        } else if (description.contains('老王')) {
          profile = '老王';
        }
        // 也可以从用户之前的消息中提取
        // 查找最近一条用户消息，看是否包含人物名称
        for (var msg in _messages.reversed) {
          if (msg.isUser && msg.text.contains('老刘')) {
            profile = '老刘';
            break;
          } else if (msg.isUser && msg.text.contains('老付')) {
            profile = '老付';
            break;
          } else if (msg.isUser && msg.text.contains('老王')) {
            profile = '老王';
            break;
          }
        }
      }

      // 调用上传接口
      final uploadResponse = await _agentUploadApi.uploadFace(
        profile: profile,
        fileName:
            '${profile}_${DateTime.now().millisecondsSinceEpoch}.${_selectedImageExtension ?? "png"}',
        contentBase64: _selectedImageBase64!,
        width: _selectedImageWidth ?? 0,
        height: _selectedImageHeight ?? 0,
      );

      if (uploadResponse != null && uploadResponse.success) {
        // 上传成功，保存信息
        setState(() {
          _uploadedImageId = uploadResponse.imageId;
          _uploadedImageBase64 = _selectedImageBase64;
          _uploadProfile = uploadResponse.profile;
          _interactionState = InteractionState.imageUploaded;
          // 清空选择状态
          _selectedImageBase64 = null;
          _selectedImageExtension = null;
          _selectedImageWidth = null;
          _selectedImageHeight = null;
        });

        // 上传成功后，继续调用对话接口刷新
        await _refreshChatAfterUpload();
      } else {
        EasyLoading.showError(uploadResponse?.error ?? '图片上传失败');
      }
    } catch (e) {
      EasyLoading.showError('上传失败: ${e.toString()}');
    } finally {
      EasyLoading.dismiss();
      setState(() {
        _isUploading = false;
      });
    }
  }

  /// 上传成功后刷新对话
  /// 如果是人脸上传，直接调用 confirm-node 接口（带 sub 参数）；否则调用 chat 接口
  Future<void> _refreshChatAfterUpload() async {
    if (_sessionId == null) return;

    try {
      EasyLoading.show(status: '处理中...');

      // 如果是人脸上传，直接调用 confirm-node 接口
      if (_faceUploadNodeName != null &&
          _uploadProfile != null &&
          _uploadedImageId != null) {
        final effectiveNodeName = _faceUploadNodeName!;
        final sub = _buildConfirmNodeSub(effectiveNodeName);

        final confirmResponse = await _agentConfirmNodeApi.confirmNode(
          sessionId: _sessionId!,
          nodeName: effectiveNodeName,
          sub: sub,
        );

        EasyLoading.dismiss();

        if (confirmResponse != null) {
          _sessionId = confirmResponse.sessionId;
          _clearFaceUploadStateIfNeeded(sub);
          _handleConfigResponse(confirmResponse.response);
        } else {
          EasyLoading.showError('确认节点失败');
        }
      } else {
        // 非人脸上传，调用对话接口，传入相同的sessionId，发送继续消息
        final chatResponse = await _agentChatApi.sendMessage(
          message: '继续', // 发送继续消息
          sessionId: _sessionId,
        );

        EasyLoading.dismiss();

        if (chatResponse != null) {
          // 更新sessionId
          _sessionId = chatResponse.sessionId;

          // 处理响应
          _handleChatResponse(chatResponse);

          // 如果返回成功消息，显示成功卡片
          // 成功信息会从API响应中获取，不需要手动添加
        }
      }
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError('刷新失败: ${e.toString()}');
    }
  }

  /// 构建蓝图摘要组件（确认构建中显示蒙板「创作中」）
  Widget _buildBlueprintSummary(double buttonMaxWidth) {
    if (_currentBlueprint == null) return const SizedBox.shrink();

    final card = BlueprintSummaryWidget(
      intentSummary: _currentBlueprint!.intentSummary,
      missingFields: _currentBlueprint!.missingFields,
      triggers: _currentBlueprint!.triggers,
      logic: _currentBlueprint!.logic,
      executors: _currentBlueprint!.executors,
      onContinue: _continueChat, // 继续交流
      onConfirm: _confirmBlueprint, // 确认构建
      isBuilt: _isBlueprintBuilt,
      maxButtonWidth: buttonMaxWidth,
    );

    if (!_isConfirmingBlueprint) return card;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        card,
        Positioned.fill(
          child: _buildCardLoadingMask(
            '创作中',
            borderRadius: _spatial.radiusMd,
          ),
        ),
      ],
    );
  }

  /// 构建卡片上的加载蒙板（半透明 + 中间文案）
  Widget _buildCardLoadingMask(String text, {double borderRadius = 6}) {
    final spatial = _spatial;
    return Container(
      decoration: BoxDecoration(
        color:
            spatial.surface(SpatialSurfaceTone.overlay).withValues(alpha: 0.86),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                valueColor: AlwaysStoppedAnimation<Color>(
                  _toneColor(SpatialStatusTone.info),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              text,
              style: spatial.sectionTextStyle().copyWith(fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }

  /// 继续交流
  void _continueChat() async {
    if (_sessionId == null) return;

    try {
      EasyLoading.show(status: '发送中...');
      setState(() {
        _isSending = true;
      });

      final chatResponse = await _agentChatApi.sendMessage(
        message: '继续',
        sessionId: _sessionId,
      );

      EasyLoading.dismiss();

      if (chatResponse != null) {
        _sessionId = chatResponse.sessionId;
        _handleChatResponse(chatResponse);
      } else {
        EasyLoading.showError('发送失败，请重试');
      }
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError('发送失败: ${e.toString()}');
    } finally {
      setState(() {
        _isSending = false;
      });
    }
  }

  /// 确认构建蓝图
  void _confirmBlueprint() async {
    if (_sessionId == null) return;

    try {
      setState(() {
        _isConfirmingBlueprint = true;
        _isSending = true;
      });

      final confirmResponse = await _agentConfirmApi.confirm(
        sessionId: _sessionId!,
      );

      if (confirmResponse != null) {
        _sessionId = confirmResponse.sessionId;
        _handleChatResponse(confirmResponse);

        // 检查响应中是否有工作流数据，如果有则显示工作流详情组件
        final responseData = confirmResponse.response;
        if (responseData.workflow != null) {
          setState(() {
            // 设置工作流数据，用于显示工作流详情
            _currentWorkflow = responseData.workflow;

            // 从workflow的meta中提取工作流详情（人物名称、动作手势、语音内容等）
            final workflowMeta = responseData.workflow!.meta;
            if (workflowMeta != null) {
              _workflowData = Map<String, dynamic>.from(workflowMeta);
              // 确保包含基本字段
              if (responseData.workflow!.name != null) {
                _workflowData!['name'] = responseData.workflow!.name;
              }
              if (responseData.metadata?.nodeCount != null) {
                _workflowData!['nodeCount'] =
                    responseData.metadata!.nodeCount.toString();
              }
            } else {
              // 如果没有meta，使用默认结构
              _workflowData = {
                'name': responseData.workflow!.name ?? '',
                'nodeCount':
                    responseData.metadata?.nodeCount?.toString() ?? '0',
              };
            }

            // 设置状态为workflowReady以显示工作流详情组件
            _interactionState = InteractionState.workflowReady;
            _addCardMessageIfNeeded(MessageType.workflowCard);
            // 触发workflow_ready，点亮节点3
            if (_currentStep < 3) {
              _currentStep = 3;
            }
            // 标记蓝图已构建，更新蓝图卡片文案
            _isBlueprintBuilt = true;
            // 新工作流就绪，重置构建 / 部署状态
            _isWorkflowCreated = false;
            _isWorkflowDeployed = false;
          });
        }
      } else {
        EasyLoading.showError('确认失败，请重试');
      }
    } catch (e) {
      EasyLoading.showError('确认失败: ${e.toString()}');
    } finally {
      setState(() {
        _isConfirmingBlueprint = false;
        _isSending = false;
      });
    }
  }

  /// 将 Workflow 转为可序列化的 Map
  Map<String, dynamic> _workflowToMap(Workflow w) {
    return {
      'name': w.name,
      'nodes': w.nodes,
      'connections': w.connections,
      'settings': w.settings,
      'meta': w.meta,
    };
  }

  /// 确认构建工作流
  void _confirmWorkflow() async {
    if (_currentWorkflow == null || _isCreatingWorkflow || _isWorkflowCreated) {
      return;
    }

    try {
      setState(() {
        _isCreatingWorkflow = true;
      });

      // 构建工作流阶段：在 Code console 展示当前 workflow JSON（等待 n8n 链接前）
      final jsonStr = _currentWorkflow != null
          ? const JsonEncoder.withIndent(
              '  ',
            ).convert(_workflowToMap(_currentWorkflow!))
          : null;
      widget.onCodeConsoleUpdate?.call(true, jsonStr);

      // 检查sessionId是否存在
      if (_sessionId == null || _sessionId!.isEmpty) {
        EasyLoading.showError('会话ID不存在，无法创建工作流');
        setState(() {
          _isCreatingWorkflow = false;
        });
        return;
      }

      // 调用创建workflow接口，传递sessionId
      final createResponse = await _workflowApi.createWorkflow(
        sessionId: _sessionId!,
      );

      if (createResponse != null) {
        // 创建成功，更新webview URL
        if (widget.onWorkflowUrlUpdated != null) {
          widget.onWorkflowUrlUpdated!(createResponse.workflowUrl);
        }
        // n8n 流程图显示后收起 Code console，停止其内容滚动
        widget.onCodeConsoleUpdate?.call(false, null);

        // 往 _messages 加 MessageType.success，该条对应卡片为「工作流创建成功」+「开始配置」按钮
        setState(() {
          _currentWorkflowId = createResponse.workflowId;
          _interactionState = InteractionState.deployment;
          _currentStep = 4;
          _isConfiguring = false;
          _isWorkflowCreated = true;
          _messages.add(
            InteractionMessage(
              text: '工作流创建成功: ${createResponse.workflowName}',
              isUser: false,
              type: MessageType.success,
              data: {
                'workflowId': createResponse.workflowId,
                'workflowName': createResponse.workflowName,
                'workflowUrl': createResponse.workflowUrl,
                'showStartConfig': true,
              },
            ),
          );
        });

        EasyLoading.showSuccess('工作流已创建并加载');
      } else {
        EasyLoading.showError('创建工作流失败');
        widget.onCodeConsoleUpdate?.call(false, null);
      }
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError('创建工作流失败: ${e.toString()}');
      widget.onCodeConsoleUpdate?.call(false, null);
    } finally {
      setState(() {
        _isCreatingWorkflow = false;
        // 确保重置配置状态，避免按钮一直显示"配置中..."
        _isConfiguring = false;
      });
    }
  }

  /// 开始配置流程
  Future<void> _startConfig() async {
    if (_sessionId == null || _sessionId!.isEmpty) {
      EasyLoading.showError('会话ID不存在，无法开始配置');
      return;
    }

    try {
      setState(() {
        _isConfiguring = true;
      });

      EasyLoading.show(status: '开始配置...');

      // 调用 start-config 接口
      final response = await _agentStartConfigApi.startConfig(
        sessionId: _sessionId!,
        workflowId: _currentWorkflowId,
      );

      EasyLoading.dismiss();

      if (response != null) {
        _sessionId = response.sessionId;
        _handleConfigResponse(response.response);
        widget.onEnterConfigStage?.call();
        widget.onCodeConsoleUpdate?.call(false, null); // 进入配置阶段，收起 Code console
      } else {
        EasyLoading.showError('开始配置失败');
        setState(() {
          _isConfiguring = false;
        });
      }
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError('开始配置失败: ${e.toString()}');
      setState(() {
        _isConfiguring = false;
      });
    }
  }

  /// 处理配置响应（兼容旧接口，统一使用 ResponseData）
  void _handleConfigResponse(ResponseData responseData) {
    _handleResponse(responseData);
  }

  /// 显示交互式配置界面
  void _showInteractiveConfig(ConfigNode node) {
    setState(() {
      _messages.add(
        InteractionMessage(
          text: '请完成交互操作: ${node.title ?? node.displayName ?? node.name}',
          isUser: false,
          type: MessageType.instruction,
          data: {'needsInteraction': true, 'nodeName': node.name},
        ),
      );
    });
  }

  /// 上传人脸后再次 confirm-node 时使用的 nodeName：优先用上传前那次接口返回的 currentNode.name
  String _getConfirmNodeNameForFace(String nodeName) {
    if (_faceUploadNodeName != null &&
        _uploadProfile != null &&
        _uploadedImageId != null) {
      return _faceUploadNodeName!;
    }
    return nodeName;
  }

  /// 上传人脸样本后再次确认 FACE-NET 节点时，仅回填 face_info；图片已通过 MQTT 发送到设备
  Map<String, dynamic>? _buildConfirmNodeSub(String nodeName) {
    if (_uploadProfile == null || _uploadedImageId == null) return null;
    final isFaceNode = nodeName.toLowerCase().contains('face_net') ||
        (_faceUploadNodeName != null && nodeName == _faceUploadNodeName);
    if (!isFaceNode) return null;
    return {'face_info': _uploadProfile!};
  }

  /// 人脸节点确认成功后清理上传相关状态，避免下次误用
  void _clearFaceUploadStateIfNeeded(Map<String, dynamic>? sub) {
    if (sub != null && sub.isNotEmpty) {
      _faceUploadNodeName = null;
      _uploadProfile = null;
      _uploadedImageId = null;
      _uploadedImageBase64 = null;
    }
  }

  /// 确认节点（带用户交互结果）
  Future<void> _confirmNodeWithInteraction(
    String nodeName,
    String executeEmoji,
  ) async {
    if (_sessionId == null) return;

    try {
      EasyLoading.show(status: '确认节点配置...');
      final effectiveNodeName = _getConfirmNodeNameForFace(nodeName);
      final sub = _buildConfirmNodeSub(effectiveNodeName);
      final response = await _agentConfirmNodeApi.confirmNode(
        sessionId: _sessionId!,
        nodeName: effectiveNodeName,
        executeEmoji: executeEmoji,
        sub: sub,
      );

      EasyLoading.dismiss();

      if (response != null) {
        _sessionId = response.sessionId;
        _clearFaceUploadStateIfNeeded(sub);
        _handleConfigResponse(response.response);
      } else {
        EasyLoading.showError('确认节点失败');
      }
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError('确认节点失败: ${e.toString()}');
    }
  }

  /// 继续配置流程
  Future<void> _continueConfig(ResponseData response) async {
    if (_sessionId == null || response.currentNode == null) return;

    try {
      // 自动确认当前节点（无交互）；人脸场景下 nodeName 用上传前那次接口返回的
      final effectiveNodeName = _getConfirmNodeNameForFace(
        response.currentNode!.name,
      );
      final sub = _buildConfirmNodeSub(effectiveNodeName);
      final confirmResponse = await _agentConfirmNodeApi.confirmNode(
        sessionId: _sessionId!,
        nodeName: effectiveNodeName,
        sub: sub,
      );

      if (confirmResponse != null) {
        _sessionId = confirmResponse.sessionId;
        _clearFaceUploadStateIfNeeded(sub);
        _handleConfigResponse(confirmResponse.response);
      }
    } catch (e) {
      EasyLoading.showError('继续配置失败: ${e.toString()}');
      setState(() {
        _isConfiguring = false;
      });
    }
  }

  /// 处理配置输入（config_input 类型的用户输入）
  Future<void> _handleConfigInput(String userInput) async {
    if (_sessionId == null || _currentConfigNode == null) {
      setState(() {
        _isSending = false;
      });
      EasyLoading.showError('配置节点信息不存在');
      return;
    }

    try {
      EasyLoading.show(status: '提交配置中...');

      // 根据 currentNode.category 来决定将输入放入哪个字段
      String? executeEmoji;
      String? ttsInput;

      if (_currentConfigNode!.category == 'TTS') {
        // TTS 类别：放入 TTS_input 字段
        ttsInput = userInput;
      } else if (_currentConfigNode!.category == 'SCREEN') {
        // SCREEN 类别：放入 execute_emoji 字段
        executeEmoji = userInput;
      }

      // 调用 confirmNode 接口（人脸节点时 nodeName 用上传前那次返回的，并带 sub）
      final effectiveNodeName = _getConfirmNodeNameForFace(
        _currentConfigNode!.name,
      );
      final sub = _buildConfirmNodeSub(effectiveNodeName);
      final confirmResponse = await _agentConfirmNodeApi.confirmNode(
        sessionId: _sessionId!,
        nodeName: effectiveNodeName,
        executeEmoji: executeEmoji,
        ttsInput: ttsInput,
        sub: sub,
      );

      EasyLoading.dismiss();

      if (confirmResponse != null) {
        _sessionId = confirmResponse.sessionId;
        _clearFaceUploadStateIfNeeded(sub);
        _handleResponse(confirmResponse.response);
      } else {
        EasyLoading.showError('提交配置失败');
      }
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError('提交配置失败: ${e.toString()}');
    } finally {
      setState(() {
        _isSending = false;
      });
    }
  }

  /// 处理热插拔确认（点击"已拼装完毕"按钮后）
  Future<void> _handleHotPluggingConfirm(ResponseData responseData) async {
    if (_sessionId == null) return;

    try {
      EasyLoading.show(status: '确认中...');

      // 如果有 currentNode，调用 confirmNode 接口
      if (responseData.currentNode != null) {
        final effectiveNodeName = _getConfirmNodeNameForFace(
          responseData.currentNode!.name,
        );
        final sub = _buildConfirmNodeSub(effectiveNodeName);
        final confirmResponse = await _agentConfirmNodeApi.confirmNode(
          sessionId: _sessionId!,
          nodeName: effectiveNodeName,
          sub: sub,
        );

        EasyLoading.dismiss();

        if (confirmResponse != null) {
          _sessionId = confirmResponse.sessionId;
          _clearFaceUploadStateIfNeeded(sub);
          _handleResponse(confirmResponse.response);
        } else {
          EasyLoading.showError('确认失败');
        }
      } else {
        // 如果没有 currentNode，调用 chat 接口发送确认消息
        final chatResponse = await _agentChatApi.sendMessage(
          message: '已拼装完毕',
          sessionId: _sessionId,
        );

        EasyLoading.dismiss();

        if (chatResponse != null) {
          _sessionId = chatResponse.sessionId;
          _handleResponse(chatResponse.response);
        } else {
          EasyLoading.showError('确认失败');
        }
      }
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError('确认失败: ${e.toString()}');
    }
  }

  String? _extractN8nAuthToken(String? rawValue) {
    if (rawValue == null) return null;

    final trimmed = rawValue.trim();
    if (trimmed.isEmpty) return null;
    if (!trimmed.startsWith('n8n-auth=')) return trimmed;

    final firstSegment = trimmed.split(';').first.trim();
    if (firstSegment.length <= 'n8n-auth='.length) return null;
    return firstSegment.substring('n8n-auth='.length).trim();
  }

  String? _resolveWorkflowAuthToken() {
    final tokenFromCookie =
        _extractN8nAuthToken(HXCache.instance.getN8nCookie());
    if (tokenFromCookie != null) return tokenFromCookie;

    final setCookies = HXCache.instance.getN8nSetCookies();
    if (setCookies != null) {
      for (final rawCookie in setCookies) {
        final token = _extractN8nAuthToken(rawCookie);
        if (token != null) return token;
      }
    }

    final appToken = HXCache.instance.getToken();
    if (appToken != null && appToken.trim().isNotEmpty) {
      return appToken.trim();
    }

    return null;
  }

  /// 请求 n8n 后端获取工作流 JSON 并通过 MQTT 发送（配置完成与一键部署共用）
  Future<bool> _fetchWorkflowAndSendMqtt(String workflowId) async {
    final authToken = _resolveWorkflowAuthToken();
    if (authToken == null) {
      throw StateError('缺少工作流鉴权信息，请重新登录后重试');
    }

    try {
      final dio = Dio(
        BaseOptions(
          baseUrl: HttpConfig.apiV1BaseUrl,
          connectTimeout: const Duration(seconds: 30).inMilliseconds,
          receiveTimeout: const Duration(seconds: 30).inMilliseconds,
          headers: {'Authorization': 'Bearer $authToken'},
        ),
      );
      final response = await dio.get(
        '/workflows/$workflowId?excludePinnedData=true',
      );
      if (response.statusCode != 200 || response.data == null) {
        throw StateError('获取工作流数据失败');
      }
      if (response.data is! Map) {
        throw StateError('工作流数据格式错误');
      }

      final workflowJson = Map<String, dynamic>.from(response.data as Map);
      final sent = await _sendWorkflowViaMqtt(workflowJson);
      if (!sent) {
        throw StateError('工作流已获取，但发送到硬件失败');
      }
      return true;
    } on DioError catch (e) {
      final statusCode = e.response?.statusCode;
      if (statusCode == 401 || statusCode == 403) {
        throw StateError('工作流鉴权失败，请重新登录后重试');
      }
      final responseData = e.response?.data;
      if (responseData is Map && responseData['msg'] != null) {
        throw StateError('获取工作流数据失败: ${responseData['msg']}');
      }
      throw StateError('获取工作流数据失败: ${e.message}');
    }
  }

  /// 通过 MQTT 发送 workflow JSON
  Future<bool> _sendWorkflowViaMqtt(Map<String, dynamic> workflowJson) async {
    try {
      if (_mqttService == null) {
        _mqttService = MqttDeviceService();
      }

      if (!_mqttService!.isConnected) {
        print('[配置流程] ⚠️ MQTT 未连接，尝试连接...');
        final connected = await _mqttService!.connectAndSubscribe();
        if (!connected) {
          print('[配置流程] ❌ MQTT 连接失败，无法发送 workflow JSON');
          return false;
        }
      }

      const String targetId = '0';
      final Map<String, dynamic> usbOutPayload = {
        'session_id': _sessionId ?? '',
        'target_id': targetId,
        'timestamp': DateTime.now().millisecondsSinceEpoch.toString(),
        'final': workflowJson,
      };
      const topic = 'usb/out/json';
      final ok = await _mqttService!.publishJson(topic, usbOutPayload);
      if (!ok) {
        print('[配置流程] ❌ Workflow JSON 发送失败');
        return false;
      }

      print(
        '[配置流程] ✅ 已发送到主题: $topic (session_id=${usbOutPayload['session_id']}, target_id=$targetId)',
      );
      print('[配置流程]   Workflow ID: ${workflowJson['id']}');
      print('[配置流程]   Workflow Name: ${workflowJson['name']}');
      return true;
    } catch (e) {
      print('[配置流程] ❌ 发送 workflow JSON 失败: $e');
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final spatial = _spatial;
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: spatial.panelDecoration(
        tone: SpatialSurfaceTone.elevated,
        accent: _toneColor(SpatialStatusTone.neural),
        radius: spatial.radiusMd,
      ),
      child: Column(
        children: [
          // 标题栏
          _buildHeader(),
          Container(height: 1, color: spatial.borderSubtle),
          if (_panelMode == _AssistantPanelMode.teaching) _buildProgressBar(),
          // 交互内容区域
          Expanded(child: _buildContentArea()),
          // 底部输入区域
          _buildInputArea(),
        ],
      ),
    );
  }

  // 标题栏（参考图1：AI Interaction Window / Terminal Hub，高度与工作空间左中栏一致）
  static const double _defaultHeaderHeight = 52.0;

  Widget _buildHeader() {
    final spatial = _spatial;
    final height = widget.headerHeight ?? _defaultHeaderHeight;
    final isDialogue = _panelMode == _AssistantPanelMode.dialogue;
    return SizedBox(
      height: height,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                RichText(
                  text: TextSpan(
                    text: isDialogue ? 'AI ' : 'AI Interaction ',
                    style: spatial.sectionTextStyle().copyWith(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                        ),
                    children: <InlineSpan>[
                      TextSpan(
                        text: isDialogue ? 'ASSISTANT' : 'Window',
                        style: spatial.sectionTextStyle().copyWith(
                              color: _toneColor(SpatialStatusTone.info),
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildHeaderIcon(
                  widget.isAiPanelFullscreen
                      ? Icons.fullscreen_exit
                      : Icons.fullscreen,
                  onTap: widget.onFullscreenTap,
                  tooltip: widget.isAiPanelFullscreen ? '退出全屏' : '全屏',
                  useN8nStyle: true,
                ),
                const SizedBox(width: 8),
                _buildHeaderIcon(
                  Icons.add_comment_outlined,
                  onTap: widget.onNewChat ?? _clearChat,
                  tooltip: '结束当前会话',
                  useN8nStyle: true,
                ),
                const SizedBox(width: 8),
                _buildHeaderIcon(
                  Icons.history,
                  onTap: widget.onViewHistoryTap,
                  tooltip: '查看历史',
                  useN8nStyle: true,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderIcon(
    IconData icon, {
    VoidCallback? onTap,
    bool isPrimary = false,
    bool useN8nStyle = false,
    String? tooltip,
  }) {
    final spatial = _spatial;
    final size = useN8nStyle ? 32.0 : 36.0;
    final borderRadius = useN8nStyle ? spatial.radiusSm : spatial.radiusMd;
    final iconSize = useN8nStyle ? 18.0 : 20.0;
    final accent = _toneColor(
      isPrimary ? SpatialStatusTone.neural : SpatialStatusTone.info,
    );
    final bgColor = useN8nStyle || !isPrimary
        ? spatial.surface(SpatialSurfaceTone.dataBlock)
        : accent.withValues(alpha: 0.1);
    final borderColor = useN8nStyle
        ? accent.withValues(alpha: 0.28)
        : (isPrimary ? accent.withValues(alpha: 0.3) : spatial.borderSubtle);
    final iconColor = useN8nStyle
        ? accent
        : (isPrimary
            ? accent
            : spatial.palette.textPrimary.withValues(alpha: 0.82));

    final child = GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(borderRadius),
          border: Border.all(color: borderColor, width: 1),
        ),
        child: Center(
          child: Icon(icon, color: iconColor, size: iconSize),
        ),
      ),
    );
    if (tooltip != null && tooltip.isNotEmpty) {
      return Tooltip(message: tooltip, child: child);
    }
    return child;
  }

  /// 清空聊天并恢复到初始状态
  void _clearChat() {
    widget.onCodeConsoleUpdate?.call(false, null);
    widget.onDigitalTwinSceneUpdated?.call(null);
    setState(() {
      _sessionId = null;
      _messages.clear();
      _currentStep = 0;
      _interactionState = InteractionState.idle;
      _uploadedImageId = null;
      _uploadedImageBase64 = null;
      _uploadProfile = null;
      _selectedImageBase64 = null;
      _selectedImageExtension = null;
      _selectedImageWidth = null;
      _selectedImageHeight = null;
      _workflowData = null;
      _currentBlueprint = null;
      _isBlueprintBuilt = false;
      _isWorkflowCreated = false;
      _isWorkflowDeployed = false;
      _isDeployingWorkflow = false;
      _isHotPlugConfirmed = false;
      _currentWorkflow = null;
      _currentInteraction = null;
      _commandController.clear();
      _dialoguePanelState = DialogueModePanelState.initial();
      _dialogueEnvelope = null;
      _dialogueLastUserPrompt = null;
      _dialogueTriggeredCueKeys.clear();
    });
  }

  // 进度条（参考图1：step-node + step-line 发光）
  Widget _buildProgressBar() {
    final spatial = _spatial;
    final accent = _toneColor(SpatialStatusTone.info);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: List.generate(4, (index) {
          final step = index + 1;
          final isActive = step <= _currentStep;
          final lineActive = step < _currentStep;
          return Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 1,
                    decoration: BoxDecoration(
                      color: lineActive
                          ? accent.withValues(alpha: 0.72)
                          : spatial.borderSubtle,
                    ),
                  ),
                ),
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: spatial.surface(SpatialSurfaceTone.dataBlock),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isActive ? accent : spatial.borderSubtle,
                      width: 2,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      '$step',
                      style: spatial.monoTextStyle(
                        color: isActive ? accent : spatial.textMuted,
                        size: 10,
                      ),
                    ),
                  ),
                ),
                if (index < 3)
                  Expanded(
                    child: Container(
                      height: 1,
                      decoration: BoxDecoration(
                        color: lineActive
                            ? accent.withValues(alpha: 0.72)
                            : spatial.borderSubtle,
                      ),
                    ),
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }

  /// 按时间线插入卡片消息（每种卡片只插入一次），与文本消息统一渲染
  void _addCardMessageIfNeeded(MessageType cardType) {
    if (cardType != MessageType.blueprintCard &&
        cardType != MessageType.workflowCard &&
        cardType != MessageType.deploymentCard) return;
    if (_messages.any((m) => m.type == cardType)) return;
    _messages.add(InteractionMessage(text: '', isUser: false, type: cardType));
  }

  // 内容区域（图1 整体：padding 加大、消息间距）
  // 卡片与消息同一时间线：只渲染 _messages，蓝图/工作流/部署卡片作为消息类型插入
  Widget _buildContentArea() {
    if (_panelMode == _AssistantPanelMode.dialogue) {
      return _buildDialogueContentArea();
    }

    return LayoutBuilder(
      builder: (context, outerConstraints) {
        final rawWidth = outerConstraints.maxWidth;
        // 窄屏时减小左右留白，留更多空间给内容
        final horizontalPadding =
            rawWidth < 380 ? 8.0 : (rawWidth < 500 ? 12.0 : 24.0);
        final contentWidth = (rawWidth - 2 * horizontalPadding).clamp(
          200.0,
          double.infinity,
        );
        // 三栏同时出现（n8n + 数字孪生 + 对话框）时，组件最大宽度统一为对话框宽度的 4/5
        final bool useFourFifths = widget.isThreeColumnLayout;
        final textMaxWidth =
            useFourFifths ? contentWidth * 4 / 5 : contentWidth * 2 / 3;
        // 小窗/三栏：卡片与气泡最大宽度 4/5；极窄时 95%；否则 2/3
        const double smallWindowBreakpoint = 480;
        final bool isSmallWindow = contentWidth < smallWindowBreakpoint;
        final bool isVeryNarrow = contentWidth < 360;
        final cardMaxWidth = useFourFifths
            ? contentWidth * 4 / 5
            : (isVeryNarrow
                ? contentWidth * 0.95
                : (isSmallWindow
                    ? contentWidth * 4 / 5
                    : contentWidth * 2 / 3));
        // 操作按钮行：窄屏/三栏下用更大比例并保证最小宽度
        final buttonFraction = useFourFifths
            ? 0.45
            : (isVeryNarrow ? 0.5 : (isSmallWindow ? 0.45 : 0.25));
        final buttonMaxWidth = (contentWidth * buttonFraction).clamp(
          120.0,
          cardMaxWidth,
        );
        return SingleChildScrollView(
          controller: _scrollController,
          padding: EdgeInsets.symmetric(
            horizontal: horizontalPadding,
            vertical: 20,
          ),
          child: SizedBox(
            width: contentWidth,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 统一时间线：消息与卡片按 _messages 顺序渲染（卡片已作为消息类型插入）
                ..._messages.map(
                  (message) => _buildMessage(
                    message,
                    textMaxWidth: textMaxWidth,
                    cardMaxWidth: cardMaxWidth,
                    buttonMaxWidth: buttonMaxWidth,
                  ),
                ),
                const SizedBox(height: 16),

                // 其他状态模块（上传/选择等，尚未纳入消息类型）
                if (_interactionState == InteractionState.uploading &&
                    _selectedImageBase64 == null) ...[
                  _wrapCenterCard(_buildImageUploadArea(), cardMaxWidth),
                  const SizedBox(height: 16),
                ],

                if (_selectedImageBase64 != null &&
                    (_interactionState == InteractionState.imageSelected ||
                        _interactionState == InteractionState.uploading)) ...[
                  _wrapCenterCard(
                    _buildImagePreviewForSelection(),
                    cardMaxWidth,
                  ),
                  const SizedBox(height: 16),
                ],

                if (_uploadedImageId != null &&
                    _interactionState == InteractionState.imageUploaded) ...[
                  _wrapCenterCard(_buildImagePreview(), cardMaxWidth),
                  const SizedBox(height: 16),
                ],

                if (_interactionState == InteractionState.selectInteraction &&
                    _currentInteraction != null) ...[
                  _wrapCenterCard(_buildSelectInteraction(), cardMaxWidth),
                  const SizedBox(height: 16),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDialogueContentArea() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final rawWidth = constraints.maxWidth;
        final horizontalPadding =
            rawWidth < 380 ? 8.0 : (rawWidth < 500 ? 12.0 : 20.0);
        final contentWidth = (rawWidth - 2 * horizontalPadding).clamp(
          220.0,
          double.infinity,
        );
        return SingleChildScrollView(
          controller: _scrollController,
          padding: EdgeInsets.fromLTRB(
            horizontalPadding,
            20,
            horizontalPadding,
            24,
          ),
          child: SizedBox(
            width: contentWidth,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: _buildDialogueBridgeControl(),
                  ),
                ),
                if (_dialoguePanelState.isBridgeConnecting)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _buildDialogueStatusBanner('正在连接本地硬件桥...'),
                  ),
                if (_dialogueLastUserPrompt != null &&
                    _dialogueLastUserPrompt!.trim().isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        ConstrainedBox(
                          constraints: BoxConstraints(
                            maxWidth: contentWidth * 0.78,
                          ),
                          child:
                              UserInputBubble(text: _dialogueLastUserPrompt!),
                        ),
                      ],
                    ),
                  ),
                DialogueModeCard(
                  model: _dialoguePanelState.viewModel,
                  onSkillTap: _handleDialogueSkillTap,
                  onActionTap: _handleDialogueActionTap,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDialogueStatusBanner(String text) {
    final spatial = _spatial;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: spatial.panelDecoration(
        tone: SpatialSurfaceTone.panel,
        accent: _toneColor(SpatialStatusTone.neural),
        radius: spatial.radiusMd,
      ),
      child: Row(
        children: [
          SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(
                _toneColor(SpatialStatusTone.neural),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style:
                  spatial.bodyTextStyle().copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  /// 其他类型（非纯文本）：居中显示，最大宽度为 cardMaxWidth
  Widget _wrapCenterCard(Widget child, double cardMaxWidth) {
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: cardMaxWidth),
        child: child,
      ),
    );
  }

  // 消息气泡
  // 纯文本类（userInput/instruction）：最大宽度 textMaxWidth，左收右发；其他类型：居中，最大宽度 cardMaxWidth；交互按钮最大宽度 buttonMaxWidth
  Widget _buildMessage(
    InteractionMessage message, {
    required double textMaxWidth,
    required double cardMaxWidth,
    required double buttonMaxWidth,
  }) {
    switch (message.type) {
      case MessageType.userInput:
        return Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            ConstrainedBox(
              constraints: BoxConstraints(maxWidth: textMaxWidth),
              child: UserInputBubble(text: message.text),
            ),
          ],
        );
      case MessageType.instruction:
        // 如果是 hot_plugging 类型且需要显示确认按钮
        if (message.data?['hotPlugging'] == true &&
            message.data?['showConfirmButton'] == true) {
          final responseData = message.data?['responseData'] as ResponseData?;
          return Row(
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              ConstrainedBox(
                constraints: BoxConstraints(maxWidth: textMaxWidth),
                child: TextWithConfirmButton(
                  text: message.text,
                  onConfirm: (_isHotPlugConfirmed || responseData == null)
                      ? null
                      : () => _handleHotPluggingConfirm(responseData),
                  isConfirmed: _isHotPlugConfirmed,
                  maxButtonWidth: buttonMaxWidth,
                ),
              ),
            ],
          );
        }
        return Row(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            ConstrainedBox(
              constraints: BoxConstraints(maxWidth: textMaxWidth),
              child: InstructionText(text: message.text),
            ),
          ],
        );
      case MessageType.success:
        return _wrapCenterCard(
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (message.text.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    message.text,
                    style: _spatial.bodyTextStyle(),
                  ),
                ),
              if (message.data?['showStartConfig'] == true)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minWidth: (measureButtonTitleWidth(
                                  _isConfiguring
                                      ? '配置中...'
                                      : (widget.isN8nLoaded ? '开始配置' : '创作中'),
                                  fontSize: 14,
                                ) +
                                5)
                            .clamp(0.0, buttonMaxWidth),
                        maxWidth: buttonMaxWidth,
                      ),
                      child: ElevatedButton.icon(
                        onPressed: (_isConfiguring || !widget.isN8nLoaded)
                            ? null
                            : _startConfig,
                        style: _spatial.primaryButtonStyle(
                          accent: _toneColor(SpatialStatusTone.info),
                        ),
                        icon: widget.isN8nLoaded
                            ? const Icon(Icons.settings, size: 18)
                            : SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    _spatial.palette.textInverse
                                        .withValues(alpha: 0.72),
                                  ),
                                ),
                              ),
                        label: Text(
                          _isConfiguring
                              ? '配置中...'
                              : (widget.isN8nLoaded ? '开始配置' : '创作中'),
                        ),
                      ),
                    ),
                  ),
                ),
              if (message.data?['showConfigConfirm'] == true)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minWidth: (2 *
                                    (measureButtonTitleWidth(
                                          '确认',
                                          fontSize: 14,
                                        ) +
                                        5) +
                                16)
                            .clamp(0.0, buttonMaxWidth),
                        maxWidth: buttonMaxWidth,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Expanded(
                            child: TextButton(
                              onPressed: () {
                                final configData = message.data?['configData']
                                    as ResponseData?;
                                if (configData != null) {
                                  _continueConfig(configData);
                                }
                              },
                              style: _spatial.secondaryButtonStyle(),
                              child: const Text('取消'),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () {
                                final configData = message.data?['configData']
                                    as ResponseData?;
                                if (configData != null &&
                                    configData.currentNode != null) {
                                  _confirmNodeWithInteraction(
                                    configData.currentNode!.name,
                                    '',
                                  );
                                }
                              },
                              style: _spatial.primaryButtonStyle(
                                accent: _toneColor(SpatialStatusTone.info),
                              ),
                              child: const Text('确认'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
          cardMaxWidth,
        );
      case MessageType.voiceMapping:
        return message.voiceData != null
            ? _wrapCenterCard(
                VoiceMappingCard(voiceData: message.voiceData!),
                cardMaxWidth,
              )
            : const SizedBox.shrink();
      case MessageType.system:
        return _wrapCenterCard(
          SystemMessageWidget(text: message.text),
          cardMaxWidth,
        );
      case MessageType.blueprintCard:
        return _currentBlueprint != null
            ? _wrapCenterCard(
                _buildBlueprintSummary(buttonMaxWidth),
                cardMaxWidth,
              )
            : const SizedBox.shrink();
      case MessageType.workflowCard:
        return _currentWorkflow != null
            ? _wrapCenterCard(
                _buildWorkflowDetails(buttonMaxWidth),
                cardMaxWidth,
              )
            : const SizedBox.shrink();
      case MessageType.deploymentCard:
        return _wrapCenterCard(
          _buildDeploymentSection(buttonMaxWidth),
          cardMaxWidth,
        );
    }
  }

  // 图片上传区域
  Widget _buildImageUploadArea() {
    return ImageUploadArea(onTap: _handleImagePick);
  }

  // 图片预览（选择后，等待确认上传）- 点击「确认并开始特征提取」走 _confirmImageUpload 上传图片
  Widget _buildImagePreviewForSelection() {
    return ImagePreview(
      imageUrl: null,
      imageBase64: _selectedImageBase64,
      onConfirm: _confirmImageUpload, // 上传图片逻辑
      onReselect: _handleImagePick,
    );
  }

  // 图片预览（上传成功后）
  Widget _buildImagePreview() {
    return ImagePreview(
      imageUrl: null,
      imageBase64: _uploadedImageBase64,
      profile: _uploadProfile,
      onConfirm: () async {
        // 确认后继续刷新对话
        await _refreshChatAfterUpload();
      },
    );
  }

  // 单选/多选交互
  Widget _buildSelectInteraction() {
    if (_currentInteraction == null) return const SizedBox.shrink();

    return SelectInteractionWidget(
      interaction: _currentInteraction!,
      onSubmit: _submitSelection,
    );
  }

  // 工作流详情（「工作流创建成功」+「开始配置」由 MessageType.success 对应卡片展示）
  Widget _buildWorkflowDetails(double buttonMaxWidth) {
    return WorkflowDetailsWidget(
      details: _workflowData != null
          ? Map<String, String>.from(
              _workflowData!.map(
                (key, value) => MapEntry(key.toString(), value.toString()),
              ),
            )
          : {'人物名称': '老刘', '动作手势': '中指', '语音内容': '你是猪-音色: 暴躁大妈'},
      onContinue: () {
        setState(() {
          _interactionState = InteractionState.idle;
        });
      },
      onConfirm: _confirmWorkflow,
      isCreated: _isWorkflowCreated,
      isCreating: _isCreatingWorkflow,
      maxButtonWidth: buttonMaxWidth,
    );
  }

  // 部署区域
  Widget _buildDeploymentSection(double buttonMaxWidth) {
    // 显示部署选择时，点亮节点4（创建工作流后提示一键部署）
    if (_currentStep < 4) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          setState(() {
            _currentStep = 4;
          });
        }
      });
    }

    return DeploymentSectionWidget(
      question: '',
      cancelText: '暂不部署',
      confirmText: '一键部署到硬件',
      isDeployed: _isWorkflowDeployed,
      isDeploying: _isDeployingWorkflow,
      maxButtonWidth: buttonMaxWidth,
      onCancel: () {
        if (_isWorkflowDeployed) return;
        // 暂不部署，结束本次部署交互，但不打乱对话顺序
        setState(() {
          _interactionState = InteractionState.idle;
          _messages.add(
            InteractionMessage(
              text: '已取消部署',
              isUser: false,
              type: MessageType.system,
            ),
          );
        });
      },
      onConfirm: _deployWorkflow, // 一键部署
    );
  }

  /// 部署工作流：请求 n8n 后端获取工作流 JSON 并通过 MQTT 发送（与 configComplete 相同逻辑）
  void _deployWorkflow() async {
    if (_currentWorkflowId == null ||
        _currentWorkflowId!.isEmpty ||
        _isDeployingWorkflow ||
        _isWorkflowDeployed) {
      return;
    }

    try {
      setState(() {
        _isDeployingWorkflow = true;
      });

      EasyLoading.show(status: '部署中...');
      await _fetchWorkflowAndSendMqtt(_currentWorkflowId!);
      EasyLoading.dismiss();

      setState(() {
        _isWorkflowDeployed = true;
        _isDeployingWorkflow = false;
        _currentStep = 4;
      });
      EasyLoading.showSuccess('已部署');
    } catch (e) {
      EasyLoading.dismiss();
      final errorMessage =
          (e is StateError ? e.message : e.toString()).toString();
      EasyLoading.showError(errorMessage);
      setState(() {
        _isDeployingWorkflow = false;
      });
    }
  }

  // 底部输入区域（参考图1：硬边输入框 + SEND）
  // 窄屏时减小左右 padding，避免输入框被挤压变形
  Widget _buildInputArea() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        final horizontalPadding = w < 380 ? 8.0 : (w < 500 ? 12.0 : 16.0);
        final verticalPadding = w < 380 ? 10.0 : 16.0;
        return Container(
          padding: EdgeInsets.fromLTRB(
            horizontalPadding,
            verticalPadding,
            horizontalPadding,
            verticalPadding,
          ),
          decoration: BoxDecoration(
            color: _spatial.surface(SpatialSurfaceTone.overlay),
            border: Border(
              top: BorderSide(color: _spatial.borderSubtle, width: 1),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildModeToggleBar(),
              const SizedBox(height: 14),
              // 快捷输入：横向可滚动，数量多时可左右拖动（Web 上需启用鼠标拖拽）
              LayoutBuilder(
                builder: (context, constraints) {
                  return SizedBox(
                    height: 40,
                    width: constraints.maxWidth,
                    child: ScrollConfiguration(
                      behavior: ScrollConfiguration.of(context).copyWith(
                        dragDevices: {
                          PointerDeviceKind.touch,
                          PointerDeviceKind.mouse,
                        },
                      ),
                      child: SingleChildScrollView(
                        controller: _suggestionScrollController,
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(
                          parent: AlwaysScrollableScrollPhysics(),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            for (int i = 0;
                                i < _activeSuggestionTexts.length;
                                i++) ...[
                              if (i > 0) const SizedBox(width: 10),
                              _buildSuggestionButton(_activeSuggestionTexts[i]),
                            ],
                            const SizedBox(width: 16),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 12),
              //       ),
              //     ),
              //   ],
              // ),
              // const SizedBox(height: 16),
              // 输入区域容器（两行高度 + SEND）
              LayoutBuilder(
                builder: (context, innerConstraints) {
                  final innerW = innerConstraints.maxWidth;
                  final fieldPadding = innerW < 380
                      ? const EdgeInsets.only(
                          left: 12,
                          top: 10,
                          right: 12,
                          bottom: 4,
                        )
                      : const EdgeInsets.only(
                          left: 16,
                          top: 12,
                          right: 16,
                          bottom: 4,
                        );
                  final barPadding = innerW < 380
                      ? const EdgeInsets.symmetric(horizontal: 12, vertical: 8)
                      : const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        );
                  return Container(
                    decoration: BoxDecoration(
                      color: _spatial.surface(SpatialSurfaceTone.dataBlock),
                      borderRadius: BorderRadius.circular(_spatial.radiusMd),
                      border: Border.all(
                        color: _spatial.borderSubtle,
                        width: 1,
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // 输入框区域（固定两行高度）
                        Padding(
                          padding: fieldPadding,
                          child: TextField(
                            controller: _commandController,
                            style: _spatial.bodyTextStyle(),
                            decoration: InputDecoration(
                              hintText:
                                  _panelMode == _AssistantPanelMode.dialogue
                                      ? '输入指令...'
                                      : '输入内容...',
                              hintStyle: _spatial.bodyTextStyle().copyWith(
                                    color: _spatial.textMuted
                                        .withValues(alpha: 0.6),
                                  ),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.zero,
                            ),
                            minLines: 2,
                            maxLines: 2,
                            textAlignVertical: TextAlignVertical.top,
                          ),
                        ),
                        // 底部控制栏（结束会话 + SEND）
                        Padding(
                          padding: barPadding,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              // 结束会话按钮和SEND按钮（右侧）
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  // 结束会话按钮（仅在开始对话后显示）
                                  if (_hasActiveSession) ...[
                                    Flexible(
                                      child: GestureDetector(
                                        onTap: _resetSession,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 8,
                                          ),
                                          decoration: BoxDecoration(
                                            color: _spatial.surface(
                                              SpatialSurfaceTone.dataBlock,
                                            ),
                                            borderRadius: BorderRadius.circular(
                                              _spatial.radiusMd,
                                            ),
                                            border: Border.all(
                                              color: _spatial.borderSubtle,
                                              width: 1,
                                            ),
                                          ),
                                          child: Text(
                                            '结束会话',
                                            style: _spatial.monoTextStyle(
                                              color:
                                                  _spatial.palette.textPrimary,
                                              size: 11,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                  ],
                                  // SEND按钮
                                  GestureDetector(
                                    onTap: (_isHealthOk &&
                                            !_isCheckingHealth &&
                                            !_isBusySending)
                                        ? _sendCommand
                                        : null,
                                    child: Opacity(
                                      opacity: (_isHealthOk &&
                                              !_isCheckingHealth &&
                                              !_isBusySending)
                                          ? 1.0
                                          : 0.5,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 24,
                                          vertical: 8,
                                        ),
                                        decoration: BoxDecoration(
                                          color: (_isHealthOk &&
                                                  !_isCheckingHealth &&
                                                  !_isBusySending)
                                              ? _toneColor(
                                                  SpatialStatusTone.info)
                                              : _toneColor(
                                                  SpatialStatusTone.info,
                                                ).withValues(alpha: 0.4),
                                          borderRadius: BorderRadius.circular(
                                            _spatial.radiusMd,
                                          ),
                                        ),
                                        child: _buildSendButtonChild(),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  // 建议按钮（参考图1：inspiration-pill 灵感标签）
  List<String> get _activeSuggestionTexts =>
      _panelMode == _AssistantPanelMode.dialogue
          ? _dialogueSuggestionTexts
          : _teachingSuggestionTexts;

  bool get _hasActiveSession {
    if (_panelMode == _AssistantPanelMode.dialogue) {
      final sessionId = _dialoguePanelState.sessionId;
      return sessionId != null && sessionId.isNotEmpty;
    }
    return _sessionId != null && _sessionId!.isNotEmpty;
  }

  bool get _isBusySending {
    return _panelMode == _AssistantPanelMode.dialogue
        ? _dialoguePanelState.isSending
        : _isSending;
  }

  Widget _buildModeToggleBar() {
    final spatial = _spatial;
    return Container(
      height: 46,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: spatial.surface(SpatialSurfaceTone.dataBlock),
        borderRadius: BorderRadius.circular(spatial.radiusMd),
        border: Border.all(
          color: _toneColor(SpatialStatusTone.neural).withValues(alpha: 0.24),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildModeToggleButton(
              label: '教学模式',
              selected: _panelMode == _AssistantPanelMode.teaching,
              onTap: () => _switchPanelMode(_AssistantPanelMode.teaching),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildModeToggleButton(
              label: '对话模式',
              selected: _panelMode == _AssistantPanelMode.dialogue,
              onTap: () => _switchPanelMode(_AssistantPanelMode.dialogue),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModeToggleButton({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    final spatial = _spatial;
    final accent = _toneColor(SpatialStatusTone.neural);
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: spatial.motionFast,
        curve: Curves.easeOut,
        decoration: BoxDecoration(
          color: selected ? accent.withValues(alpha: 0.16) : null,
          borderRadius: BorderRadius.circular(spatial.radiusSm),
          border: Border.all(
            color: selected
                ? accent.withValues(alpha: 0.28)
                : _spatial.borderSubtle,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: spatial.monoTextStyle(
              color: selected ? accent : spatial.textMuted,
              size: 11,
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _switchPanelMode(_AssistantPanelMode mode) async {
    if (_panelMode == mode) {
      return;
    }
    setState(() {
      _panelMode = mode;
    });
    if (mode == _AssistantPanelMode.dialogue) {
      await _ensureDialogueBridgeConnected();
    }
  }

  Widget _buildDialogueBridgeIndicator() {
    final spatial = _spatial;
    final isConnected = _hardwareBridgeService.activeSource != null &&
        _hardwareBridgeService.state.isConnected;
    final label = isConnected
        ? _hardwareBridgeService.activeSource?.source.name ?? 'bridge'
        : 'bridge';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: spatial.surface(SpatialSurfaceTone.dataBlock),
        borderRadius: BorderRadius.circular(spatial.radiusSm),
        border: Border.all(
          color: isConnected
              ? _toneColor(SpatialStatusTone.success).withValues(alpha: 0.28)
              : spatial.borderSubtle,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: isConnected
                  ? _toneColor(SpatialStatusTone.success)
                  : spatial.textMuted.withValues(alpha: 0.55),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: spatial.monoTextStyle(
              color: spatial.palette.textPrimary.withValues(alpha: 0.82),
              size: 10,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDialogueBridgeControl() {
    final spatial = _spatial;
    final isConnected = _hardwareBridgeService.activeSource != null &&
        _hardwareBridgeService.state.isConnected;
    final helperText = _dialoguePanelState.isBridgeConnecting
        ? '连接中...'
        : (isConnected ? '硬件已接入' : '点击连接硬件桥');

    return InkWell(
      borderRadius: BorderRadius.circular(spatial.radiusMd),
      onTap: _dialoguePanelState.isBridgeConnecting
          ? null
          : () {
              unawaited(_ensureDialogueBridgeConnected());
            },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: spatial.surface(SpatialSurfaceTone.dataBlock),
          borderRadius: BorderRadius.circular(spatial.radiusMd),
          border: Border.all(
            color: isConnected
                ? _toneColor(SpatialStatusTone.success).withValues(alpha: 0.28)
                : spatial.borderSubtle,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildDialogueBridgeIndicator(),
            const SizedBox(width: 10),
            Text(
              helperText,
              style: spatial.captionTextStyle().copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSendButtonChild() {
    if (_isCheckingHealth || _isBusySending) {
      return SizedBox(
        width: 16,
        height: 16,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor:
              AlwaysStoppedAnimation<Color>(_spatial.palette.textInverse),
        ),
      );
    }

    if (_panelMode == _AssistantPanelMode.dialogue) {
      return Icon(
        Icons.arrow_forward_rounded,
        color: _spatial.palette.textInverse,
        size: 18,
      );
    }

    return Text(
      'SEND',
      style: _spatial.monoTextStyle(
        color: _spatial.palette.textInverse,
        size: 10,
        letterSpacing: 1.4,
      ),
    );
  }

  Widget _buildSuggestionButton(String text) {
    final spatial = _spatial;
    final accent = _toneColor(SpatialStatusTone.info);
    return GestureDetector(
      onTap: () {
        _commandController.text = text;
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: spatial.surface(SpatialSurfaceTone.dataBlock),
          borderRadius: BorderRadius.circular(spatial.radiusSm),
          border: Border.all(color: accent.withValues(alpha: 0.16), width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 4,
              height: 4,
              decoration: BoxDecoration(
                color: accent,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              text,
              style: spatial.monoTextStyle(
                color: spatial.textMuted,
                size: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 重置会话（结束对话）
  void _resetSession() async {
    final sessionId = _panelMode == _AssistantPanelMode.dialogue
        ? _dialoguePanelState.sessionId
        : _sessionId;
    if (sessionId == null || sessionId.isEmpty) return;

    try {
      EasyLoading.show(status: '结束会话中...');

      final resetResponse = await _agentResetSessionApi.resetSession(
        sessionId: sessionId,
      );

      EasyLoading.dismiss();

      if (resetResponse != null && resetResponse.success) {
        // 显示系统提示对话框
        _showSessionEndDialog();

        // 清空会话状态
        setState(() {
          _sessionId = null;
          _messages.clear();
          _currentStep = 1;
          _interactionState = InteractionState.idle;
          _uploadedImageId = null;
          _uploadedImageBase64 = null;
          _uploadProfile = null;
          _selectedImageBase64 = null;
          _selectedImageExtension = null;
          _selectedImageWidth = null;
          _selectedImageHeight = null;
          _workflowData = null;
          _currentBlueprint = null;
          _currentWorkflow = null;
          _currentInteraction = null;
          _commandController.clear();
          _dialoguePanelState = DialogueModePanelState.initial();
          _dialogueEnvelope = null;
          _dialogueLastUserPrompt = null;
          _dialogueTriggeredCueKeys.clear();
        });
      } else {
        EasyLoading.showError('结束会话失败，请重试');
      }
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError('结束会话失败: ${e.toString()}');
    }
  }

  /// 显示会话结束对话框
  void _showSessionEndDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        final spatial = context.spatial;
        return AlertDialog(
          backgroundColor: spatial.surface(SpatialSurfaceTone.panel),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(spatial.radiusMd),
            side: BorderSide(
              color: spatial
                  .status(SpatialStatusTone.info)
                  .withValues(alpha: 0.24),
              width: 1,
            ),
          ),
          title: Text(
            '会话已结束',
            style: spatial.sectionTextStyle().copyWith(fontSize: 18),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              style: spatial.secondaryButtonStyle(
                accent: spatial.status(SpatialStatusTone.info),
              ),
              child: Text(
                '确定',
                style: spatial.monoTextStyle(
                  color: spatial.status(SpatialStatusTone.info),
                  size: 11,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
