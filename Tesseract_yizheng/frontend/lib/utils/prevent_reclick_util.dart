class PreventReClickUtil {
  PreventReClickUtil._();

  static const String _globalKey = 'global';
  static const Duration _minDelay = Duration(milliseconds: 1000);

  static final Map<String, DateTime> _lastClickTimes = <String, DateTime>{};
  static final Set<String> _activeKeys = <String>{};

  static bool isFastClick({
    String key = _globalKey,
    Duration minDelay = _minDelay,
  }) {
    if (_activeKeys.contains(key)) {
      return true;
    }
    final now = DateTime.now();
    final lastClickTime = _lastClickTimes[key];
    if (lastClickTime == null || now.difference(lastClickTime) >= minDelay) {
      _lastClickTimes[key] = now;
      return false;
    }
    return true;
  }

  static bool tryEnter({
    String key = _globalKey,
    Duration minDelay = _minDelay,
  }) {
    if (isFastClick(key: key, minDelay: minDelay)) {
      return false;
    }
    _activeKeys.add(key);
    return true;
  }

  static void release({String key = _globalKey}) {
    _activeKeys.remove(key);
  }

  static void reset({String? key}) {
    if (key == null) {
      _lastClickTimes.clear();
      _activeKeys.clear();
      return;
    }
    _lastClickTimes.remove(key);
    _activeKeys.remove(key);
  }

  static Future<void> guard(
    Future<void> Function() action, {
    String key = _globalKey,
    Duration minDelay = _minDelay,
  }) async {
    if (!tryEnter(key: key, minDelay: minDelay)) {
      return;
    }
    try {
      await action();
    } finally {
      release(key: key);
    }
  }
}
