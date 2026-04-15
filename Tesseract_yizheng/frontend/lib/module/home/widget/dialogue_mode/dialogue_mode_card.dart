/*
 * [INPUT]: 依赖 Flutter Material、dialogue_mode_models.dart 与 interaction shell helpers。
 * [OUTPUT]: 对外提供 DialogueModeCard 组件，渲染对话模式 skills、状态说明、缺失硬件与 CTA，并统一成低圆角矩形 wake card。
 * [POS]: module/home/widget/dialogue_mode 的主视图，被 AiInteractionWindow 在“对话模式”分支挂载。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

import '../interaction_modules/interaction_utils.dart';
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
    final spatial = context.spatial;
    return Container(
      padding: EdgeInsets.all(spatial.space5),
      decoration: interactionPanelDecoration(
        context,
        tone: InteractionTone.neural,
        surfaceTone: SpatialSurfaceTone.panel,
        radius: spatial.radiusMd,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _wakeZone(context),
          SizedBox(height: spatial.space4 + 2),
          _messageBubble(context),
          if (model.showValidationLoader) ...[
            SizedBox(height: spatial.space4 + 2),
            _validationLoader(context),
          ],
          if (model.missingHardware.isNotEmpty) ...[
            SizedBox(height: spatial.space4 + 2),
            _missingHardware(context),
          ],
          if (model.actions.isNotEmpty) ...[
            SizedBox(height: spatial.space4 + 2),
            Wrap(
              spacing: spatial.space3,
              runSpacing: spatial.space3,
              children: model.actions
                  .map((action) => _actionButton(context, action))
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _wakeZone(BuildContext context) {
    final spatial = context.spatial;
    final accent = interactionToneColor(context, InteractionTone.neural);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'SKILL WAKE',
              style: interactionEyebrowStyle(
                context,
                color: accent.withValues(alpha: 0.78),
              ),
            ),
            SizedBox(width: spatial.space3),
            const Spacer(),
            Text(
              '${model.availableSkills.where((item) => item.ready).length} 个已连接',
              style: interactionEyebrowStyle(
                context,
                color: spatial.textMuted,
              ),
            ),
          ],
        ),
        SizedBox(height: spatial.space4),
        Wrap(
          spacing: spatial.space3,
          runSpacing: spatial.space3,
          children: model.availableSkills
              .map((skill) => _skillCard(context, skill))
              .toList(),
        ),
      ],
    );
  }

  Widget _skillCard(BuildContext context, DialogueSkillWakeup skill) {
    final spatial = context.spatial;
    final accent = interactionToneColor(context, InteractionTone.neural);
    return GestureDetector(
      onTap: onSkillTap == null ? null : () => onSkillTap!(skill.title),
      child: Container(
        width: 128,
        padding: EdgeInsets.all(spatial.space4),
        decoration: interactionOptionDecoration(
          context,
          isSelected: skill.ready,
          tone: InteractionTone.neural,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: skill.ready ? 0.18 : 0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(
                skill.ready ? Icons.play_arrow_rounded : Icons.lock_outline,
                color: skill.ready ? accent : spatial.textMuted,
                size: 18,
              ),
            ),
            SizedBox(height: spatial.space3),
            Text(
              skill.title,
              style: spatial.cardTitleStyle().copyWith(fontSize: 14),
            ),
            SizedBox(height: spatial.space2),
            ...skill.tags.map(
              (tag) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: interactionStatusChip(
                  context,
                  label: tag,
                  tone: skill.ready
                      ? InteractionTone.success
                      : InteractionTone.neutral,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _messageBubble(BuildContext context) {
    final spatial = context.spatial;
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(spatial.space4),
      decoration: interactionPanelDecoration(
        context,
        surfaceTone: SpatialSurfaceTone.muted,
        radius: spatial.radiusMd,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            model.message,
            style: interactionBodyStyle(context, size: 15, height: 1.6),
          ),
        ],
      ),
    );
  }

  Widget _validationLoader(BuildContext context) {
    final spatial = context.spatial;
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(spatial.space4),
      decoration: interactionPanelDecoration(
        context,
        tone: InteractionTone.neural,
        surfaceTone: SpatialSurfaceTone.muted,
        radius: spatial.radiusMd,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '检测中',
            style: interactionBodyStyle(
              context,
              size: 14,
              weight: FontWeight.w600,
            ),
          ),
          SizedBox(height: spatial.space3),
          ClipRRect(
            borderRadius: BorderRadius.circular(spatial.radiusSm),
            child: LinearProgressIndicator(
              minHeight: 6,
              backgroundColor: spatial.surfaceElevated,
              valueColor: AlwaysStoppedAnimation<Color>(
                interactionToneColor(context, InteractionTone.neural),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _missingHardware(BuildContext context) {
    return Wrap(
      spacing: context.spatial.space2,
      runSpacing: context.spatial.space2,
      children: model.missingHardware
          .map(
            (item) => interactionStatusChip(
              context,
              label: item,
              tone: InteractionTone.danger,
            ),
          )
          .toList(),
    );
  }

  Widget _actionButton(BuildContext context, DialogueModeAction action) {
    final spatial = context.spatial;
    final isPrimary = action.kind == DialogueActionKind.primary;
    return isPrimary
        ? FilledButton(
            onPressed: action.enabled ? () => onActionTap?.call(action) : null,
            style: spatial.primaryButtonStyle(
              accent: interactionToneColor(context, InteractionTone.neural),
            ),
            child: Text(action.label),
          )
        : OutlinedButton(
            onPressed: action.enabled ? () => onActionTap?.call(action) : null,
            style: spatial.secondaryButtonStyle(),
            child: Text(action.label),
          );
  }
}
