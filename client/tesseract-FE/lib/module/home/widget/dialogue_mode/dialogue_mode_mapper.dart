/*
 * [INPUT]: 依赖 backend dialogueMode envelope DTO 与本地 dialogue_mode_models.dart 视图模型。
 * [OUTPUT]: 对外提供把 backend envelope 折叠成对话模式 UI 视图模型的纯函数。
 * [POS]: module/home/widget/dialogue_mode 的协议适配层，隔离 API DTO 与 Flutter 视图结构。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:aitesseract/server/api/dialogue_mode_models.dart' as api;

import 'dialogue_mode_models.dart';

const List<DialogueSkillWakeup> _defaultWakeups = <DialogueSkillWakeup>[
  DialogueSkillWakeup(
    skillId: 'skill_rps',
    title: '石头剪刀布',
    ready: false,
    tags: <String>['等待唤醒'],
  ),
  DialogueSkillWakeup(
    skillId: 'skill_auto_avoid',
    title: '自动避障',
    ready: false,
    tags: <String>['预留'],
  ),
  DialogueSkillWakeup(
    skillId: 'skill_custom',
    title: '添加技能',
    ready: false,
    tags: <String>['管理库'],
  ),
];

DialogueModeViewModel mapDialogueEnvelopeToViewModel(
  api.DialogueModeEnvelope envelope, {
  required String fallbackMessage,
  bool forceValidationLoader = false,
}) {
  final skill = envelope.skill;
  final missingHardware = envelope.hardware.missingRequirements
      .map((item) => item.displayName)
      .where((item) => item.trim().isNotEmpty)
      .toList(growable: false);
  final requiredHardware = skill?.requiredHardware
          .map((item) => item.displayName)
          .where((item) => item.trim().isNotEmpty)
          .toList(growable: false) ??
      const <String>[];

  return DialogueModeViewModel(
    branch: _mapBranch(envelope.branch),
    phase: _mapPhase(envelope.phase),
    message: fallbackMessage.trim().isEmpty ? '我在这里，随时可以开始。' : fallbackMessage,
    gameplayGuide: skill?.gameplayGuide,
    availableSkills: _buildWakeups(envelope),
    requiredHardware: requiredHardware,
    missingHardware: missingHardware,
    actions: envelope.uiActions.map(_mapAction).toList(growable: false),
    teachingGoal: envelope.teachingHandoff?.prefilledGoal,
    showValidationLoader:
        forceValidationLoader || envelope.phase == api.DialogueModePhase.validatingInsert,
  );
}

List<DialogueSkillWakeup> _buildWakeups(api.DialogueModeEnvelope envelope) {
  final skill = envelope.skill;
  if (skill == null) {
    return _defaultWakeups;
  }

  final ready = envelope.phase == api.DialogueModePhase.interacting ||
      envelope.phase == api.DialogueModePhase.readyToDeploy;
  final tags = <String>[
    ready ? '已就绪' : '等待硬件',
    ...skill.requiredHardware.map((item) => item.displayName),
  ];

  final wakeups = <DialogueSkillWakeup>[
    DialogueSkillWakeup(
      skillId: skill.skillId,
      title: skill.displayName,
      ready: ready,
      tags: tags,
    ),
  ];

  for (final fallback in _defaultWakeups) {
    if (wakeups.any((item) => item.skillId == fallback.skillId)) {
      continue;
    }
    wakeups.add(fallback);
  }
  return wakeups;
}

DialogueModeAction _mapAction(api.DialogueModeUiAction action) {
  return DialogueModeAction(
    id: action.id,
    label: action.label,
    kind: _mapActionKind(action.kind),
    enabled: action.enabled,
    payload: action.payload,
  );
}

DialogueBranch _mapBranch(api.DialogueModeBranch branch) {
  switch (branch) {
    case api.DialogueModeBranch.instantPlay:
      return DialogueBranch.instantPlay;
    case api.DialogueModeBranch.hardwareGuidance:
      return DialogueBranch.hardwareGuidance;
    case api.DialogueModeBranch.teachingHandoff:
      return DialogueBranch.teachingHandoff;
    case api.DialogueModeBranch.validationFailed:
      return DialogueBranch.validationFailed;
  }
}

DialoguePhase _mapPhase(api.DialogueModePhase phase) {
  switch (phase) {
    case api.DialogueModePhase.idle:
      return DialoguePhase.idle;
    case api.DialogueModePhase.matchingSkill:
      return DialoguePhase.matchingSkill;
    case api.DialogueModePhase.checkingHardware:
      return DialoguePhase.checkingHardware;
    case api.DialogueModePhase.waitingForInsert:
      return DialoguePhase.waitingForInsert;
    case api.DialogueModePhase.validatingInsert:
      return DialoguePhase.validatingInsert;
    case api.DialogueModePhase.readyToDeploy:
      return DialoguePhase.readyToDeploy;
    case api.DialogueModePhase.deploying:
      return DialoguePhase.deploying;
    case api.DialogueModePhase.interacting:
      return DialoguePhase.interacting;
    case api.DialogueModePhase.handoffReady:
      return DialoguePhase.handoffReady;
    case api.DialogueModePhase.failed:
      return DialoguePhase.failed;
  }
}

DialogueActionKind _mapActionKind(api.DialogueModeUiActionKind kind) {
  switch (kind) {
    case api.DialogueModeUiActionKind.primary:
      return DialogueActionKind.primary;
    case api.DialogueModeUiActionKind.secondary:
      return DialogueActionKind.secondary;
    case api.DialogueModeUiActionKind.ghost:
      return DialogueActionKind.ghost;
  }
}
