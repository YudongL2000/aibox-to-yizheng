/*
 * [INPUT]: 依赖 Flutter Material 与 dialogue_mode_models.dart 的面板模型。
 * [OUTPUT]: 对外提供 DialogueModeCard 组件，渲染技能唤醒区、当前状态气泡、校验提示与主动作按钮。
 * [POS]: module/home/widget/dialogue_mode 的主视图，被 AiInteractionWindow 在“对话模式”分支挂载。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:flutter/material.dart';

import 'dialogue_mode_models.dart';

class DialogueModeCard extends StatelessWidget {
  final DialogueModeViewModel model;
  final void Function(String prompt)? onSkillTap;
  final void Function(DialogueModeAction action)? onActionTap;

  const DialogueModeCard({
    super.key,
    required this.model,
    this.onSkillTap,
    this.onActionTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF111117),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: const Color(0xFFB05CFF).withOpacity(0.35),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF8B3DFF).withOpacity(0.18),
            blurRadius: 30,
            spreadRadius: -10,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildWakeZone(),
          const SizedBox(height: 18),
          _buildMessageBubble(),
          if (model.showValidationLoader) ...[
            const SizedBox(height: 18),
            _buildValidationLoader(),
          ],
          if (model.missingHardware.isNotEmpty) ...[
            const SizedBox(height: 18),
            _buildMissingHardware(),
          ],
          if (model.actions.isNotEmpty) ...[
            const SizedBox(height: 18),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: model.actions
                  .map((action) => _buildActionButton(action))
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildWakeZone() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              '可用 Skill 快捷唤醒',
              style: TextStyle(
                color: Colors.white.withOpacity(0.92),
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            const Spacer(),
            Text(
              '${model.availableSkills.where((item) => item.ready).length} 个已连接',
              style: TextStyle(
                color: Colors.white.withOpacity(0.38),
                fontSize: 11,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: model.availableSkills.map(_buildSkillCard).toList(),
        ),
      ],
    );
  }

  Widget _buildSkillCard(DialogueSkillWakeup skill) {
    final borderColor = skill.ready
        ? const Color(0xFFB05CFF)
        : Colors.white.withOpacity(0.08);
    final fillColor = skill.ready
        ? const Color(0xFF22102F)
        : const Color(0xFF17171D);
    return GestureDetector(
      onTap: onSkillTap == null ? null : () => onSkillTap!(skill.title),
      child: Container(
        width: 116,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: fillColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: borderColor, width: 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: const Color(0xFFB05CFF).withOpacity(skill.ready ? 0.24 : 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                skill.ready ? Icons.play_arrow_rounded : Icons.lock_outline,
                color: skill.ready
                    ? const Color(0xFFE5CCFF)
                    : Colors.white.withOpacity(0.45),
                size: 18,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              skill.title,
              style: TextStyle(
                color: Colors.white.withOpacity(0.94),
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 10),
            ...skill.tags.map(
              (tag) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: skill.ready
                        ? const Color(0xFF124427)
                        : Colors.white.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    tag,
                    style: TextStyle(
                      color: skill.ready
                          ? const Color(0xFF7BFFB0)
                          : Colors.white.withOpacity(0.55),
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
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

  Widget _buildMessageBubble() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF16131F),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            model.message,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 15,
              height: 1.6,
            ),
          ),
          if (model.gameplayGuide != null && model.gameplayGuide!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              model.gameplayGuide!,
              style: TextStyle(
                color: Colors.white.withOpacity(0.65),
                fontSize: 13,
                height: 1.5,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildValidationLoader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF17171D),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: Colors.white.withOpacity(0.08),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '正在感知硬件状态...',
            style: TextStyle(
              color: Colors.white.withOpacity(0.88),
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: const LinearProgressIndicator(
              minHeight: 6,
              backgroundColor: Color(0xFF292933),
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFB05CFF)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMissingHardware() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: model.missingHardware
          .map(
            (item) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF2B1720),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: const Color(0xFFFF6B8A).withOpacity(0.35),
                  width: 1,
                ),
              ),
              child: Text(
                item,
                style: const TextStyle(
                  color: Color(0xFFFFC1CF),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildActionButton(DialogueModeAction action) {
    final isPrimary = action.kind == DialogueActionKind.primary;
    return GestureDetector(
      onTap: action.enabled && onActionTap != null ? () => onActionTap!(action) : null,
      child: Opacity(
        opacity: action.enabled ? 1 : 0.45,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          decoration: BoxDecoration(
            gradient: isPrimary
                ? const LinearGradient(
                    colors: [Color(0xFF8B3DFF), Color(0xFFB05CFF)],
                  )
                : null,
            color: isPrimary ? null : const Color(0xFF17171D),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isPrimary
                  ? Colors.transparent
                  : Colors.white.withOpacity(0.12),
              width: 1,
            ),
          ),
          child: Text(
            action.label,
            style: TextStyle(
              color: Colors.white.withOpacity(0.96),
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}
