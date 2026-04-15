/*
 * [INPUT]: 依赖 HXCache 的本地会话、LoginApi 的用户鉴权能力、Uri.base 查询参数与 HomeMainPage/HomeWorkspacePage 跳转目标。
 * [OUTPUT]: 对外提供 SplashPage 启动判流页，负责缓存初始化、登录判定，并把常规启动默认导向以 Digital Twin 为主视图的工作台；本地嵌入入口继续直达单画布数字孪生，同时保持加载态主题色来自运行时 SpatialThemeData。
 * [POS]: module/login/ui 的启动入口，处于 App 首屏位置，向下分发到登录页、首页或数字孪生工作台。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:aitesseract/module/home/home_workspace_page.dart';
import 'package:aitesseract/module/home/home_main_page.dart';
import 'package:aitesseract/module/login/model/login_model.dart';
import 'package:aitesseract/module/login/ui/login_page_new.dart';
import 'package:aitesseract/server/api/login_api.dart';
import 'package:aitesseract/utils/cache/cache_manager.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:flutter/material.dart';

/// 启动页面 - 判断token并决定跳转
/// 临时：设为 true 可绕过登录验证
const bool _kSkipLogin = bool.fromEnvironment(
  'SKIP_LOGIN',
  defaultValue: false,
);

enum _LaunchTargetKind { home, digitalTwin }

class _LaunchTarget {
  final _LaunchTargetKind kind;
  final String? promptText;
  final HomeWorkspaceInitialSurface initialSurface;

  const _LaunchTarget._(
    this.kind, {
    this.promptText,
    this.initialSurface = HomeWorkspaceInitialSurface.digitalTwin,
  });

  const _LaunchTarget.home() : this._(_LaunchTargetKind.home);

  const _LaunchTarget.digitalTwin({
    String? promptText,
    HomeWorkspaceInitialSurface initialSurface =
        HomeWorkspaceInitialSurface.digitalTwin,
  }) : this._(
          _LaunchTargetKind.digitalTwin,
          promptText: promptText,
          initialSurface: initialSurface,
        );

  bool get opensDigitalTwin => kind == _LaunchTargetKind.digitalTwin;
}

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
  }

  /// 检查登录状态
  Future<void> _checkLoginStatus() async {
    await Future.delayed(const Duration(milliseconds: 300));
    await HXCache.instance.init();
    final launchTarget = _resolveLaunchTarget();

    if (_shouldOpenEmbeddedDigitalTwinWithoutLogin(launchTarget)) {
      if (mounted) {
        _navigateToLaunchTarget(launchTarget);
      }
      return;
    }

    if (_kSkipLogin) {
      if (mounted) {
        _navigateToLaunchTarget(launchTarget);
      }
      return;
    }

    final token = HXCache.instance.getToken();
    if (token != null && token.isNotEmpty) {
      await _getUserInfoAndNavigate(launchTarget);
    } else {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginPageNew()),
        );
      }
    }
  }

  /// 获取用户信息并跳转
  Future<void> _getUserInfoAndNavigate(_LaunchTarget launchTarget) async {
    try {
      final loginApi = LoginApi();
      final userInfo = await loginApi.getUserInfo();

      if (userInfo != null) {
        // 保存用户信息
        final loginModel = LoginModel(userInfo: userInfo);
        HXCache.instance.storeUserInfo(loginModel);

        // 跳转到主页
        if (mounted) {
          _navigateToLaunchTarget(launchTarget);
        }
      } else {
        // 获取用户信息失败，清除token，跳转到登录页
        HXCache.instance.removeToken();
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const LoginPageNew()),
          );
        }
      }
    } catch (e) {
      // 出错，清除token，跳转到登录页
      HXCache.instance.removeToken();
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginPageNew()),
        );
      }
    }
  }

  _LaunchTarget _resolveLaunchTarget() {
    final entry = Uri.base.queryParameters['entry']?.trim().toLowerCase();
    final promptText = _normalizePrompt(Uri.base.queryParameters['prompt']);
    final initialSurface = _resolveWorkspaceSurface(
      Uri.base.queryParameters['surface'],
    );

    if (entry == 'home') {
      return const _LaunchTarget.home();
    }

    if (entry == 'workflow') {
      return _LaunchTarget.digitalTwin(
        promptText: promptText,
        initialSurface: HomeWorkspaceInitialSurface.workflow,
      );
    }

    if (entry == 'digital-twin' || entry == 'workspace') {
      return _LaunchTarget.digitalTwin(
        promptText: promptText,
        initialSurface: initialSurface,
      );
    }

    return _LaunchTarget.digitalTwin(
      promptText: promptText,
      initialSurface: initialSurface,
    );
  }

  bool _shouldOpenEmbeddedDigitalTwinWithoutLogin(_LaunchTarget launchTarget) {
    if (!launchTarget.opensDigitalTwin) {
      return false;
    }

    final source = Uri.base.queryParameters['source']?.trim().toLowerCase();
    if (source != 'aily-blockly') {
      return false;
    }

    final host = Uri.base.host.trim().toLowerCase();
    return host == '127.0.0.1' || host == 'localhost';
  }

  String? _normalizePrompt(String? value) {
    if (value == null) {
      return null;
    }

    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  HomeWorkspaceInitialSurface _resolveWorkspaceSurface(String? value) {
    final normalized = value?.trim().toLowerCase();
    if (normalized == 'workflow') {
      return HomeWorkspaceInitialSurface.workflow;
    }
    return HomeWorkspaceInitialSurface.digitalTwin;
  }

  void _navigateToLaunchTarget(_LaunchTarget launchTarget) {
    final embeddedDigitalTwin =
        _shouldOpenEmbeddedDigitalTwinWithoutLogin(launchTarget);
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) {
          if (launchTarget.opensDigitalTwin) {
            return HomeWorkspacePage(
              promptText: launchTarget.promptText,
              showAssistantPanel: !embeddedDigitalTwin,
              openInDialogueMode: !embeddedDigitalTwin,
              initialSurface: launchTarget.initialSurface,
            );
          }
          return const HomeMainPage();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    final Color accent = spatial.status(SpatialStatusTone.info);

    return Scaffold(
      backgroundColor: spatial.palette.bgBase,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: accent.withValues(alpha: 0.3),
                  width: 2,
                ),
              ),
              child: Icon(
                Icons.account_circle_outlined,
                size: 48,
                color: accent,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'MAGI CORE',
              style: TextStyle(
                color: spatial.palette.textPrimary,
                fontSize: 32,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 48),
            CircularProgressIndicator(
              valueColor:
                  AlwaysStoppedAnimation<Color>(spatial.palette.semInfo),
            ),
          ],
        ),
      ),
    );
  }
}
