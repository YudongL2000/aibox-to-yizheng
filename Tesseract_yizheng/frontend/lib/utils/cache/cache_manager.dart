import 'dart:convert';

import 'package:aitesseract/module/login/model/login_model.dart';
import 'package:aitesseract/utils/cache/user_data.dart';
import 'package:aitesseract/utils/import/web_work.dart'
    if (dart.library.html) 'package:aitesseract/utils/import/web_work.dart'
    if (dart.library.io) 'package:aitesseract/utils/import/native_work.dart'
    as platformDeal;
import 'package:aitesseract/webView/hx_web_observe_instance.dart';
import 'package:flutter/cupertino.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HXCache {
  static final String CITYS_INFO = "CITYS_INFO";
  static final String autoLogin = "autoLogin";
  static final String TOKEN_KEY = "auth_token";
  static final String N8N_COOKIE_KEY = "n8n_cookie";
  static final String N8N_SET_COOKIES_KEY = "n8n_set_cookies";
  SharedPreferences? _preferences;

  HXCache._() {
    init();
  }

  static HXCache? _instance;

  HXCache._pre(SharedPreferences preferences) {
    this._preferences = preferences;
  }

  // 预先初始化
  static Future<HXCache> preInit() async {
    if (_instance == null) {
      var prefs = await SharedPreferences.getInstance();
      _instance = HXCache._pre(prefs);
      // if (hour < 10) {
      //   HXCache.instance.removeUser();
      //   HXCache.instance.clear();
      //   ImManager.instance.loginOut();
      //   platformDeal.localStorageClear();
      // }
      platformDeal.addAddress();
    }
    return _instance!;
  }

  static HXCache get instance {
    if (_instance == null) {
      _instance = HXCache._();
    }

    return _instance!;
  }

  init() async {
    if (_preferences == null) {
      _preferences = await SharedPreferences.getInstance();
    }
    readyLogin.value = false;
  }

  saveCurrentRouter({required String value}) {
    if (_preferences != null) {
      _preferences!.setString("[CLY]_view", value);
    }
  }

  SetString(String? key, String? value) {
    if (_preferences != null) {
      _preferences!.setString(key!, value!);
    }
  }

  SetBool(String key, bool value) {
    _preferences!.setBool(key, value);
  }

  SetDouble(String key, double value) {
    _preferences!.setDouble(key, value);
  }

  SetInt(String key, int value) {
    _preferences!.setInt(key, value);
  }

  SetStringList(String key, List<String> value) {
    _preferences!.setStringList(key, value);
  }

  clear() {
    _preferences!.clear();
  }

  bool? getBool(String key) {
    if (_preferences != null) {
      return _preferences?.getBool(key);
    } else {
      return false;
    }
  }

  String? getString(String key) {
    if (_preferences != null) {
      return _preferences?.getString(key);
    } else {
      return null;
    }
  }

  List<String>? getStringList(String key) {
    if (_preferences != null) {
      return _preferences?.getStringList(key);
    } else {
      return null;
    }
  }

  Object get<T>(String? key) {
    if (_preferences != null) {
      return _preferences!.get(key!) ?? "";
    } else {
      return "";
    }
  }

  ValueNotifier<bool> readyLogin = ValueNotifier<bool>(false);

  storeUserInfo(LoginModel userModel) {
    HXWebObserveInstance().clearObserve();
    Map<String, dynamic> cacheMap = userModel.toJson();
    _instance!.SetString("user_info", jsonEncode(cacheMap));
    platformDeal.storeUserInfo(userModel);
    readyLogin.value = true;
  }

  saveSignPatientInfo(String patientInfo) {
    if (_preferences != null) {
      var signPatientInfo = getSignPatientInfo();
      signPatientInfo?.add(patientInfo);
      _preferences!.setStringList("signPatientInfo", signPatientInfo ?? []);
    }
  }

  List<String>? getSignPatientInfo() {
    if (_preferences != null) {
      return _preferences!.getStringList("signPatientInfo");
    }
    return [];
  }

  LoginModel? loadUserInfo() {
    String infoString = _instance!.get("user_info") as String;
    if (infoString.isEmpty || infoString == 'null') {
      return null;
    }
    Map<String, dynamic> jsonMap = jsonDecode(infoString);
    if (jsonMap.isEmpty) {
      return null;
    }
    LoginModel? userModel = LoginModel.fromJson(jsonMap);
    User.instance.loginModel = userModel;

    readyLogin.value = true;
    return userModel;
  }

  removeUser() {
    _instance!.SetString("user_info", "");
    removeToken();
    readyLogin.value = false;
  }

  /// 保存token
  void saveToken(String token) {
    _instance!.SetString(TOKEN_KEY, token);
  }

  /// 获取token
  String? getToken() {
    return _instance!.getString(TOKEN_KEY);
  }

  /// 删除token
  void removeToken() {
    _instance!.SetString(TOKEN_KEY, "");
  }

  /// 保存n8nCookie
  void saveN8nCookie(String n8nCookie) {
    _instance!.SetString(N8N_COOKIE_KEY, n8nCookie);
  }

  /// 获取n8nCookie
  String? getN8nCookie() {
    return _instance!.getString(N8N_COOKIE_KEY);
  }

  /// 保存n8nSetCookies
  void saveN8nSetCookies(List<String> cookies) {
    _instance!.SetStringList(N8N_SET_COOKIES_KEY, cookies);
  }

  /// 获取n8nSetCookies
  List<String>? getN8nSetCookies() {
    return _instance!.getStringList(N8N_SET_COOKIES_KEY);
  }
}
