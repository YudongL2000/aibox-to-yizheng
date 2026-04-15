class PreventReClickUtil {
  static final int _MIN_DELAY_TIME = 1000; // 两次点击间隔不能少于1000ms
  static DateTime? _lastClickTime;

  static bool isFastClick() {
    bool flag = true;
    DateTime currentClickTime = DateTime.now();
    if (_lastClickTime == null ||
        DateTime.now().difference(_lastClickTime!) >
            Duration(milliseconds: _MIN_DELAY_TIME)) {
      flag = false;
      _lastClickTime = currentClickTime;
    }
    return flag;
  }

  static Function fastClick = (Function function) {
    if (isFastClick()) return;
    function();
  };
}
