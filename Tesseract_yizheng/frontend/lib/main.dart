/*
 * [INPUT]: Flutter app entrypoint, HXCache bootstrap, and shared Spatial theme.
 * [OUTPUT]: Boots the app with Spatial theme mode resolved from the hosting
 * shell query string, so Flutter tokens can follow Electron's current theme.
 * [POS]: frontend root runtime entry for all Flutter surfaces.
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:aitesseract/module/login/ui/splash_page.dart';
import 'package:aitesseract/utils/cache/cache_manager.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:flutter/material.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // 预先初始化SharedPreferences
  await HXCache.preInit();
  runApp(MyApp(themeMode: _resolveThemeMode()));
}

ThemeMode _resolveThemeMode() {
  final String? rawTheme = Uri.base.queryParameters['theme']?.trim();
  switch (rawTheme?.toLowerCase()) {
    case 'light':
      return ThemeMode.light;
    case 'dark':
      return ThemeMode.dark;
    default:
      return ThemeMode.dark;
  }
}

class MyApp extends StatelessWidget {
  const MyApp({
    super.key,
    required this.themeMode,
  });

  final ThemeMode themeMode;

  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(1920, 1080),
      minTextAdapt: false,
      splitScreenMode: false,
      builder: (context, child) {
        return MaterialApp(
          title: 'MAGI CORE',
          theme: SpatialDesignTheme.light(),
          darkTheme: SpatialDesignTheme.dark(),
          themeMode: themeMode,
          home: const SplashPage(),
          debugShowCheckedModeBanner: false,
          builder: EasyLoading.init(),
        );
      },
    );
  }
}
