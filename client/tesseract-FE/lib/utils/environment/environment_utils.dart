class EnvironmentUtils {
  EnvironmentUtils._privateConstructor();

  static final EnvironmentUtils _instance =
      EnvironmentUtils._privateConstructor();

  static EnvironmentUtils get instance {
    return _instance;
  }

  // 调试iFrame资源  本地调试的时候设置为true 发版本的时候设置成false
  bool isLocal = false;

  // 服务器地址
  // 1 dev  2测试  3预发布 4正式

  static int currentEnvironment = 2;

  bool get isInDebugMode {
    bool inDebugMode = false;
    assert(inDebugMode = true); // 如果debug模式下会触发赋值
    return inDebugMode;
  }
}
