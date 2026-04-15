/**
 * [INPUT]: 依赖 Flutter Web 运行时、environment_utils 的环境编号与 dart-define 注入的服务地址。
 * [OUTPUT]: 对外提供 HttpConfig 及相关路径常量，统一暴露业务域名和兼容 getter。
 * [POS]: server 配置入口，给网络层和历史遗留模块提供单一地址出口，避免通过改源码切环境。[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:flutter/foundation.dart';

import '../utils/environment/environment_utils.dart';

class HttpConfig {
  static const String devAddress = String.fromEnvironment(
    'TESSERACT_DEV_BASE_URL',
    defaultValue: 'http://192.168.168.28:9080',
  );
  static const String testAddress = String.fromEnvironment(
    'TESSERACT_TEST_BASE_URL',
    defaultValue: 'http://115.190.195.204:40015',
  );
  static const String preAddress = String.fromEnvironment(
    'TESSERACT_PRE_BASE_URL',
    defaultValue: 'https://health-pre.cd120.info',
  );
  static const String finalAddress = String.fromEnvironment(
    'TESSERACT_FINAL_BASE_URL',
    defaultValue: 'https://health-api.cd120.info',
  );
  static const String agentAddress = String.fromEnvironment(
    'TESSERACT_AGENT_BASE_URL',
    defaultValue: 'http://124.70.111.183:3005',
  );

  static bool get _useWebProxy =>
      kIsWeb &&
      const bool.fromEnvironment('USE_WEB_PROXY', defaultValue: false) &&
      (Uri.base.scheme == 'http' || Uri.base.scheme == 'https');

  static String get _webOrigin => Uri.base.origin;

  static String get _remoteBaseUrl {
    switch (EnvironmentUtils.currentEnvironment) {
      case EnvironmentUtils.devEnvironment:
        return devAddress;
      case EnvironmentUtils.testEnvironment:
        return testAddress;
      case EnvironmentUtils.preEnvironment:
        return preAddress;
      default:
        return finalAddress;
    }
  }

  static String get baseUrl => _useWebProxy ? _webOrigin : _remoteBaseUrl;

  static String get agentBaseUrl =>
      _useWebProxy ? '$_webOrigin/agent-api' : agentAddress;

  static String get apiV1BaseUrl =>
      _useWebProxy ? '$_webOrigin/api/v1' : '$_remoteBaseUrl/api/v1';

  static String get magiBaseUrl =>
      _useWebProxy ? '$_webOrigin/MAGI' : '$_remoteBaseUrl/MAGI';

  // 历史模块仍在引用这两个 getter；先保留兼容层，避免旧代码继续制造红灯。
  static String get baseAdminUrl => baseUrl;
  static String get assetsImgUrl => '$baseUrl/assets/assets/images/';

  static const int timeOut = 200000;
  static String token = '';
}

class HttpConfig_Globe {
  static const String addressUrl = '/resource/dictionary/area/tree'; // 省市区
  static const String getAreaTree = '/base/dic/getAreaTree'; // 全国省市区
}

class HttpConfig_Login {
  static const String getSmsCodeUrl = '/user/auth/sendAuthCode'; // 请求验证码
  static const String requestLoginData =
      '/app/business/auth/user/info'; // 根据token获取用户信息

  static const String requestLoginDataPwd = '/app/business/auth/login'; // 登录
}
