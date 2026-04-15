/*
 * [INPUT]: 依赖 dialogue_mode_models.dart 的视图模型与动作描述。
 * [OUTPUT]: 对外提供 DialogueModePanelState，不可变地维护对话模式面板状态。
 * [POS]: module/home/widget/dialogue_mode 的轻量状态折叠层，被 AiInteractionWindow 用来避免布尔值蔓延。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dialogue_mode_models.dart';

class DialogueModePanelState {
  final String? sessionId;
  final DialogueModeViewModel viewModel;
  final bool isSending;
  final bool isBridgeConnecting;
  final bool isValidationPending;

  const DialogueModePanelState({
    this.sessionId,
    required this.viewModel,
    this.isSending = false,
    this.isBridgeConnecting = false,
    this.isValidationPending = false,
  });

  factory DialogueModePanelState.initial() {
    return DialogueModePanelState(viewModel: DialogueModeViewModel.empty());
  }

  DialogueModePanelState copyWith({
    Object? sessionId = _sentinel,
    DialogueModeViewModel? viewModel,
    bool? isSending,
    bool? isBridgeConnecting,
    bool? isValidationPending,
  }) {
    return DialogueModePanelState(
      sessionId: identical(sessionId, _sentinel) ? this.sessionId : sessionId as String?,
      viewModel: viewModel ?? this.viewModel,
      isSending: isSending ?? this.isSending,
      isBridgeConnecting: isBridgeConnecting ?? this.isBridgeConnecting,
      isValidationPending: isValidationPending ?? this.isValidationPending,
    );
  }

  DialogueModePanelState withViewModel(
    DialogueModeViewModel next, {
    String? sessionId,
  }) {
    return copyWith(
      sessionId: sessionId ?? this.sessionId,
      viewModel: next,
      isValidationPending: next.showValidationLoader,
    );
  }
}

const Object _sentinel = Object();
