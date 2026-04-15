///
/// create_user: zhengzaihong
/// email:1096877329@qq.com
/// create_date: 2021/11/17
/// create_time: 17:43
/// describe: 文本
///
class TextUtils {
  TextUtils._();
  static bool isEmpty(String? str) {
    return str == null || str.length == 0 || str == "" || str == "null";
  }

  static bool isNotEmpty(String? str) {
    return !isEmpty(str);
  }

  static bool isEmptyObj(Object? obj) {
    return obj == null || obj.toString().length == 0;
  }

  static bool equals(String? a, String? b) {
    if (a == b) return true;
    int length;
    if (a != null && b != null && (length = a.length) == b.length) {
      if (a is String && b is String) {
        return a == b;
      } else {
        for (int i = 0; i < length; i++) {
          if (a.codeUnitAt(i) != b.codeUnitAt(i)) return false;
        }
        return true;
      }
    }
    return false;
  }
}
