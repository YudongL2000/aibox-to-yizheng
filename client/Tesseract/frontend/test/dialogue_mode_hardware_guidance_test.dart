import 'package:aitesseract/module/home/widget/dialogue_mode/dialogue_mode_mapper.dart';
import 'package:aitesseract/module/home/widget/dialogue_mode/dialogue_mode_models.dart';
import 'package:aitesseract/server/api/dialogue_mode_models.dart' as api;
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('hardware guidance envelope exposes missing hardware and deploy CTA', () {
    final model = mapDialogueEnvelopeToViewModel(
      const api.DialogueModeEnvelope(
        branch: api.DialogueModeBranch.hardwareGuidance,
        phase: api.DialogueModePhase.readyToDeploy,
        skill: api.DialogueModeMatchedSkill(
          skillId: 'skill_rps',
          displayName: '石头剪刀布',
          matchStatus: api.DialogueModeSkillMatchStatus.matched,
          confidence: 0.95,
          gameplayGuide: '你先出拳，我会识别后马上回应。',
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
        ),
        hardware: api.DialogueModeHardwareSnapshot(
          source: api.DialogueModeHardwareSource.miniclawWs,
          connectedComponents: <api.DialogueModeHardwareComponent>[
            api.DialogueModeHardwareComponent(
              componentId: 'camera',
              deviceId: 'cam-001',
              modelId: 'cam-001',
              displayName: '摄像头',
              portId: 'port_7',
              status: api.DialogueModeHardwareComponentStatus.ready,
            ),
          ],
          missingRequirements: <api.DialogueModeHardwareRequirement>[
            api.DialogueModeHardwareRequirement(
              componentId: 'mechanical_hand',
              displayName: '机械手',
              requiredCapability: 'hand_execute',
              acceptablePorts: <String>['port_2'],
              requiredModelIds: <String>['claw-v1'],
              isOptional: false,
            ),
          ],
          validationStatus: api.DialogueModeHardwareValidationStatus.success,
          lastEventType: 'device_ready',
          lastEventAt: '2026-04-01T10:31:00.000Z',
        ),
        uiActions: <api.DialogueModeUiAction>[
          api.DialogueModeUiAction(
            id: 'start_deploy',
            label: '开始部署',
            kind: api.DialogueModeUiActionKind.primary,
            enabled: true,
          ),
        ],
        physicalCue: null,
        teachingHandoff: null,
        deploymentPrompt: api.DialogueModeDeploymentPrompt(
          visible: true,
          status: 'visible',
          message: '点击开始部署即可进入交互',
          wakeCue: api.DialogueModePhysicalCue(
            action: api.DialogueModePhysicalAction.wake,
            autoTrigger: false,
            targetComponentId: 'mechanical_hand',
          ),
        ),
      ),
      fallbackMessage: '感应到了！数据同步完成。我已经准备好大显身手了，我们要开始吗？',
    );

    expect(model.branch, DialogueBranch.hardwareGuidance);
    expect(model.phase, DialoguePhase.readyToDeploy);
    expect(model.missingHardware, contains('机械手'));
    expect(model.actions.single.id, 'start_deploy');
    expect(model.showValidationLoader, isFalse);
  });

  test('forced validation loader keeps UI silent while backend checks', () {
    final model = mapDialogueEnvelopeToViewModel(
      const api.DialogueModeEnvelope(
        branch: api.DialogueModeBranch.hardwareGuidance,
        phase: api.DialogueModePhase.waitingForInsert,
        skill: null,
        hardware: api.DialogueModeHardwareSnapshot(
          source: api.DialogueModeHardwareSource.miniclawWs,
          connectedComponents: <api.DialogueModeHardwareComponent>[],
          missingRequirements: <api.DialogueModeHardwareRequirement>[],
          validationStatus: api.DialogueModeHardwareValidationStatus.pending,
          lastEventType: 'device_inserted',
          lastEventAt: '2026-04-01T10:31:00.000Z',
        ),
        uiActions: <api.DialogueModeUiAction>[],
        physicalCue: null,
        teachingHandoff: null,
        deploymentPrompt: null,
      ),
      fallbackMessage: '正在校验硬件/同步数据...',
      forceValidationLoader: true,
    );

    expect(model.showValidationLoader, isTrue);
    expect(model.actions, isEmpty);
  });
}
