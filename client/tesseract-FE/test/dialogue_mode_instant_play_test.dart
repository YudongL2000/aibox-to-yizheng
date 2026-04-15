import 'package:aitesseract/module/home/widget/dialogue_mode/dialogue_mode_mapper.dart';
import 'package:aitesseract/module/home/widget/dialogue_mode/dialogue_mode_models.dart';
import 'package:aitesseract/server/api/dialogue_mode_models.dart' as api;
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('instant play envelope maps to ready skill without CTA', () {
    final model = mapDialogueEnvelopeToViewModel(
      const api.DialogueModeEnvelope(
        branch: api.DialogueModeBranch.instantPlay,
        phase: api.DialogueModePhase.interacting,
        skill: api.DialogueModeMatchedSkill(
          skillId: 'skill_rps',
          displayName: '石头剪刀布',
          matchStatus: api.DialogueModeSkillMatchStatus.matched,
          confidence: 0.97,
          gameplayGuide: '你先出拳，我会立刻识别并回应。',
          requiredHardware: <api.DialogueModeHardwareRequirement>[
            api.DialogueModeHardwareRequirement(
              componentId: 'camera',
              displayName: '摄像头',
              requiredCapability: 'vision',
              acceptablePorts: <String>['port_7'],
              requiredModelIds: <String>['cam-001'],
              isOptional: false,
            ),
            api.DialogueModeHardwareRequirement(
              componentId: 'mechanical_hand',
              displayName: '机械手',
              requiredCapability: 'hand_execute',
              acceptablePorts: <String>['port_2'],
              requiredModelIds: <String>['claw-v1'],
              isOptional: false,
            ),
          ],
          initialPhysicalCue: api.DialogueModePhysicalCue(
            action: api.DialogueModePhysicalAction.handStretch,
            autoTrigger: true,
            targetComponentId: 'mechanical_hand',
          ),
        ),
        hardware: api.DialogueModeHardwareSnapshot(
          source: api.DialogueModeHardwareSource.mqttProxy,
          connectedComponents: <api.DialogueModeHardwareComponent>[
            api.DialogueModeHardwareComponent(
              componentId: 'camera',
              deviceId: 'cam-001',
              modelId: 'cam-001',
              displayName: '摄像头',
              portId: 'port_7',
              status: api.DialogueModeHardwareComponentStatus.ready,
            ),
            api.DialogueModeHardwareComponent(
              componentId: 'mechanical_hand',
              deviceId: 'hand-001',
              modelId: 'claw-v1',
              displayName: '机械手',
              portId: 'port_2',
              status: api.DialogueModeHardwareComponentStatus.ready,
            ),
          ],
          missingRequirements: <api.DialogueModeHardwareRequirement>[],
          validationStatus: api.DialogueModeHardwareValidationStatus.success,
          lastEventType: 'snapshot',
          lastEventAt: '2026-04-01T10:30:00.000Z',
        ),
        uiActions: <api.DialogueModeUiAction>[],
        physicalCue: api.DialogueModePhysicalCue(
          action: api.DialogueModePhysicalAction.handStretch,
          autoTrigger: true,
          targetComponentId: 'mechanical_hand',
        ),
        teachingHandoff: null,
        deploymentPrompt: api.DialogueModeDeploymentPrompt(
          visible: false,
          status: 'hidden',
          message: '',
        ),
      ),
      fallbackMessage: '没问题！我看到装备全齐，我已经等不及要赢你一把了。',
    );

    expect(model.branch, DialogueBranch.instantPlay);
    expect(model.phase, DialoguePhase.interacting);
    expect(model.actions, isEmpty);
    expect(model.showValidationLoader, isFalse);
    expect(model.availableSkills.first.ready, isTrue);
    expect(model.availableSkills.first.title, '石头剪刀布');
  });
}
