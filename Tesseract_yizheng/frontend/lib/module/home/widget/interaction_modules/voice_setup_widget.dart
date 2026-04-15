import 'package:flutter/material.dart';
import 'package:aitesseract/module/home/widget/interaction_modules/voice_option.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import 'interaction_utils.dart';

/// 语音设置组件
class VoiceSetupWidget extends StatelessWidget {
  final List<String> voiceOptions;
  final String? selectedVoice;
  final Function(String) onVoiceSelected;
  final VoidCallback? onConfirm;

  const VoiceSetupWidget({
    super.key,
    required this.voiceOptions,
    this.selectedVoice,
    required this.onVoiceSelected,
    this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    final accent = interactionToneColor(context, InteractionTone.info);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        padding: EdgeInsets.all(spatial.space5),
        decoration: interactionPanelDecoration(
          context,
          tone: InteractionTone.info,
          surfaceTone: SpatialSurfaceTone.panel,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'VOICE ENGINE SETUP',
              style: interactionEyebrowStyle(
                context,
                color: accent.withValues(alpha: 0.72),
              ),
            ),
            SizedBox(height: spatial.space4),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: voiceOptions
                  .map((voice) => VoiceOption(
                        voice: voice,
                        isSelected: selectedVoice == voice,
                        onTap: () => onVoiceSelected(voice),
                      ))
                  .toList(),
            ),
            SizedBox(height: spatial.space5),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: selectedVoice != null ? onConfirm : null,
                style: spatial.primaryButtonStyle(accent: accent),
                child: const Text('确定语音配置'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
