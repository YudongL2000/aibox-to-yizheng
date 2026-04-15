/*
 * [INPUT]: Shared color parsing utility for non-UI layers.
 * [OUTPUT]: Stable conversion helpers that avoid hardcoded UI tokens here.
 * [POS]: utils color utility file, intentionally limited to semantic parsing.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:flutter/material.dart';

class ColorsUtil {
  /// Convert a plain hex integer into a Color.
  /// Example: 0x3ec3cf.
  static Color fromHex(int hex, {double alpha = 1}) {
    final safeAlpha = alpha.clamp(0.0, 1.0);
    return Color.fromRGBO(
      (hex & 0xFF0000) >> 16,
      (hex & 0x00FF00) >> 8,
      (hex & 0x0000FF),
      safeAlpha,
    );
  }

  /// Parse CSS-style hex string.
  /// Supports 6/8-digit values with optional leading '#'.
  static Color? parseColorHex(String? code) {
    if (code == null || code.isEmpty) return null;
    final normalized = code.startsWith('#') ? code.substring(1) : code;
    if (!RegExp(r'^[0-9A-Fa-f]{6,8}$').hasMatch(normalized)) return null;
    final expanded = normalized.length == 6 ? 'FF$normalized' : normalized;
    return Color(int.parse(expanded, radix: 16));
  }
}

extension ThemeNormalColor on Color {
  MaterialColor toMaterialColor() {
    List strengths = <double>[.05];
    Map<int, Color> swatch = <int, Color>{};
    final int r = this.red, g = this.green, b = this.blue;

    for (int i = 1; i < 10; i++) {
      strengths.add(0.1 * i);
    }
    strengths.forEach((strength) {
      final double ds = 0.5 - strength;
      swatch[(strength * 1000).round()] = Color.fromRGBO(
        r + ((ds < 0 ? r : (255 - r)) * ds).round(),
        g + ((ds < 0 ? g : (255 - g)) * ds).round(),
        b + ((ds < 0 ? b : (255 - b)) * ds).round(),
        1,
      );
    });
    return MaterialColor(this.value, swatch);
  }
}
