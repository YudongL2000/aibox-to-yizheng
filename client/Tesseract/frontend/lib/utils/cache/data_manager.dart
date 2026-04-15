import 'package:shared_preferences/shared_preferences.dart';

class DataManager {
  static saveStr(String key, String value) async {
    SharedPreferences? sp = await SharedPreferences.getInstance();
    sp.setString(key, value);
  }

  static Future<String?> loadStr(String key) async {
    SharedPreferences? sp = await SharedPreferences.getInstance();
    return sp.getString(key);
  }

  static saveBool(String key, bool value) async {
    SharedPreferences sp = await SharedPreferences.getInstance();
    sp.setBool(key, value);
  }

  static Future<bool?> loadBool(String key) async {
    SharedPreferences sp = await SharedPreferences.getInstance();
    return sp.getBool(key);
  }

  static saveInt(String key, int value) async {
    SharedPreferences sp = await SharedPreferences.getInstance();
    sp.setInt(key, value);
  }

  static Future<int?> loadInt(String key) async {
    SharedPreferences sp = await SharedPreferences.getInstance();
    return sp.getInt(key);
  }

  static remove() async {
    var sp = await SharedPreferences.getInstance();
    sp.clear();
  }
}
