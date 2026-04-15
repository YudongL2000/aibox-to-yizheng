import 'package:aitesseract/module/home/widget/interaction_modules/emotion_video_player.dart';
import 'package:aitesseract/server/api/agent_chat_api.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:flutter/material.dart';

import 'interaction_utils.dart';

/// 单选/多选交互组件
class SelectInteractionWidget extends StatefulWidget {
  final Interaction interaction;
  final Function(List<String> selectedValues) onSubmit;

  const SelectInteractionWidget({
    super.key,
    required this.interaction,
    required this.onSubmit,
  });

  @override
  State<SelectInteractionWidget> createState() =>
      _SelectInteractionWidgetState();
}

class _SelectInteractionWidgetState extends State<SelectInteractionWidget> {
  final Set<String> _selectedValues = <String>{};

  @override
  void initState() {
    super.initState();
    if (widget.interaction.selected != null) {
      if (widget.interaction.mode == 'multi') {
        if (widget.interaction.selected is List) {
          _selectedValues.addAll(
            (widget.interaction.selected as List).map((e) => e.toString()),
          );
        }
      } else {
        _selectedValues.add(widget.interaction.selected.toString());
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMulti = widget.interaction.mode == 'multi';
    final options = widget.interaction.options ?? [];
    final spatial = context.spatial;
    final accent = interactionToneColor(context, InteractionTone.info);

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Container(
        padding: EdgeInsets.all(spatial.space5),
        decoration: interactionPanelDecoration(
          context,
          tone: InteractionTone.info,
          surfaceTone: SpatialSurfaceTone.panel,
          radius: spatial.radiusMd,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  _getFieldDisplayName(widget.interaction.field).toUpperCase(),
                  style: interactionEyebrowStyle(
                    context,
                    color: accent.withValues(alpha: 0.72),
                  ),
                ),
                const Spacer(),
                interactionStatusChip(
                  context,
                  label: isMulti ? 'MULTI' : 'SINGLE',
                  tone: InteractionTone.info,
                ),
              ],
            ),
            SizedBox(height: spatial.space2),
            Text(
              widget.interaction.title?.isNotEmpty == true
                  ? widget.interaction.title!
                  : '请选择合适的配置项',
              style: spatial.cardTitleStyle(),
            ),
            SizedBox(height: spatial.space4),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: options
                  .map((option) => _buildOption(context, option, isMulti))
                  .toList(),
            ),
            SizedBox(height: spatial.space5),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _selectedValues.isNotEmpty
                    ? () => widget.onSubmit(_selectedValues.toList())
                    : null,
                style: spatial.primaryButtonStyle(accent: accent),
                child: Text(_getConfirmButtonText(widget.interaction.field)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getFieldDisplayName(String field) {
    switch (field) {
      case 'tts_voice':
        return 'Voice Engine Setup';
      case 'screen_emoji':
        return 'Screen Emoji Setup';
      case 'chassis_action':
        return 'Chassis Action Setup';
      case 'hand_gestures':
        return 'Hand Gestures Setup';
      case 'yolo_gestures':
        return 'YOLO Gestures Setup';
      case 'emotion_labels':
        return 'Emotion Labels Setup';
      case 'arm_actions':
        return 'Arm Actions Setup';
      case 'face_profiles':
        return 'Face Profiles Setup';
      default:
        return 'Select Option';
    }
  }

  String _getConfirmButtonText(String field) {
    switch (field) {
      case 'tts_voice':
        return '确定语音配置';
      case 'screen_emoji':
        return '确定表情配置';
      case 'chassis_action':
        return '确定底盘动作';
      case 'hand_gestures':
        return '确定手势配置';
      case 'yolo_gestures':
        return '确定手势识别';
      case 'emotion_labels':
        return '确定情绪分类';
      case 'arm_actions':
        return '确定机械臂动作';
      case 'face_profiles':
        return '确定人脸配置';
      default:
        return '确认';
    }
  }

  bool _isEmotionLabel(String label) {
    return label == '生气' || label == '平和' || label == '难过' || label == '开心';
  }

  Widget _buildOption(
    BuildContext context,
    InteractionOption option,
    bool isMulti,
  ) {
    final isSelected = _selectedValues.contains(option.value);
    final showVideo = _isEmotionLabel(option.label);
    final spatial = context.spatial;

    return GestureDetector(
      onTap: () {
        setState(() {
          if (isMulti) {
            if (isSelected) {
              _selectedValues.remove(option.value);
            } else {
              if (widget.interaction.maxSelections == null ||
                  _selectedValues.length < widget.interaction.maxSelections!) {
                _selectedValues.add(option.value);
              }
            }
          } else {
            _selectedValues
              ..clear()
              ..add(option.value);
          }
        });
      },
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: spatial.space4,
          vertical: spatial.space3,
        ),
        decoration: interactionOptionDecoration(
          context,
          isSelected: isSelected,
          tone: InteractionTone.info,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            interactionDot(
              context,
              tone: isSelected ? InteractionTone.info : InteractionTone.neutral,
            ),
            const SizedBox(width: 10),
            Text(
              option.label,
              style: interactionBodyStyle(
                context,
                size: 12,
                weight: isSelected ? FontWeight.w700 : FontWeight.w400,
                color: isSelected
                    ? spatial.palette.textPrimary
                    : spatial.textMuted,
              ),
            ),
            if (showVideo) ...[
              const SizedBox(width: 8),
              EmotionVideoPlayer(
                emotion: option.label == '开心'
                    ? 'b'
                    : option.label == '难过'
                        ? 'd'
                        : option.label == '生气'
                            ? 'c'
                            : 'a',
                width: 40,
                height: 40,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
