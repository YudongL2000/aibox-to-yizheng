/**
 * [INPUT]: Derived from docs/spatial-wireframe-design-ref.md and consumed by
 * Flutter app-shell theme setup.
 * [OUTPUT]: Exposes shared Spatial Wireframe tokens, tighter low-radius
 * semantic ThemeData builders, consumable app-shell styling primitives for
 * light/dark modes, and shell-aligned hex defaults reused by the web viewer.
 * [POS]: frontend/lib/utils design-language reference layer, sitting above
 * widget-level styling and below page-specific composition.
 * [PROTOCOL]: Update this header when changing behavior, then check AGENTS.md.
 */

import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';

enum SpatialSurfaceTone {
  panel,
  elevated,
  muted,
  overlay,
  dataBlock,
}

enum SpatialStatusTone {
  neutral,
  info,
  success,
  warning,
  danger,
  neural,
}

@immutable
final class SpatialDesignTokens {
  const SpatialDesignTokens._();

  static const String fontSans = 'Inter';
  static const String fontMono = 'Space Mono';

  static const List<String> fontSansFallback = <String>[
    'PingFang SC',
    'Hiragino Sans GB',
    'sans-serif',
  ];

  static const List<String> fontMonoFallback = <String>[
    'Courier New',
    'monospace',
  ];

  static const double radiusLight = 4;
  static const double radiusDark = 4;
  static const Duration motionFast = Duration(milliseconds: 160);
  static const Duration motionBase = Duration(milliseconds: 220);
  static const Duration motionSlow = Duration(milliseconds: 300);
  static const Duration transition = Duration(milliseconds: 300);

  static const Color lightBgBase = Color(0xFFF4F4F2);
  static const Color lightSurface = Color(0xFFEAEAEA);
  static const Color lightSurfaceHover = Color(0xFFDFDFDF);
  static const Color lightBorderSolid = Color(0xFF222222);
  static const Color lightBorderDashed = Color(0xFFBBBBBB);
  static const Color lightGridColor = Color(0x08000000);
  static const Color lightTextPrimary = Color(0xFF111111);
  static const Color lightTextSecondary = Color(0xFF666666);
  static const Color lightTextInverse = Color(0xFFF4F4F2);
  static const Color lightSemInfo = Color(0xFF0055FF);
  static const Color lightSemSuccess = Color(0xFF00A859);
  static const Color lightSemWarning = Color(0xFFE58A00);
  static const Color lightSemDanger = Color(0xFFE0282E);
  static const Color lightSemNeural = Color(0xFF6B21A8);
  static const String lightBgBaseHex = 'F4F4F2';

  static const Color darkBgBase = Color(0xFF121316);
  static const Color darkSurface = Color(0xFF1E1F24);
  static const Color darkSurfaceHover = Color(0xFF2A2C33);
  static const Color darkBorderSolid = Color(0xFF3A3D45);
  static const Color darkBorderDashed = Color(0xFF555555);
  static const Color darkGridColor = Color(0x05FFFFFF);
  static const Color darkTextPrimary = Color(0xFFF0F0F0);
  static const Color darkTextSecondary = Color(0xFF8A8D98);
  static const Color darkTextInverse = Color(0xFF121316);
  static const Color darkSemInfo = Color(0xFF00E5FF);
  static const Color darkSemSuccess = Color(0xFFCFFF04);
  static const Color darkSemWarning = Color(0xFFFFC000);
  static const Color darkSemDanger = Color(0xFFFF3366);
  static const Color darkSemNeural = Color(0xFFB14EFF);
  static const String darkBgBaseHex = '121316';
}

@immutable
final class SpatialPalette {
  const SpatialPalette({
    required this.bgBase,
    required this.surface,
    required this.surfaceHover,
    required this.borderSolid,
    required this.borderDashed,
    required this.gridColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.textInverse,
    required this.semInfo,
    required this.semSuccess,
    required this.semWarning,
    required this.semDanger,
    required this.semNeural,
    required this.radiusBase,
  });

  final Color bgBase;
  final Color surface;
  final Color surfaceHover;
  final Color borderSolid;
  final Color borderDashed;
  final Color gridColor;
  final Color textPrimary;
  final Color textSecondary;
  final Color textInverse;
  final Color semInfo;
  final Color semSuccess;
  final Color semWarning;
  final Color semDanger;
  final Color semNeural;
  final double radiusBase;

  Color get accent => semNeural;
  Color get statusOk => semSuccess;
  Color get statusWarn => semWarning;
  Color get statusDanger => semDanger;
}

@immutable
final class SpatialThemeData extends ThemeExtension<SpatialThemeData> {
  const SpatialThemeData({
    required this.palette,
    required this.surfacePanel,
    required this.surfaceElevated,
    required this.surfaceMuted,
    required this.surfaceOverlay,
    required this.borderSubtle,
    required this.focusRing,
    required this.textMuted,
    required this.radiusSm,
    required this.radiusMd,
    required this.radiusLg,
    required this.radiusPill,
    required this.space1,
    required this.space2,
    required this.space3,
    required this.space4,
    required this.space5,
    required this.space6,
    required this.motionFast,
    required this.motionBase,
    required this.motionSlow,
  });

  factory SpatialThemeData.fromPalette(SpatialPalette palette) {
    final Color surfacePanel = Color.alphaBlend(
      palette.borderSolid.withValues(alpha: 0.04),
      palette.surface,
    );
    final Color surfaceElevated = Color.alphaBlend(
      palette.borderSolid.withValues(alpha: 0.05),
      surfacePanel,
    );
    final Color surfaceMuted = Color.alphaBlend(
      palette.borderDashed.withValues(alpha: 0.05),
      surfacePanel,
    );
    final Color surfaceOverlay = Color.alphaBlend(
      palette.borderSolid.withValues(alpha: 0.08),
      surfacePanel,
    );

    return SpatialThemeData(
      palette: palette,
      surfacePanel: surfacePanel,
      surfaceElevated: surfaceElevated,
      surfaceMuted: surfaceMuted,
      surfaceOverlay: surfaceOverlay,
      borderSubtle: palette.borderDashed.withValues(alpha: 0.8),
      focusRing: palette.accent.withValues(alpha: 0.35),
      textMuted: palette.textSecondary.withValues(alpha: 0.88),
      radiusSm: palette.radiusBase,
      radiusMd: palette.radiusBase + 1,
      radiusLg: palette.radiusBase + 2,
      radiusPill: palette.radiusBase + 2,
      space1: 4,
      space2: 8,
      space3: 12,
      space4: 16,
      space5: 24,
      space6: 32,
      motionFast: SpatialDesignTokens.motionFast,
      motionBase: SpatialDesignTokens.motionBase,
      motionSlow: SpatialDesignTokens.motionSlow,
    );
  }

  final SpatialPalette palette;
  final Color surfacePanel;
  final Color surfaceElevated;
  final Color surfaceMuted;
  final Color surfaceOverlay;
  final Color borderSubtle;
  final Color focusRing;
  final Color textMuted;
  final double radiusSm;
  final double radiusMd;
  final double radiusLg;
  final double radiusPill;
  final double space1;
  final double space2;
  final double space3;
  final double space4;
  final double space5;
  final double space6;
  final Duration motionFast;
  final Duration motionBase;
  final Duration motionSlow;

  Color surface(SpatialSurfaceTone tone) {
    switch (tone) {
      case SpatialSurfaceTone.panel:
        return surfacePanel;
      case SpatialSurfaceTone.elevated:
        return surfaceElevated;
      case SpatialSurfaceTone.muted:
        return surfaceMuted;
      case SpatialSurfaceTone.overlay:
        return surfaceOverlay;
      case SpatialSurfaceTone.dataBlock:
        return palette.bgBase;
    }
  }

  Color status(SpatialStatusTone tone) {
    switch (tone) {
      case SpatialStatusTone.neutral:
        return palette.textSecondary;
      case SpatialStatusTone.info:
        return palette.semInfo;
      case SpatialStatusTone.success:
        return palette.semSuccess;
      case SpatialStatusTone.warning:
        return palette.semWarning;
      case SpatialStatusTone.danger:
        return palette.semDanger;
      case SpatialStatusTone.neural:
        return palette.semNeural;
    }
  }

  TextStyle heroTextStyle() => SpatialDesignTheme._sansStyle(
        color: palette.textPrimary,
        size: 28,
        weight: FontWeight.w800,
        height: 1.1,
      );

  TextStyle sectionTextStyle() => SpatialDesignTheme._sansStyle(
        color: palette.textPrimary,
        size: 17,
        weight: FontWeight.w700,
        height: 1.2,
      );

  TextStyle cardTitleStyle() => SpatialDesignTheme._sansStyle(
        color: palette.textPrimary,
        size: 15,
        weight: FontWeight.w700,
        height: 1.25,
      );

  TextStyle bodyTextStyle() => SpatialDesignTheme._sansStyle(
        color: palette.textPrimary,
        size: 14,
        height: 1.55,
      );

  TextStyle captionTextStyle() => SpatialDesignTheme._sansStyle(
        color: textMuted,
        size: 12,
        height: 1.45,
      );

  TextStyle monoTextStyle({
    Color? color,
    double size = 11,
    FontWeight weight = FontWeight.w700,
    double letterSpacing = 1.2,
  }) {
    return SpatialDesignTheme._monoStyle(
      color: color ?? palette.textSecondary,
      size: size,
      weight: weight,
    ).copyWith(letterSpacing: letterSpacing);
  }

  BorderSide borderSide({
    Color? color,
    bool dashed = false,
  }) {
    return BorderSide(
      color: color ?? (dashed ? borderSubtle : palette.borderSolid),
      width: 1,
      style: dashed ? BorderStyle.solid : BorderStyle.solid,
    );
  }

  BoxDecoration panelDecoration({
    SpatialSurfaceTone tone = SpatialSurfaceTone.panel,
    Color? accent,
    double? radius,
    bool emphasize = false,
  }) {
    final Color resolvedAccent = accent ?? palette.borderSolid;
    final Color borderColor = accent == null
        ? borderSubtle
        : Color.lerp(borderSubtle, resolvedAccent, 0.32)!;

    return BoxDecoration(
      color: surface(tone),
      borderRadius: BorderRadius.circular(radius ?? radiusMd),
      border: Border.all(
        color: accent == null ? palette.borderSolid : borderColor,
      ),
      boxShadow: const <BoxShadow>[],
    );
  }

  BoxDecoration dataBlockDecoration({
    Color? accent,
    double? radius,
  }) {
    return panelDecoration(
      tone: SpatialSurfaceTone.dataBlock,
      accent: accent,
      radius: radius ?? radiusMd,
    );
  }

  ButtonStyle primaryButtonStyle({Color? accent}) {
    final Color resolvedAccent = accent ?? palette.textPrimary;
    return FilledButton.styleFrom(
      backgroundColor: resolvedAccent,
      foregroundColor: palette.textInverse,
      disabledBackgroundColor: surfaceElevated,
      disabledForegroundColor: textMuted,
      padding: EdgeInsets.symmetric(horizontal: space4, vertical: space3),
      side: BorderSide(color: resolvedAccent),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusSm),
      ),
      textStyle: monoTextStyle(
        color: palette.textInverse,
        size: 11,
      ),
    );
  }

  ButtonStyle secondaryButtonStyle({Color? accent}) {
    final Color resolvedAccent = accent ?? palette.textPrimary;
    return OutlinedButton.styleFrom(
      foregroundColor: resolvedAccent,
      side: BorderSide(
          color: accent == null
              ? borderSubtle
              : resolvedAccent.withValues(alpha: 0.4)),
      padding: EdgeInsets.symmetric(horizontal: space4, vertical: space3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusSm),
      ),
      textStyle: monoTextStyle(
        color: resolvedAccent,
        size: 11,
      ),
    );
  }

  ButtonStyle dangerButtonStyle() {
    return OutlinedButton.styleFrom(
      foregroundColor: palette.semDanger,
      side: BorderSide(color: palette.semDanger.withValues(alpha: 0.5)),
      padding: EdgeInsets.symmetric(horizontal: space4, vertical: space3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusSm),
      ),
      textStyle: monoTextStyle(
        color: palette.semDanger,
        size: 11,
      ),
    );
  }

  @override
  SpatialThemeData copyWith({
    SpatialPalette? palette,
    Color? surfacePanel,
    Color? surfaceElevated,
    Color? surfaceMuted,
    Color? surfaceOverlay,
    Color? borderSubtle,
    Color? focusRing,
    Color? textMuted,
    double? radiusSm,
    double? radiusMd,
    double? radiusLg,
    double? radiusPill,
    double? space1,
    double? space2,
    double? space3,
    double? space4,
    double? space5,
    double? space6,
    Duration? motionFast,
    Duration? motionBase,
    Duration? motionSlow,
  }) {
    return SpatialThemeData(
      palette: palette ?? this.palette,
      surfacePanel: surfacePanel ?? this.surfacePanel,
      surfaceElevated: surfaceElevated ?? this.surfaceElevated,
      surfaceMuted: surfaceMuted ?? this.surfaceMuted,
      surfaceOverlay: surfaceOverlay ?? this.surfaceOverlay,
      borderSubtle: borderSubtle ?? this.borderSubtle,
      focusRing: focusRing ?? this.focusRing,
      textMuted: textMuted ?? this.textMuted,
      radiusSm: radiusSm ?? this.radiusSm,
      radiusMd: radiusMd ?? this.radiusMd,
      radiusLg: radiusLg ?? this.radiusLg,
      radiusPill: radiusPill ?? this.radiusPill,
      space1: space1 ?? this.space1,
      space2: space2 ?? this.space2,
      space3: space3 ?? this.space3,
      space4: space4 ?? this.space4,
      space5: space5 ?? this.space5,
      space6: space6 ?? this.space6,
      motionFast: motionFast ?? this.motionFast,
      motionBase: motionBase ?? this.motionBase,
      motionSlow: motionSlow ?? this.motionSlow,
    );
  }

  @override
  SpatialThemeData lerp(
      covariant ThemeExtension<SpatialThemeData>? other, double t) {
    if (other is! SpatialThemeData) {
      return this;
    }

    return SpatialThemeData(
      palette: t < 0.5 ? palette : other.palette,
      surfacePanel: Color.lerp(surfacePanel, other.surfacePanel, t)!,
      surfaceElevated: Color.lerp(surfaceElevated, other.surfaceElevated, t)!,
      surfaceMuted: Color.lerp(surfaceMuted, other.surfaceMuted, t)!,
      surfaceOverlay: Color.lerp(surfaceOverlay, other.surfaceOverlay, t)!,
      borderSubtle: Color.lerp(borderSubtle, other.borderSubtle, t)!,
      focusRing: Color.lerp(focusRing, other.focusRing, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
      radiusSm: lerpDouble(radiusSm, other.radiusSm, t)!,
      radiusMd: lerpDouble(radiusMd, other.radiusMd, t)!,
      radiusLg: lerpDouble(radiusLg, other.radiusLg, t)!,
      radiusPill: lerpDouble(radiusPill, other.radiusPill, t)!,
      space1: lerpDouble(space1, other.space1, t)!,
      space2: lerpDouble(space2, other.space2, t)!,
      space3: lerpDouble(space3, other.space3, t)!,
      space4: lerpDouble(space4, other.space4, t)!,
      space5: lerpDouble(space5, other.space5, t)!,
      space6: lerpDouble(space6, other.space6, t)!,
      motionFast: t < 0.5 ? motionFast : other.motionFast,
      motionBase: t < 0.5 ? motionBase : other.motionBase,
      motionSlow: t < 0.5 ? motionSlow : other.motionSlow,
    );
  }
}

extension SpatialBuildContextX on BuildContext {
  SpatialThemeData get spatial =>
      Theme.of(this).extension<SpatialThemeData>() ??
      SpatialThemeData.fromPalette(SpatialDesignTheme.darkPalette);
}

final class SpatialDesignTheme {
  const SpatialDesignTheme._();

  static const SpatialPalette lightPalette = SpatialPalette(
    bgBase: SpatialDesignTokens.lightBgBase,
    surface: SpatialDesignTokens.lightSurface,
    surfaceHover: SpatialDesignTokens.lightSurfaceHover,
    borderSolid: SpatialDesignTokens.lightBorderSolid,
    borderDashed: SpatialDesignTokens.lightBorderDashed,
    gridColor: SpatialDesignTokens.lightGridColor,
    textPrimary: SpatialDesignTokens.lightTextPrimary,
    textSecondary: SpatialDesignTokens.lightTextSecondary,
    textInverse: SpatialDesignTokens.lightTextInverse,
    semInfo: SpatialDesignTokens.lightSemInfo,
    semSuccess: SpatialDesignTokens.lightSemSuccess,
    semWarning: SpatialDesignTokens.lightSemWarning,
    semDanger: SpatialDesignTokens.lightSemDanger,
    semNeural: SpatialDesignTokens.lightSemNeural,
    radiusBase: SpatialDesignTokens.radiusLight,
  );

  static const SpatialPalette darkPalette = SpatialPalette(
    bgBase: SpatialDesignTokens.darkBgBase,
    surface: SpatialDesignTokens.darkSurface,
    surfaceHover: SpatialDesignTokens.darkSurfaceHover,
    borderSolid: SpatialDesignTokens.darkBorderSolid,
    borderDashed: SpatialDesignTokens.darkBorderDashed,
    gridColor: SpatialDesignTokens.darkGridColor,
    textPrimary: SpatialDesignTokens.darkTextPrimary,
    textSecondary: SpatialDesignTokens.darkTextSecondary,
    textInverse: SpatialDesignTokens.darkTextInverse,
    semInfo: SpatialDesignTokens.darkSemInfo,
    semSuccess: SpatialDesignTokens.darkSemSuccess,
    semWarning: SpatialDesignTokens.darkSemWarning,
    semDanger: SpatialDesignTokens.darkSemDanger,
    semNeural: SpatialDesignTokens.darkSemNeural,
    radiusBase: SpatialDesignTokens.radiusDark,
  );

  static ThemeData light() => _buildTheme(
        brightness: Brightness.light,
        palette: lightPalette,
      );

  static ThemeData dark() => _buildTheme(
        brightness: Brightness.dark,
        palette: darkPalette,
      );

  static ThemeData _buildTheme({
    required Brightness brightness,
    required SpatialPalette palette,
  }) {
    final ColorScheme colorScheme = ColorScheme.fromSeed(
      brightness: brightness,
      seedColor: palette.accent,
      primary: palette.accent,
      onPrimary: palette.textInverse,
      secondary: palette.semInfo,
      onSecondary: palette.textInverse,
      tertiary: palette.statusOk,
      onTertiary: palette.textInverse,
      error: palette.semDanger,
      onError: palette.textInverse,
      surface: palette.surface,
      onSurface: palette.textPrimary,
      background: palette.bgBase,
      onBackground: palette.textPrimary,
      outline: palette.borderSolid,
      outlineVariant: palette.borderDashed,
      surfaceTint: palette.accent,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: palette.bgBase,
      canvasColor: palette.bgBase,
      dividerColor: palette.borderDashed,
      fontFamily: SpatialDesignTokens.fontSans,
      extensions: <ThemeExtension<dynamic>>[
        SpatialThemeData.fromPalette(palette),
      ],
      textTheme: _textTheme(palette),
      appBarTheme: AppBarTheme(
        backgroundColor: palette.bgBase,
        foregroundColor: palette.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: _sansStyle(
          color: palette.textPrimary,
          size: 20,
          weight: FontWeight.w700,
          height: 1.1,
        ),
      ),
      dividerTheme: DividerThemeData(
        color: palette.borderDashed,
        thickness: 1,
        space: 1,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: palette.surface,
        hintStyle: _sansStyle(color: palette.textSecondary, size: 14),
        labelStyle: _sansStyle(color: palette.textSecondary, size: 14),
        floatingLabelStyle: _sansStyle(
          color: palette.textPrimary,
          size: 14,
          weight: FontWeight.w500,
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: _outlineBorder(palette.borderSolid, palette.radiusBase),
        enabledBorder: _outlineBorder(palette.borderSolid, palette.radiusBase),
        focusedBorder: _outlineBorder(palette.accent, palette.radiusBase),
        errorBorder: _outlineBorder(palette.semDanger, palette.radiusBase),
        focusedErrorBorder:
            _outlineBorder(palette.semDanger, palette.radiusBase),
        disabledBorder:
            _outlineBorder(palette.borderDashed, palette.radiusBase),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: palette.textPrimary,
          foregroundColor: palette.textInverse,
          disabledBackgroundColor: palette.surfaceHover,
          disabledForegroundColor: palette.textSecondary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(palette.radiusBase),
          ),
          side: BorderSide(color: palette.borderSolid),
          textStyle: _monoStyle(
            color: palette.textInverse,
            size: 12,
            weight: FontWeight.w700,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: palette.textPrimary,
          disabledForegroundColor: palette.textSecondary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(palette.radiusBase),
          ),
          side: BorderSide(color: palette.borderSolid),
          textStyle: _monoStyle(
            color: palette.textPrimary,
            size: 12,
            weight: FontWeight.w700,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: palette.textPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(palette.radiusBase),
          ),
          textStyle: _monoStyle(
            color: palette.textPrimary,
            size: 12,
            weight: FontWeight.w700,
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: palette.surface,
        selectedColor: palette.surfaceHover,
        disabledColor: palette.surfaceHover.withValues(alpha: 0.6),
        side: BorderSide(color: palette.borderSolid),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(palette.radiusBase),
        ),
        labelStyle: _monoStyle(
          color: palette.textPrimary,
          size: 11,
          weight: FontWeight.w500,
        ),
        secondaryLabelStyle: _monoStyle(
          color: palette.textPrimary,
          size: 11,
          weight: FontWeight.w500,
        ),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: palette.semInfo,
        circularTrackColor: palette.surfaceHover,
        linearTrackColor: palette.surfaceHover,
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: palette.textPrimary,
        inactiveTrackColor: palette.borderDashed,
        thumbColor: palette.textPrimary,
        overlayColor: palette.textPrimary.withValues(alpha: 0.08),
      ),
      listTileTheme: ListTileThemeData(
        tileColor: palette.surface,
        selectedTileColor: palette.surfaceHover,
        iconColor: palette.textSecondary,
        textColor: palette.textPrimary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(palette.radiusBase),
          side: BorderSide(color: palette.borderSolid),
        ),
      ),
      splashFactory: NoSplash.splashFactory,
    );
  }

  static TextTheme _textTheme(SpatialPalette palette) {
    return TextTheme(
      displayLarge: _sansStyle(
        color: palette.textPrimary,
        size: 40,
        weight: FontWeight.w700,
        height: 1.1,
      ),
      headlineLarge: _sansStyle(
        color: palette.textPrimary,
        size: 32,
        weight: FontWeight.w700,
        height: 1.15,
      ),
      headlineMedium: _sansStyle(
        color: palette.textPrimary,
        size: 24,
        weight: FontWeight.w700,
        height: 1.2,
      ),
      titleLarge: _sansStyle(
        color: palette.textPrimary,
        size: 20,
        weight: FontWeight.w700,
      ),
      titleMedium: _sansStyle(
        color: palette.textPrimary,
        size: 16,
        weight: FontWeight.w600,
      ),
      bodyLarge: _sansStyle(color: palette.textPrimary, size: 14),
      bodyMedium: _sansStyle(color: palette.textPrimary, size: 14),
      bodySmall: _sansStyle(color: palette.textSecondary, size: 12),
      labelLarge: _monoStyle(
        color: palette.textPrimary,
        size: 12,
        weight: FontWeight.w700,
      ),
      labelMedium: _monoStyle(
        color: palette.textSecondary,
        size: 11,
        weight: FontWeight.w500,
      ),
      labelSmall: _monoStyle(
        color: palette.textSecondary,
        size: 10,
        weight: FontWeight.w500,
      ),
    );
  }

  static TextStyle _sansStyle({
    required Color color,
    required double size,
    FontWeight weight = FontWeight.w400,
    double? height,
  }) {
    return TextStyle(
      color: color,
      fontSize: size,
      fontWeight: weight,
      height: height,
      fontFamily: SpatialDesignTokens.fontSans,
      fontFamilyFallback: SpatialDesignTokens.fontSansFallback,
    );
  }

  static TextStyle _monoStyle({
    required Color color,
    required double size,
    FontWeight weight = FontWeight.w400,
  }) {
    return TextStyle(
      color: color,
      fontSize: size,
      fontWeight: weight,
      letterSpacing: 0.3,
      fontFamily: SpatialDesignTokens.fontMono,
      fontFamilyFallback: SpatialDesignTokens.fontMonoFallback,
    );
  }

  static OutlineInputBorder _outlineBorder(Color color, double radius) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(radius),
      borderSide: BorderSide(color: color, width: 1),
    );
  }
}
