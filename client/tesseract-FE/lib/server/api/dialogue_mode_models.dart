/*
 * [INPUT]: 依赖 backend dialogueMode envelope 与前端本地硬件桥事件输入。
 * [OUTPUT]: 对外提供对话模式的枚举、技能命中、硬件快照、教学接力与 UI 动作模型。
 * [POS]: module/server/api 的对话模式协议 DTO 层，被 chat / validate-hardware / start-deploy 客户端共享。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

enum DialogueModeInteractionMode { dialogue, teaching }

enum DialogueModeBranch {
  instantPlay,
  hardwareGuidance,
  teachingHandoff,
  validationFailed,
}

enum DialogueModePhase {
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

enum DialogueModeSkillMatchStatus { matched, ambiguous, unmatched }

enum DialogueModeHardwareSource { miniclawWs, mqttProxy, backendCache }

enum DialogueModeHardwareValidationStatus {
  idle,
  pending,
  success,
  failure,
  timeout,
}

enum DialogueModeHardwareEventType {
  deviceInserted,
  deviceRemoved,
  deviceReady,
  deviceError,
  heartbeat,
  snapshot,
}

enum DialogueModeHardwareComponentStatus {
  connected,
  validating,
  ready,
  error,
  removed,
}

enum DialogueModeUiActionKind { primary, secondary, ghost }

enum DialogueModePhysicalAction { handStretch, wake, none }

class DialogueModeTeachingContext {
  final String? originalPrompt;
  final String? prefilledGoal;
  final String? sourceSessionId;

  const DialogueModeTeachingContext({
    this.originalPrompt,
    this.prefilledGoal,
    this.sourceSessionId,
  });

  factory DialogueModeTeachingContext.fromJson(Map<String, dynamic> json) {
    return DialogueModeTeachingContext(
      originalPrompt: json['originalPrompt']?.toString(),
      prefilledGoal: json['prefilledGoal']?.toString(),
      sourceSessionId: json['sourceSessionId']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      if (originalPrompt != null) 'originalPrompt': originalPrompt,
      if (prefilledGoal != null) 'prefilledGoal': prefilledGoal,
      if (sourceSessionId != null) 'sourceSessionId': sourceSessionId,
    };
  }
}

class DialogueModeHardwareRequirement {
  final String componentId;
  final String displayName;
  final String requiredCapability;
  final List<String> acceptablePorts;
  final List<String> requiredModelIds;
  final bool isOptional;

  const DialogueModeHardwareRequirement({
    required this.componentId,
    required this.displayName,
    required this.requiredCapability,
    required this.acceptablePorts,
    required this.requiredModelIds,
    required this.isOptional,
  });

  factory DialogueModeHardwareRequirement.fromJson(Map<String, dynamic> json) {
    return DialogueModeHardwareRequirement(
      componentId: json['componentId']?.toString() ?? '',
      displayName: json['displayName']?.toString() ?? '',
      requiredCapability: json['requiredCapability']?.toString() ?? '',
      acceptablePorts: _readStringList(json['acceptablePorts']),
      requiredModelIds: _readStringList(json['requiredModelIds']),
      isOptional: json['isOptional'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'componentId': componentId,
      'displayName': displayName,
      'requiredCapability': requiredCapability,
      'acceptablePorts': acceptablePorts,
      'requiredModelIds': requiredModelIds,
      'isOptional': isOptional,
    };
  }
}

class DialogueModeHardwareComponent {
  final String componentId;
  final String deviceId;
  final String modelId;
  final String displayName;
  final String portId;
  final DialogueModeHardwareComponentStatus status;

  const DialogueModeHardwareComponent({
    required this.componentId,
    required this.deviceId,
    required this.modelId,
    required this.displayName,
    required this.portId,
    required this.status,
  });

  factory DialogueModeHardwareComponent.fromJson(Map<String, dynamic> json) {
    return DialogueModeHardwareComponent(
      componentId: json['componentId']?.toString() ??
          json['component_id']?.toString() ??
          '',
      deviceId:
          json['deviceId']?.toString() ?? json['device_id']?.toString() ?? '',
      modelId:
          json['modelId']?.toString() ?? json['model_id']?.toString() ?? '',
      displayName: json['displayName']?.toString() ??
          json['display_name']?.toString() ??
          '',
      portId: json['portId']?.toString() ?? json['port_id']?.toString() ?? '',
      status: _readComponentStatus(json['status']),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'componentId': componentId,
      'deviceId': deviceId,
      'modelId': modelId,
      'displayName': displayName,
      'portId': portId,
      'status': _componentStatusToJson(status),
    };
  }
}

class DialogueModeHardwareSnapshot {
  final DialogueModeHardwareSource source;
  final List<DialogueModeHardwareComponent> connectedComponents;
  final List<DialogueModeHardwareRequirement> missingRequirements;
  final DialogueModeHardwareValidationStatus validationStatus;
  final String lastEventType;
  final String lastEventAt;
  final String? failureReason;

  const DialogueModeHardwareSnapshot({
    required this.source,
    required this.connectedComponents,
    required this.missingRequirements,
    required this.validationStatus,
    required this.lastEventType,
    required this.lastEventAt,
    this.failureReason,
  });

  factory DialogueModeHardwareSnapshot.fromJson(Map<String, dynamic> json) {
    return DialogueModeHardwareSnapshot(
      source: _readHardwareSource(json['source']),
      connectedComponents: _readComponentList(json['connectedComponents']),
      missingRequirements: _readRequirementList(json['missingRequirements']),
      validationStatus: _readValidationStatus(json['validationStatus']),
      lastEventType: json['lastEventType']?.toString() ?? 'snapshot',
      lastEventAt: json['lastEventAt']?.toString() ?? '',
      failureReason: json['failureReason']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'source': _hardwareSourceToJson(source),
      'connectedComponents':
          connectedComponents.map((item) => item.toJson()).toList(),
      'missingRequirements':
          missingRequirements.map((item) => item.toJson()).toList(),
      'validationStatus': _validationStatusToJson(validationStatus),
      'lastEventType': lastEventType,
      'lastEventAt': lastEventAt,
      if (failureReason != null) 'failureReason': failureReason,
    };
  }
}

class DialogueModePhysicalCue {
  final DialogueModePhysicalAction action;
  final bool autoTrigger;
  final String? targetComponentId;
  final Map<String, String>? metadata;

  const DialogueModePhysicalCue({
    required this.action,
    required this.autoTrigger,
    this.targetComponentId,
    this.metadata,
  });

  factory DialogueModePhysicalCue.fromJson(Map<String, dynamic> json) {
    final rawMetadata = json['metadata'];
    final metadata = rawMetadata is Map
        ? rawMetadata
            .map((key, value) => MapEntry(key.toString(), value.toString()))
        : null;
    return DialogueModePhysicalCue(
      action: _readPhysicalAction(json['action']),
      autoTrigger: json['autoTrigger'] == true,
      targetComponentId: json['targetComponentId']?.toString(),
      metadata: metadata,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'action': _physicalActionToJson(action),
      'autoTrigger': autoTrigger,
      if (targetComponentId != null) 'targetComponentId': targetComponentId,
      if (metadata != null && metadata!.isNotEmpty) 'metadata': metadata,
    };
  }
}

class DialogueModeMatchedSkill {
  final String skillId;
  final String displayName;
  final DialogueModeSkillMatchStatus matchStatus;
  final double confidence;
  final String gameplayGuide;
  final List<DialogueModeHardwareRequirement> requiredHardware;
  final DialogueModePhysicalCue? initialPhysicalCue;

  const DialogueModeMatchedSkill({
    required this.skillId,
    required this.displayName,
    required this.matchStatus,
    required this.confidence,
    required this.gameplayGuide,
    required this.requiredHardware,
    this.initialPhysicalCue,
  });

  factory DialogueModeMatchedSkill.fromJson(Map<String, dynamic> json) {
    return DialogueModeMatchedSkill(
      skillId: json['skillId']?.toString() ?? '',
      displayName: json['displayName']?.toString() ?? '',
      matchStatus: _readSkillMatchStatus(json['matchStatus']),
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0,
      gameplayGuide: json['gameplayGuide']?.toString() ?? '',
      requiredHardware: _readRequirementList(json['requiredHardware']),
      initialPhysicalCue: json['initialPhysicalCue'] is Map<String, dynamic>
          ? DialogueModePhysicalCue.fromJson(
              json['initialPhysicalCue'] as Map<String, dynamic>,
            )
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'skillId': skillId,
      'displayName': displayName,
      'matchStatus': _skillMatchStatusToJson(matchStatus),
      'confidence': confidence,
      'gameplayGuide': gameplayGuide,
      'requiredHardware':
          requiredHardware.map((item) => item.toJson()).toList(),
      if (initialPhysicalCue != null)
        'initialPhysicalCue': initialPhysicalCue!.toJson(),
    };
  }
}

class DialogueModeTeachingHandoff {
  final String sourceSessionId;
  final String originalPrompt;
  final String prefilledGoal;
  final String entryMode;
  final String createdAt;

  const DialogueModeTeachingHandoff({
    required this.sourceSessionId,
    required this.originalPrompt,
    required this.prefilledGoal,
    required this.entryMode,
    required this.createdAt,
  });

  factory DialogueModeTeachingHandoff.fromJson(Map<String, dynamic> json) {
    return DialogueModeTeachingHandoff(
      sourceSessionId: json['sourceSessionId']?.toString() ?? '',
      originalPrompt: json['originalPrompt']?.toString() ?? '',
      prefilledGoal: json['prefilledGoal']?.toString() ?? '',
      entryMode: json['entryMode']?.toString() ?? 'dialogue_handoff',
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'sourceSessionId': sourceSessionId,
      'originalPrompt': originalPrompt,
      'prefilledGoal': prefilledGoal,
      'entryMode': entryMode,
      'createdAt': createdAt,
    };
  }
}

class DialogueModeUiAction {
  final String id;
  final String label;
  final DialogueModeUiActionKind kind;
  final bool enabled;
  final Map<String, dynamic>? payload;

  const DialogueModeUiAction({
    required this.id,
    required this.label,
    required this.kind,
    required this.enabled,
    this.payload,
  });

  factory DialogueModeUiAction.fromJson(Map<String, dynamic> json) {
    final rawPayload = json['payload'];
    final payload = rawPayload is Map<String, dynamic>
        ? Map<String, dynamic>.from(rawPayload)
        : rawPayload is Map
            ? Map<String, dynamic>.from(rawPayload.cast<String, dynamic>())
            : null;
    return DialogueModeUiAction(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      kind: _readUiActionKind(json['kind']),
      enabled: json['enabled'] != false,
      payload: payload,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'label': label,
      'kind': _uiActionKindToJson(kind),
      'enabled': enabled,
      if (payload != null && payload!.isNotEmpty) 'payload': payload,
    };
  }
}

class DialogueModeDeploymentPrompt {
  final bool visible;
  final String status;
  final String message;
  final DialogueModePhysicalCue? wakeCue;

  const DialogueModeDeploymentPrompt({
    required this.visible,
    required this.status,
    required this.message,
    this.wakeCue,
  });

  factory DialogueModeDeploymentPrompt.fromJson(Map<String, dynamic> json) {
    return DialogueModeDeploymentPrompt(
      visible: json['visible'] == true,
      status: json['status']?.toString() ?? 'hidden',
      message: json['message']?.toString() ?? '',
      wakeCue: json['wakeCue'] is Map<String, dynamic>
          ? DialogueModePhysicalCue.fromJson(
              json['wakeCue'] as Map<String, dynamic>,
            )
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'visible': visible,
      'status': status,
      'message': message,
      if (wakeCue != null) 'wakeCue': wakeCue!.toJson(),
    };
  }
}

class DialogueModeEnvelope {
  final DialogueModeBranch branch;
  final DialogueModePhase phase;
  final DialogueModeMatchedSkill? skill;
  final DialogueModeHardwareSnapshot hardware;
  final List<DialogueModeUiAction> uiActions;
  final DialogueModePhysicalCue? physicalCue;
  final DialogueModeTeachingHandoff? teachingHandoff;
  final DialogueModeDeploymentPrompt? deploymentPrompt;

  const DialogueModeEnvelope({
    required this.branch,
    required this.phase,
    required this.skill,
    required this.hardware,
    required this.uiActions,
    required this.physicalCue,
    required this.teachingHandoff,
    required this.deploymentPrompt,
  });

  factory DialogueModeEnvelope.fromJson(Map<String, dynamic> json) {
    return DialogueModeEnvelope(
      branch: _readBranch(json['branch']),
      phase: _readPhase(json['phase']),
      skill: json['skill'] is Map<String, dynamic>
          ? DialogueModeMatchedSkill.fromJson(
              json['skill'] as Map<String, dynamic>)
          : null,
      hardware: json['hardware'] is Map<String, dynamic>
          ? DialogueModeHardwareSnapshot.fromJson(
              json['hardware'] as Map<String, dynamic>,
            )
          : DialogueModeHardwareSnapshot(
              source: DialogueModeHardwareSource.backendCache,
              connectedComponents: const <DialogueModeHardwareComponent>[],
              missingRequirements: const <DialogueModeHardwareRequirement>[],
              validationStatus: DialogueModeHardwareValidationStatus.idle,
              lastEventType: 'snapshot',
              lastEventAt: '',
            ),
      uiActions: _readUiActionList(json['uiActions']),
      physicalCue: json['physicalCue'] is Map<String, dynamic>
          ? DialogueModePhysicalCue.fromJson(
              json['physicalCue'] as Map<String, dynamic>)
          : null,
      teachingHandoff: json['teachingHandoff'] is Map<String, dynamic>
          ? DialogueModeTeachingHandoff.fromJson(
              json['teachingHandoff'] as Map<String, dynamic>,
            )
          : null,
      deploymentPrompt: json['deploymentPrompt'] is Map<String, dynamic>
          ? DialogueModeDeploymentPrompt.fromJson(
              json['deploymentPrompt'] as Map<String, dynamic>,
            )
          : null,
    );
  }

  static DialogueModeEnvelope? tryParse(dynamic raw) {
    final map = _normalizeMap(raw);
    if (map == null) return null;
    final candidate = map['dialogueMode'] ??
        map['dialogue_mode'] ??
        map['dialogue_mode_envelope'] ??
        map;
    final candidateMap = _normalizeMap(candidate);
    if (candidateMap == null) return null;
    return DialogueModeEnvelope.fromJson(candidateMap);
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'branch': _branchToJson(branch),
      'phase': _phaseToJson(phase),
      'skill': skill?.toJson(),
      'hardware': hardware.toJson(),
      'uiActions': uiActions.map((item) => item.toJson()).toList(),
      'physicalCue': physicalCue?.toJson(),
      'teachingHandoff': teachingHandoff?.toJson(),
      'deploymentPrompt': deploymentPrompt?.toJson(),
    };
  }
}

List<String> _readStringList(dynamic raw) {
  if (raw is List) {
    return raw.map((item) => item.toString()).toList();
  }
  return <String>[];
}

List<DialogueModeHardwareRequirement> _readRequirementList(dynamic raw) {
  if (raw is List) {
    return raw
        .whereType<Map<String, dynamic>>()
        .map(DialogueModeHardwareRequirement.fromJson)
        .toList();
  }
  return <DialogueModeHardwareRequirement>[];
}

List<DialogueModeHardwareComponent> _readComponentList(dynamic raw) {
  if (raw is List) {
    return raw
        .whereType<Map<String, dynamic>>()
        .map(DialogueModeHardwareComponent.fromJson)
        .toList();
  }
  return <DialogueModeHardwareComponent>[];
}

List<DialogueModeUiAction> _readUiActionList(dynamic raw) {
  if (raw is List) {
    return raw
        .whereType<Map<String, dynamic>>()
        .map(DialogueModeUiAction.fromJson)
        .toList();
  }
  return <DialogueModeUiAction>[];
}

Map<String, dynamic>? _normalizeMap(dynamic raw) {
  if (raw is Map<String, dynamic>) {
    return Map<String, dynamic>.from(raw);
  }
  if (raw is Map) {
    return Map<String, dynamic>.from(raw.cast<String, dynamic>());
  }
  return null;
}

DialogueModeBranch _readBranch(dynamic raw) {
  switch (raw?.toString()) {
    case 'instant_play':
      return DialogueModeBranch.instantPlay;
    case 'hardware_guidance':
      return DialogueModeBranch.hardwareGuidance;
    case 'teaching_handoff':
      return DialogueModeBranch.teachingHandoff;
    case 'validation_failed':
      return DialogueModeBranch.validationFailed;
    default:
      return DialogueModeBranch.hardwareGuidance;
  }
}

String _branchToJson(DialogueModeBranch branch) {
  switch (branch) {
    case DialogueModeBranch.instantPlay:
      return 'instant_play';
    case DialogueModeBranch.hardwareGuidance:
      return 'hardware_guidance';
    case DialogueModeBranch.teachingHandoff:
      return 'teaching_handoff';
    case DialogueModeBranch.validationFailed:
      return 'validation_failed';
  }
}

DialogueModePhase _readPhase(dynamic raw) {
  switch (raw?.toString()) {
    case 'idle':
      return DialogueModePhase.idle;
    case 'matching_skill':
      return DialogueModePhase.matchingSkill;
    case 'checking_hardware':
      return DialogueModePhase.checkingHardware;
    case 'waiting_for_insert':
      return DialogueModePhase.waitingForInsert;
    case 'validating_insert':
      return DialogueModePhase.validatingInsert;
    case 'ready_to_deploy':
      return DialogueModePhase.readyToDeploy;
    case 'deploying':
      return DialogueModePhase.deploying;
    case 'interacting':
      return DialogueModePhase.interacting;
    case 'handoff_ready':
      return DialogueModePhase.handoffReady;
    case 'failed':
      return DialogueModePhase.failed;
    default:
      return DialogueModePhase.idle;
  }
}

String _phaseToJson(DialogueModePhase phase) {
  switch (phase) {
    case DialogueModePhase.idle:
      return 'idle';
    case DialogueModePhase.matchingSkill:
      return 'matching_skill';
    case DialogueModePhase.checkingHardware:
      return 'checking_hardware';
    case DialogueModePhase.waitingForInsert:
      return 'waiting_for_insert';
    case DialogueModePhase.validatingInsert:
      return 'validating_insert';
    case DialogueModePhase.readyToDeploy:
      return 'ready_to_deploy';
    case DialogueModePhase.deploying:
      return 'deploying';
    case DialogueModePhase.interacting:
      return 'interacting';
    case DialogueModePhase.handoffReady:
      return 'handoff_ready';
    case DialogueModePhase.failed:
      return 'failed';
  }
}

DialogueModeSkillMatchStatus _readSkillMatchStatus(dynamic raw) {
  switch (raw?.toString()) {
    case 'matched':
      return DialogueModeSkillMatchStatus.matched;
    case 'ambiguous':
      return DialogueModeSkillMatchStatus.ambiguous;
    case 'unmatched':
      return DialogueModeSkillMatchStatus.unmatched;
    default:
      return DialogueModeSkillMatchStatus.matched;
  }
}

String _skillMatchStatusToJson(DialogueModeSkillMatchStatus status) {
  switch (status) {
    case DialogueModeSkillMatchStatus.matched:
      return 'matched';
    case DialogueModeSkillMatchStatus.ambiguous:
      return 'ambiguous';
    case DialogueModeSkillMatchStatus.unmatched:
      return 'unmatched';
  }
}

DialogueModeHardwareSource _readHardwareSource(dynamic raw) {
  switch (raw?.toString()) {
    case 'miniclaw_ws':
      return DialogueModeHardwareSource.miniclawWs;
    case 'mqtt_proxy':
      return DialogueModeHardwareSource.mqttProxy;
    case 'backend_cache':
      return DialogueModeHardwareSource.backendCache;
    default:
      return DialogueModeHardwareSource.backendCache;
  }
}

String _hardwareSourceToJson(DialogueModeHardwareSource source) {
  switch (source) {
    case DialogueModeHardwareSource.miniclawWs:
      return 'miniclaw_ws';
    case DialogueModeHardwareSource.mqttProxy:
      return 'mqtt_proxy';
    case DialogueModeHardwareSource.backendCache:
      return 'backend_cache';
  }
}

DialogueModeHardwareValidationStatus _readValidationStatus(dynamic raw) {
  switch (raw?.toString()) {
    case 'idle':
      return DialogueModeHardwareValidationStatus.idle;
    case 'pending':
      return DialogueModeHardwareValidationStatus.pending;
    case 'success':
      return DialogueModeHardwareValidationStatus.success;
    case 'failure':
      return DialogueModeHardwareValidationStatus.failure;
    case 'timeout':
      return DialogueModeHardwareValidationStatus.timeout;
    default:
      return DialogueModeHardwareValidationStatus.idle;
  }
}

String _validationStatusToJson(DialogueModeHardwareValidationStatus status) {
  switch (status) {
    case DialogueModeHardwareValidationStatus.idle:
      return 'idle';
    case DialogueModeHardwareValidationStatus.pending:
      return 'pending';
    case DialogueModeHardwareValidationStatus.success:
      return 'success';
    case DialogueModeHardwareValidationStatus.failure:
      return 'failure';
    case DialogueModeHardwareValidationStatus.timeout:
      return 'timeout';
  }
}

DialogueModeHardwareComponentStatus _readComponentStatus(dynamic raw) {
  switch (raw?.toString()) {
    case 'connected':
      return DialogueModeHardwareComponentStatus.connected;
    case 'validating':
      return DialogueModeHardwareComponentStatus.validating;
    case 'ready':
      return DialogueModeHardwareComponentStatus.ready;
    case 'error':
      return DialogueModeHardwareComponentStatus.error;
    case 'removed':
      return DialogueModeHardwareComponentStatus.removed;
    default:
      return DialogueModeHardwareComponentStatus.connected;
  }
}

String _componentStatusToJson(DialogueModeHardwareComponentStatus status) {
  switch (status) {
    case DialogueModeHardwareComponentStatus.connected:
      return 'connected';
    case DialogueModeHardwareComponentStatus.validating:
      return 'validating';
    case DialogueModeHardwareComponentStatus.ready:
      return 'ready';
    case DialogueModeHardwareComponentStatus.error:
      return 'error';
    case DialogueModeHardwareComponentStatus.removed:
      return 'removed';
  }
}

DialogueModeUiActionKind _readUiActionKind(dynamic raw) {
  switch (raw?.toString()) {
    case 'primary':
      return DialogueModeUiActionKind.primary;
    case 'secondary':
      return DialogueModeUiActionKind.secondary;
    case 'ghost':
      return DialogueModeUiActionKind.ghost;
    default:
      return DialogueModeUiActionKind.primary;
  }
}

String _uiActionKindToJson(DialogueModeUiActionKind kind) {
  switch (kind) {
    case DialogueModeUiActionKind.primary:
      return 'primary';
    case DialogueModeUiActionKind.secondary:
      return 'secondary';
    case DialogueModeUiActionKind.ghost:
      return 'ghost';
  }
}

DialogueModePhysicalAction _readPhysicalAction(dynamic raw) {
  switch (raw?.toString()) {
    case 'hand_stretch':
      return DialogueModePhysicalAction.handStretch;
    case 'wake':
      return DialogueModePhysicalAction.wake;
    case 'none':
      return DialogueModePhysicalAction.none;
    default:
      return DialogueModePhysicalAction.none;
  }
}

String _physicalActionToJson(DialogueModePhysicalAction action) {
  switch (action) {
    case DialogueModePhysicalAction.handStretch:
      return 'hand_stretch';
    case DialogueModePhysicalAction.wake:
      return 'wake';
    case DialogueModePhysicalAction.none:
      return 'none';
  }
}
