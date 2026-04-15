import 'package:aitesseract/module/login/ui/splash_page.dart';
import 'package:aitesseract/utils/cache/cache_manager.dart';
import 'package:flutter/material.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // 预先初始化SharedPreferences
  await HXCache.preInit();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(1920, 1080),
      minTextAdapt: false,
      splitScreenMode: false,
      builder: (context, child) {
        return MaterialApp(
          title: 'MAGI CORE',
          theme: ThemeData(
            colorScheme: ColorScheme.dark(
              primary: const Color(0xFF00D9FF),
              surface: const Color(0xFF0A0E1A),
              background: const Color(0xFF0A0E1A),
            ),
            useMaterial3: true,
          ),
          home: const SplashPage(),
          debugShowCheckedModeBanner: false,
          builder: EasyLoading.init(),
        );
      },
    );
  }
}
