/*
 * [INPUT]: 依赖 HttpRequest 的统一请求封装和 HttpConfig_Login 的接口路径常量。
 * [OUTPUT]: 对外提供 LoginResponseData 和 LoginApi，负责密码登录与用户信息拉取。
 * [POS]: server/api 的登录服务层，把 UI 输入的账号密码折叠成后端请求。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:aitesseract/server/Http_config.dart';
import 'package:aitesseract/server/Http_request.dart';

/// 登录响应数据模型
class LoginResponseData {
  final String token;
  final String n8nCookie;
  final List<String> n8nSetCookies;

  LoginResponseData({
    required this.token,
    required this.n8nCookie,
    required this.n8nSetCookies,
  });

  factory LoginResponseData.fromJson(Map<String, dynamic> json) {
    return LoginResponseData(
      token: json['token'] ?? '',
      n8nCookie: json['n8nCookie'] ?? '',
      n8nSetCookies: json['n8nSetCookies'] != null
          ? List<String>.from(json['n8nSetCookies'])
          : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'n8nCookie': n8nCookie,
      'n8nSetCookies': n8nSetCookies,
    };
  }
}

/// 登录API服务
class LoginApi {
  /// 密码登录
  /// 使用 HttpRequest 统一调用，账号密码来自调用方输入
  /// 登录接口返回 code 为 "0" 或 success 为 true 表示成功
  Future<LoginResponseData?> loginWithPassword({
    required String username,
    required String password,
  }) async {
    try {
      final response = await HttpRequest.request(
        HttpConfig_Login.requestLoginDataPwd,
        method: "post",
        params: {"username": username, "password": password},
      );

      if (response != null && response is Map<String, dynamic>) {
        final responseMap = response;
        // 检查 code 是否为 "0" 或 success 为 true
        final code = responseMap['code'];
        final success = responseMap['success'] == true;
        final isSuccess = (code == "0" || code == 0) || success;

        if (isSuccess) {
          final data = responseMap['data'];
          if (data != null && data is Map<String, dynamic>) {
            return LoginResponseData.fromJson(data);
          }
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// 根据token获取用户信息
  /// 使用HttpRequest统一调用
  Future<Map<String, dynamic>?> getUserInfo() async {
    try {
      final response = await HttpRequest.request(
        HttpConfig_Login.requestLoginData,
        method: "get",
        params: {},
      );

      if (response != null && response is Map<String, dynamic>) {
        final responseMap = response;
        // 检查 code 是否为 "0" 或 success 为 true
        final code = responseMap['code'];
        final success = responseMap['success'] == true;
        final isSuccess = (code == "0" || code == 0) || success;

        if (isSuccess) {
          final data = responseMap['data'];
          if (data != null && data is Map<String, dynamic>) {
            return data;
          }
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
