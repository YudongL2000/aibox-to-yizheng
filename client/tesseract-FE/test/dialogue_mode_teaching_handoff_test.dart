import 'package:aitesseract/module/home/widget/dialogue_mode/dialogue_mode_mapper.dart';
import 'package:aitesseract/module/home/widget/dialogue_mode/dialogue_mode_models.dart';
import 'package:aitesseract/server/api/dialogue_mode_models.dart' as api;
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('teaching handoff keeps prefilled goal and CTA', () {
    final model = mapDialogueEnvelopeToViewModel(
      const api.DialogueModeEnvelope(
        branch: api.DialogueModeBranch.teachingHandoff,
        phase: api.DialogueModePhase.handoffReady,
        skill: null,
        hardware: api.DialogueModeHardwareSnapshot(
          source: api.DialogueModeHardwareSource.backendCache,
          connectedComponents: <api.DialogueModeHardwareComponent>[],
          missingRequirements: <api.DialogueModeHardwareRequirement>[],
          validationStatus: api.DialogueModeHardwareValidationStatus.idle,
          lastEventType: 'snapshot',
          lastEventAt: '2026-04-01T10:32:00.000Z',
        ),
        uiActions: <api.DialogueModeUiAction>[
          api.DialogueModeUiAction(
            id: 'open_teaching_mode',
            label: '开启教学模式',
            kind: api.DialogueModeUiActionKind.primary,
            enabled: true,
          ),
        ],
        physicalCue: null,
        teachingHandoff: api.DialogueModeTeachingHandoff(
          sourceSessionId: 'sess_dialogue',
          originalPrompt: '帮我给花浇水',
          prefilledGoal: '学习给花浇水',
          entryMode: 'dialogue_handoff',
          createdAt: '2026-04-01T10:32:00.000Z',
        ),
        deploymentPrompt: null,
      ),
      fallbackMessage: '这个我还没学过，要教教我吗？',
    );

    expect(model.branch, DialogueBranch.teachingHandoff);
    expect(model.phase, DialoguePhase.handoffReady);
    expect(model.actions.single.id, 'open_teaching_mode');
    expect(model.teachingGoal, '学习给花浇水');
  });
}
