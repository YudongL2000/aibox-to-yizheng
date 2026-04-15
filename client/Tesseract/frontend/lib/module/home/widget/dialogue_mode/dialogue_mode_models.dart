/*
 * [INPUT]: 无，承接对话模式所需的纯数据形状。
 * [OUTPUT]: 对外提供对话模式分支、阶段、技能唤醒卡、动作按钮与面板视图模型。
 * [POS]: module/home/widget/dialogue_mode 的模型层，被状态层与卡片视图共同消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

enum DialogueBranch {
  instantPlay,
  hardwareGuidance,
  teachingHandoff,
  validationFailed,
  unknown,
}

enum DialoguePhase {
  idle,
  matchingSkill,
  checkingHardware,
  waitingForInsert,
  validatingInsert,
  readyToDeploy,
  deploying,
  interacting,
  handoffReady,
  failed,
}

enum DialogueActionKind { primary, secondary, ghost }

class DialogueModeAction {
  final String id;
  final String label;
  final DialogueActionKind kind;
  final bool enabled;
  final Map<String, dynamic>? payload;

  const DialogueModeAction({
    required this.id,
    required this.label,
    this.kind = DialogueActionKind.primary,
    this.enabled = true,
    this.payload,
  });

  DialogueModeAction copyWith({
    String? id,
    String? label,
    DialogueActionKind? kind,
    bool? enabled,
    Map<String, dynamic>? payload,
  }) {
    return DialogueModeAction(
      id: id ?? this.id,
      label: label ?? this.label,
      kind: kind ?? this.kind,
      enabled: enabled ?? this.enabled,
      payload: payload ?? this.payload,
    );
  }
}

class DialogueSkillWakeup {
  final String skillId;
  final String title;
  final bool ready;
  final List<String> tags;

  const DialogueSkillWakeup({
    required this.skillId,
    required this.title,
    required this.ready,
    this.tags = const <String>[],
  });

  DialogueSkillWakeup copyWith({
    String? skillId,
    String? title,
    bool? ready,
    List<String>? tags,
  }) {
    return DialogueSkillWakeup(
      skillId: skillId ?? this.skillId,
      title: title ?? this.title,
      ready: ready ?? this.ready,
      tags: tags ?? this.tags,
    );
  }
}

class DialogueModeViewModel {
  final DialogueBranch branch;
  final DialoguePhase phase;
  final String message;
  final String? gameplayGuide;
  final List<DialogueSkillWakeup> availableSkills;
  final List<String> requiredHardware;
  final List<String> missingHardware;
  final List<DialogueModeAction> actions;
  final String? teachingGoal;
  final bool showValidationLoader;

  const DialogueModeViewModel({
    required this.branch,
    required this.phase,
    required this.message,
    this.gameplayGuide,
    this.availableSkills = const <DialogueSkillWakeup>[],
    this.requiredHardware = const <String>[],
    this.missingHardware = const <String>[],
    this.actions = const <DialogueModeAction>[],
    this.teachingGoal,
    this.showValidationLoader = false,
  });

  factory DialogueModeViewModel.empty() {
    return const DialogueModeViewModel(
      branch: DialogueBranch.unknown,
      phase: DialoguePhase.idle,
      message: '你好！我是 OpenClaw。今天想玩点什么？你可以先试试对我说“玩石头剪刀布”。',
      availableSkills: <DialogueSkillWakeup>[
        DialogueSkillWakeup(
          skillId: 'skill_rps',
          title: '石头剪刀布',
          ready: false,
          tags: <String>['等待硬件状态'],
        ),
        DialogueSkillWakeup(
          skillId: 'skill_empathy',
          title: '自动避障',
          ready: false,
          tags: <String>['预留'],
        ),
      ],
    );
  }

  DialogueModeViewModel copyWith({
    DialogueBranch? branch,
    DialoguePhase? phase,
    String? message,
    String? gameplayGuide,
    List<DialogueSkillWakeup>? availableSkills,
    List<String>? requiredHardware,
    List<String>? missingHardware,
    List<DialogueModeAction>? actions,
    String? teachingGoal,
    bool? showValidationLoader,
  }) {
    return DialogueModeViewModel(
      branch: branch ?? this.branch,
      phase: phase ?? this.phase,
      message: message ?? this.message,
      gameplayGuide: gameplayGuide ?? this.gameplayGuide,
      availableSkills: availableSkills ?? this.availableSkills,
      requiredHardware: requiredHardware ?? this.requiredHardware,
      missingHardware: missingHardware ?? this.missingHardware,
      actions: actions ?? this.actions,
      teachingGoal: teachingGoal ?? this.teachingGoal,
      showValidationLoader: showValidationLoader ?? this.showValidationLoader,
    );
  }
}
