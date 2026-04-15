import 'package:aitesseract/module/home/widget/interaction_modules/emotion_video_player.dart';
import 'package:aitesseract/server/api/agent_chat_api.dart';
import 'package:flutter/material.dart';

/// 单选/多选交互组件
/// 用于显示 select_single 和 select_multi 类型的交互
class SelectInteractionWidget extends StatefulWidget {
  final Interaction interaction;
  final Function(List<String> selectedValues) onSubmit; // 提交选中的值列表

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
    // 初始化已选中的值
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
    // 参考图6：Voice Engine Setup - 圆角 32px、voice-chip 选中渐变+发光
    final isMulti = widget.interaction.mode == 'multi';
    final options = widget.interaction.options ?? [];
    const cyan = Color(0xFF00F2FF);
    const blue = Color(0xFF0066FF);
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: const Color(0xFF0D1930).withOpacity(0.4),
          borderRadius: BorderRadius.circular(32),
          border: Border.all(color: cyan.withOpacity(0.15), width: 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              (widget.interaction.title != null &&
                          widget.interaction.title!.isNotEmpty
                      ? widget.interaction.title!
                      : _getFieldDisplayName(widget.interaction.field))
                  .toUpperCase(),
              style: TextStyle(
                color: const Color(0xFF6B7280),
                fontSize: 10,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 16),
            if (widget.interaction.description != null &&
                widget.interaction.description!.isNotEmpty) ...[
              Text(
                widget.interaction.description!,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.5),
                  fontSize: 12,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 16),
            ],
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: options
                  .map((option) => _buildOption(option, isMulti))
                  .toList(),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: Container(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [blue, cyan],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: cyan.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: _selectedValues.isNotEmpty
                        ? () {
                            widget.onSubmit(_selectedValues.toList());
                          }
                        : null,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      alignment: Alignment.center,
                      child: Text(
                        _getConfirmButtonText(widget.interaction.field),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 获取字段的显示名称
  String _getFieldDisplayName(String field) {
    switch (field) {
      case 'tts_voice':
        return 'VOICE ENGINE SETUP';
      case 'screen_emoji':
        return 'SCREEN EMOJI SETUP';
      case 'chassis_action':
        return 'CHASSIS ACTION SETUP';
      case 'hand_gestures':
        return 'HAND GESTURES SETUP';
      case 'yolo_gestures':
        return 'YOLO GESTURES SETUP';
      case 'emotion_labels':
        return 'EMOTION LABELS SETUP';
      case 'arm_actions':
        return 'ARM ACTIONS SETUP';
      case 'face_profiles':
        return 'FACE PROFILES SETUP';
      default:
        return 'SELECT OPTION';
    }
  }

  /// 获取确认按钮文本
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

  /// 检查是否是情绪标签（需要显示视频）
  bool _isEmotionLabel(String label) {
    return label == '生气' || label == '平和' || label == '难过' || label == '开心';
  }

  Widget _buildOption(InteractionOption option, bool isMulti) {
    final isSelected = _selectedValues.contains(option.value);
    const cyan = Color(0xFF00D9FF);
    const blue = Color(0xFF0066FF);
    final showVideo = _isEmotionLabel(option.label);

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
            _selectedValues.clear();
            _selectedValues.add(option.value);
          }
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          gradient: isSelected
              ? const LinearGradient(
                  colors: [Color(0xFF0D4F6E), Color(0xFF00C9CC)],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                )
              : null,
          color: isSelected ? null : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? cyan : Colors.white.withOpacity(0.08),
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: cyan.withOpacity(0.4),
                    blurRadius: 12,
                    spreadRadius: 0,
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: isSelected ? cyan : const Color(0xFF64748B),
                shape: BoxShape.circle,
                boxShadow: isSelected
                    ? [BoxShadow(color: cyan.withOpacity(0.8), blurRadius: 8)]
                    : null,
              ),
            ),
            const SizedBox(width: 10),
            Text(
              option.label,
              style: TextStyle(
                color: isSelected
                    ? Colors.white
                    : Colors.white.withOpacity(0.6),
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal,
              ),
            ),
            // 如果是情绪标签，在后方添加视频播放器
            if (showVideo) ...[
              const SizedBox(width: 8),
              EmotionVideoPlayer(
                emotion: option.label == "开心"
                    ? "b"
                    : option.label == "难过"
                    ? "d"
                    : option.label == "生气"
                    ? "c"
                    : "a",
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
