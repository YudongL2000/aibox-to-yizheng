class EnvironmentUtils {
  EnvironmentUtils._privateConstructor();

  static final EnvironmentUtils _instance =
      EnvironmentUtils._privateConstructor();

  static EnvironmentUtils get instance {
    return _instance;
  }

  // 调试 iFrame 资源，改为由 dart-define 控制，避免发版前手改源码。
  final bool isLocal = const bool.fromEnvironment(
    'TESSERACT_LOCAL_IFRAME',
    defaultValue: false,
  );

  // 服务器环境
  // 1 dev  2测试  3预发布 4正式
  static const int devEnvironment = 1;
  static const int testEnvironment = 2;
  static const int preEnvironment = 3;
  static const int finalEnvironment = 4;
  static const int _compiledEnvironment = int.fromEnvironment(
    'TESSERACT_ENV',
    defaultValue: finalEnvironment,
  );

  static int get currentEnvironment {
    switch (_compiledEnvironment) {
      case devEnvironment:
      case testEnvironment:
      case preEnvironment:
      case finalEnvironment:
        return _compiledEnvironment;
      default:
        return finalEnvironment;
    }
  }

  bool get isInDebugMode {
    bool inDebugMode = false;
    assert(inDebugMode = true); // 如果debug模式下会触发赋值
    return inDebugMode;
  }
}
