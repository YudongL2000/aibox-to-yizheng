import 'package:flutter/material.dart';

typedef RouteChangeListener(
    {RouteStatusInfo currentInfo, RouteStatusInfo? beforeStatusInfo});

pageWarp(Widget child) {
  return MaterialPage(key: ValueKey(child.hashCode), child: child);
}

enum HXPageRouteStatus { Login, Home, Other }

HXPageRouteStatus getRouteStatus({required MaterialPage page}) {
  return HXPageRouteStatus.Other;
}

int getPageIndex(
    {required List<MaterialPage> pages, required HXPageRouteStatus status}) {
  for (int i = 0; i < pages.length; i++) {
    if (getRouteStatus(page: pages[i]) == status) {
      return i;
    }
  }
  return -1;
}

class RouteStatusInfo {
  final HXPageRouteStatus? status;
  final Widget? page;

  RouteStatusInfo({this.status, this.page});
}

class HXNavigator extends _RouteJumpListener {
  static HXNavigator? _instance;

  HXNavigator._();

  static HXNavigator getInstance() {
    if (_instance == null) {
      _instance = HXNavigator._();
    }
    return _instance!;
  }

  RouteJumpListener? _routeJump;
  List<RouteChangeListener?> _listenerList = [];
  RouteStatusInfo? _currentPageInfo;

  @override
  void onJumpTo({HXPageRouteStatus? status, Map? args}) {
    _routeJump?.onJumpTo(status: status, args: args);
  }

  void registerRouteJump({required RouteJumpListener jumpListener}) {
    _routeJump = jumpListener;
  }

  void addListener({RouteChangeListener? listener}) {
    if (!_listenerList.contains(listener)) {
      _listenerList.add(listener);
    }
  }

  void removeListener({RouteChangeListener? listener}) {
    if (_listenerList.contains(listener)) {
      _listenerList.remove(listener);
    }
  }

  void notify(
      {required List<MaterialPage> currentPageList,
      required List<MaterialPage> beforePageList}) {
    if (currentPageList == beforePageList) {
      return;
    } else {
      var current = RouteStatusInfo(
          status: getRouteStatus(page: currentPageList.last),
          page: currentPageList.last.child);
      _notify(currentInfo: current);
    }
  }

  _notify({required RouteStatusInfo currentInfo}) {
    _listenerList.forEach((listener) {
      listener?.call(
          currentInfo: currentInfo, beforeStatusInfo: _currentPageInfo);
    });
    _currentPageInfo = currentInfo;
  }
}

abstract class _RouteJumpListener {
  void onJumpTo({HXPageRouteStatus? status, Map? args});
}

typedef OnJumpTo = void Function({HXPageRouteStatus? status, Map? args});

class RouteJumpListener {
  final OnJumpTo onJumpTo;

  RouteJumpListener({required this.onJumpTo});
}
