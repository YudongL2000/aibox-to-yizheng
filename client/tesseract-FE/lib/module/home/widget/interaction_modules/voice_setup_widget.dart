import 'package:flutter/material.dart';
import 'package:aitesseract/module/home/widget/interaction_modules/voice_option.dart';

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
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF151923),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: const Color(0xFF00D9FF).withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'VOICE ENGINE SETUP',
              style: TextStyle(
                color: Colors.white.withOpacity(0.7),
                fontSize: 14,
                fontWeight: FontWeight.w500,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 16),
            // 语音选项 - 水平排列
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: voiceOptions.map((voice) => VoiceOption(
                    voice: voice,
                    isSelected: selectedVoice == voice,
                    onTap: () => onVoiceSelected(voice),
                  )).toList(),
            ),
            const SizedBox(height: 20),
            // 确认按钮 - 渐变效果
            SizedBox(
              width: double.infinity,
              child: Container(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [
                      Color(0xFF0099CC), // 左侧深蓝
                      Color(0xFF00D9FF), // 右侧亮蓝
                    ],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF00D9FF).withOpacity(0.3),
                      blurRadius: 8,
                      spreadRadius: 0,
                    ),
                  ],
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: selectedVoice != null ? onConfirm : null,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      alignment: Alignment.center,
                      child: const Text(
                        '确定语音配置',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
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
}
