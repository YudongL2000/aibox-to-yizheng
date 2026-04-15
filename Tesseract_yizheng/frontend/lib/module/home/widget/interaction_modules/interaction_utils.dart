import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:flutter/material.dart';

enum InteractionTone {
  neutral,
  info,
  success,
  warning,
  danger,
  neural,
}

/// 测量单行按钮标题文本宽度（用于操作按钮最小宽度：最长标题 + 5）
double measureButtonTitleWidth(
  String text, {
  double fontSize = 12,
  FontWeight fontWeight = FontWeight.w700,
}) {
  final painter = TextPainter(
    text: TextSpan(
      text: text,
      style: TextStyle(fontSize: fontSize, fontWeight: fontWeight),
    ),
    textDirection: TextDirection.ltr,
    maxLines: 1,
  )..layout(minWidth: 0, maxWidth: double.infinity);
  return painter.width;
}

SpatialStatusTone _mapTone(InteractionTone tone) {
  switch (tone) {
    case InteractionTone.neutral:
      return SpatialStatusTone.neutral;
    case InteractionTone.info:
      return SpatialStatusTone.info;
    case InteractionTone.success:
      return SpatialStatusTone.success;
    case InteractionTone.warning:
      return SpatialStatusTone.warning;
    case InteractionTone.danger:
      return SpatialStatusTone.danger;
    case InteractionTone.neural:
      return SpatialStatusTone.neural;
  }
}

Color interactionToneColor(BuildContext context, InteractionTone tone) {
  return context.spatial.status(_mapTone(tone));
}

BoxDecoration interactionPanelDecoration(
  BuildContext context, {
  InteractionTone tone = InteractionTone.neutral,
  SpatialSurfaceTone surfaceTone = SpatialSurfaceTone.panel,
  bool emphasize = false,
  double? radius,
}) {
  final spatial = context.spatial;
  final accent = tone == InteractionTone.neutral
      ? null
      : interactionToneColor(context, tone);
  return spatial.panelDecoration(
    tone: surfaceTone,
    accent: accent,
    emphasize: emphasize,
    radius: radius,
  );
}

BoxDecoration interactionOptionDecoration(
  BuildContext context, {
  required bool isSelected,
  InteractionTone tone = InteractionTone.info,
}) {
  final spatial = context.spatial;
  final accent = interactionToneColor(context, tone);
  return BoxDecoration(
    color: isSelected
        ? Color.alphaBlend(
            accent.withValues(alpha: 0.12),
            spatial.surface(SpatialSurfaceTone.elevated),
          )
        : spatial.surface(SpatialSurfaceTone.muted),
    borderRadius: BorderRadius.circular(spatial.radiusMd),
    border: Border.all(
      color: isSelected ? accent.withValues(alpha: 0.48) : spatial.borderSubtle,
    ),
  );
}

TextStyle interactionEyebrowStyle(
  BuildContext context, {
  Color? color,
}) {
  return context.spatial.monoTextStyle(
    color: color ?? context.spatial.textMuted,
    size: 10,
    letterSpacing: 1.6,
  );
}

TextStyle interactionBodyStyle(
  BuildContext context, {
  Color? color,
  double size = 14,
  FontWeight weight = FontWeight.w400,
  double? height,
}) {
  return context.spatial.bodyTextStyle().copyWith(
        color: color ?? context.spatial.palette.textPrimary,
        fontSize: size,
        fontWeight: weight,
        height: height,
      );
}

Widget interactionStatusChip(
  BuildContext context, {
  required String label,
  InteractionTone tone = InteractionTone.neutral,
}) {
  final spatial = context.spatial;
  final base = tone == InteractionTone.neutral
      ? spatial.textMuted
      : interactionToneColor(context, tone);
  return Container(
    padding: EdgeInsets.symmetric(
      horizontal: spatial.space3,
      vertical: spatial.space2 - 2,
    ),
    decoration: BoxDecoration(
      color: base.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(spatial.radiusSm),
      border: Border.all(color: base.withValues(alpha: 0.28)),
    ),
    child: Text(
      label,
      style: spatial.monoTextStyle(
        color: base,
        size: 10,
      ),
    ),
  );
}

Widget interactionActionButtonChild(
  BuildContext context, {
  required String label,
  bool isLoading = false,
  Color? color,
}) {
  final effectiveColor = color ?? context.spatial.palette.textInverse;
  if (!isLoading) {
    return Text(label);
  }

  return Row(
    mainAxisSize: MainAxisSize.min,
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      SizedBox(
        width: 14,
        height: 14,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(effectiveColor),
        ),
      ),
      const SizedBox(width: 8),
      Text(label),
    ],
  );
}

Widget interactionDot(
  BuildContext context, {
  InteractionTone tone = InteractionTone.neutral,
  double size = 8,
}) {
  final color = tone == InteractionTone.neutral
      ? context.spatial.textMuted
      : interactionToneColor(context, tone);
  return Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: color,
      shape: BoxShape.circle,
    ),
  );
}

BorderRadius interactionBubbleRadius(
  BuildContext context, {
  required bool isUser,
}) {
  final spatial = context.spatial;
  return BorderRadius.only(
    topLeft: Radius.circular(isUser ? spatial.radiusMd : spatial.radiusSm),
    topRight: Radius.circular(isUser ? spatial.radiusSm : spatial.radiusMd),
    bottomLeft: Radius.circular(spatial.radiusMd),
    bottomRight: Radius.circular(spatial.radiusMd),
  );
}
