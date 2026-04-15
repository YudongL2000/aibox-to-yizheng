import 'dart:async';

class CommonUtils {
  static Function debounce(Function fn, [int t = 300]) {
    Timer? _debounce;
    return () {
      // 还在时间之内，抛弃上一次
      if (_debounce?.isActive ?? false) {
        _debounce?.cancel();
      } else {
        fn();
      }
      _debounce = Timer(Duration(milliseconds: t), () {
        _debounce?.cancel();
        _debounce = null;
      });
    };
  }
}
