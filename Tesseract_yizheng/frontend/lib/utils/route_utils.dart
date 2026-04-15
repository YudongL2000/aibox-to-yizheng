import 'package:aitesseract/module/login/ui/login_page_new.dart';
import 'package:aitesseract/utils/cache/cache_manager.dart';
import 'package:aitesseract/utils/hx_navigator.dart';
import 'package:flutter/material.dart';

class RouteUtils {
  /// 跳转页面
  static push(BuildContext context, Widget page, {Function? callBack}) async {
    final result =
        await Navigator.push(context, NoAnimRouter(page)).then((value) {
      callBack?.call(value);
    });
    return result;
  }

  static pushReplaceTagPage(BuildContext context, Widget page) {
    Navigator.of(context).pushReplacement(NoAnimRouter(page));
  }

  ///跳转到起始页并关闭所有页面
  static pushClearTop(BuildContext context, Widget page) {
    Navigator.pushAndRemoveUntil(
      context,
      new NoAnimRouter(page),
      (Route<dynamic> route) => false,
    );
  }

  /// 跳转页面
  static pushNamed(
    BuildContext context,
    String routeName, {
    Object? arguments,
  }) {
    Navigator.pushNamed(context, routeName, arguments: arguments);
  }
}

//无动画
class NoAnimRouter<T> extends PageRouteBuilder<T> {
  final Widget page;

  NoAnimRouter(this.page)
      : super(
            opaque: false,
            pageBuilder: (context, animation, secondaryAnimation) => page,
            transitionDuration: Duration(milliseconds: 0),
            transitionsBuilder:
                (context, animation, secondaryAnimation, child) => child);
}

class HXRouterInformationParser extends RouteInformationParser<HXRouterPath> {
  @override
  Future<HXRouterPath> parseRouteInformation(
      RouteInformation routeInformation) async {
    final url = Uri.parse(routeInformation.location!);
    if (url.pathSegments.length == 0) {
      return HXRouterPath.home();
    }
    return HXRouterPath.detail();
  }

  @override
  RouteInformation? restoreRouteInformation(HXRouterPath configuration) {
    // web场景下url的hash
    return RouteInformation(location: configuration.location);
  }
}

class HXRouterPath {
  final String? location;

  HXRouterPath.home() : location = "/";

  HXRouterPath.detail() : location = "/detail";
}

class HXRouteDelegate extends RouterDelegate<HXRouterPath>
    with ChangeNotifier, PopNavigatorRouterDelegateMixin {
  final GlobalKey<NavigatorState> navigationKey;

  HXRouteDelegate() : navigationKey = GlobalKey<NavigatorState>() {
    HXNavigator.getInstance().registerRouteJump(jumpListener:
        RouteJumpListener(onJumpTo: ({HXPageRouteStatus? status, Map? args}) {
      _routeStatus = status!;
      // 此处分发args
      notifyListeners();
    }));
  }

  HXPageRouteStatus _routeStatus = HXPageRouteStatus.Login;

  HXPageRouteStatus get routeStatus {
    if (_routeStatus != HXPageRouteStatus.Login &&
        HXCache.instance.loadUserInfo() == null) {
      return HXPageRouteStatus.Login;
    }
    return _routeStatus;
  }

  List<MaterialPage> pageList = [];

  @override
  void addListener(VoidCallback listener) {}

  @override
  GlobalKey<NavigatorState> get navigatorKey {
    return navigationKey;
  }

  @override
  Widget build(BuildContext context) {
    var index = getPageIndex(pages: pageList, status: routeStatus);
    List<MaterialPage> tmpList = pageList;
    if (index != -1) {
      if (index > 1) {
        tmpList = tmpList.sublist(0, index - 1);
      } else {
        tmpList = tmpList.sublist(0, index);
      }
    }
    var page;
    if (routeStatus == HXPageRouteStatus.Home) {
      pageList.clear();
    }
    if (routeStatus == HXPageRouteStatus.Login) {
      pageList.clear();
      page = _pageWarp(LoginPageNew());
    }
    tmpList = [...tmpList, page];
    // 通知路由变化
    HXNavigator.getInstance()
        .notify(currentPageList: tmpList, beforePageList: pageList);
    pageList = tmpList;
    // 构建路由堆栈
    pageList = [
      _pageWarp(
        ValueListenableBuilder<bool>(
          builder: (BuildContext context, bool readyLogin, Widget? child) {
            return LoginPageNew();
          },
          valueListenable: HXCache.instance.readyLogin,
        ),
      )
    ];
    return Navigator(
      key: navigationKey,
      pages: pageList,
      // 出栈的回调
      onPopPage: (route, result) {
        // 是否可以返回上一页
        if (!route.didPop(result)) {
          return false;
        }
        var tmpList = [...pageList];
        pageList.removeLast();
        // 通知路由变化
        HXNavigator.getInstance()
            .notify(currentPageList: tmpList, beforePageList: tmpList);
        return true;
      },
    );
  }

  //直接修改url或者使用浏览器后退、前进时触发
  @override
  Future<void> setNewRoutePath(HXRouterPath configuration) async {}

  // 页面刷新/新开页面时会触发
  @override
  Future<void> setInitialRoutePath(HXRouterPath configuration) {
    return setNewRoutePath(configuration);
  }

  _pageWarp(Widget child) {
    return MaterialPage(key: ValueKey(child.hashCode), child: child);
  }
}
