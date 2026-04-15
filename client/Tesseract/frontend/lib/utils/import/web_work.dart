// ignore_for_file: avoid_web_libraries_in_flutter
import 'dart:async';
import 'dart:html' as html;
import 'dart:html';
import 'dart:js' if (dart.library.io) '' as js;
import 'dart:math';
import 'dart:ui_web' as ui;

import 'package:aitesseract/module/home/provider/home_provider.dart';
import 'package:aitesseract/module/work_space/provider/work_space_provider.dart';
import 'package:aitesseract/utils/enum_utils/enum_utils.dart';
import 'package:aitesseract/utils/event_bus/event_bus.dart';
import 'package:aitesseract/utils/tools/hx_print.dart';
import 'package:flutter/material.dart';

import '../../module/login/model/login_model.dart';
import '../../module/occured/his_webview_page.dart';

void doSomething() {}

void setSession() {}

void addAddress() {}

void storeUserInfo(LoginModel userModel) {}

void setToken() {}

Widget getWebViewWidget(
  String url, {
  bool? needTimeStamp,
  bool? useIframe,
  Function? callBack,
  Function? jumpCallBack,
  Function? backCallBack,
  Function? imJumpCallBack,
  Function? createCallBack,
  Function? jumpIndexCallBack,
  Function? showWindowCallBack,
}) {
  if (useIframe == true) {
    return HisWebViewPageWidget(
      src: url,
      jumpCallBack: jumpCallBack,
      imJumpCallBack: imJumpCallBack,
      createCallBack: createCallBack,
      callBack: callBack,
      needRefresh: needTimeStamp,
      jumpIndexCallBack: jumpIndexCallBack,
      showWindowCallBack: showWindowCallBack,
    );
  }

  return WebViewForWebUtil().initWebView(
    url,
    callBack: callBack,
    jumpCallBack: jumpCallBack,
    backCallBack: backCallBack,
    imJumpCallBack: imJumpCallBack,
    needTimeStamp: true,
  );
}

void onPressed(String path) {
  final url = path;
  html.window.open(url, "_blank");
  html.Url.revokeObjectUrl(url);
}

void onTap(String url) {
  html.window.open(url, "_blank");
  html.Url.revokeObjectUrl(url);
}

void localStorageClear() {
  window.localStorage.clear();
}

void cardSwipe(
  WorkSpaceProvider dataProvider,
  HomeProvider homeProvider,
  BuildContext context,
) {
  js.context.callMethod('readCard');
}

Future? sendMessage(String? content, Map<String, dynamic>? dataMap) {
  editWebViewKey.currentState!.sendMessage("edit", {
    "editContent": content,
    "type": "view",
  });
  return null;
}

Future? sendMessageSubmit(String? content, Map<String, dynamic>? dataMap) {
  editWebViewKey.currentState!.sendMessage("submit", {
    "editContent": content,
    "type": "view",
  });
  return null;
}

GlobalKey<_WebViewForEditWebState> editWebViewKey = GlobalKey();

GlobalKey<_WebViewForEditWebState> getGlobalKey() {
  return editWebViewKey;
}

class WebViewForWebUtil {
  Widget? webViews;
  bool isRequest = false;

  // 定义一个数据流
  StreamController<Map> _getInterStatusStreamController =
      StreamController.broadcast();

  // 返回数据得监听
  Stream<Map> getMessageDataStream() {
    return _getInterStatusStreamController.stream;
  }

  senDMsg(String? types, Map<String, dynamic>? dataMap) {
    Map data = {"type": types ?? "submit", "data": dataMap};
    html.IFrameElement? datas =
        document.getElementById("webview_edit") as html.IFrameElement?;
    if (datas!.contentWindow == null) return;
    datas.contentWindow!.postMessage(data, "*");
  }

  Widget initWebView(
    String url, {
    bool? needTimeStamp,
    Function? callBack,
    Function? jumpCallBack,
    Function? backCallBack,
    Function? imJumpCallBack,
    bool? isHis,
  }) {
    String finalUrl = "";
    if (needTimeStamp == true) {
      if (url.contains("?") == false) {
        finalUrl = '$url?time=${DateTime.now().millisecondsSinceEpoch}';
      } else {
        finalUrl = '$url&time=${DateTime.now().millisecondsSinceEpoch}';
      }
    } else {
      finalUrl = url;
    }
    isRequest = false;
    print("加载的url is $finalUrl");
    html.IFrameElement _element = html.IFrameElement()
      ..style.border = 'none'
      ..style.width = '100%'
      ..style.height = '100%'
      ..id = isHis == true ? 'isHis' : 'webView'
      ..src = finalUrl;
    final container = html.DivElement()..append(_element);
    // ignore:undefined_prefixed_name
    ui.platformViewRegistry.registerViewFactory(
      isHis == true ? 'isHis' : finalUrl,
      (int viewId) => isHis == true ? container : _element,
    );

    EventListener receiveMsg = (event) {
      var data = (event as html.MessageEvent).data;
      if (data is Map) {
        _getInterStatusStreamController.add(data);
        var formData = data["type"] ?? "";

        if (formData == "formData") {
          print("收到的回调内容$data");
          if (isRequest == false) {
            isRequest = true;
            // callBack?.call(data);

            return;
          } else {
            return;
          }
        }
        if (data['data']["refrensh"] == "token") {
          if (isRequest == false) {
            isRequest = true;
            // callBack?.call(data["data"]);

            return;
          }
        }
      }
    };
    window.removeEventListener("message", receiveMsg);
    window.addEventListener("message", receiveMsg);

    // 签约管理刷新服务包执行
    js.context["refreshTask"] = (data) {
      print("data is $data");
      if (data["type"] == 1) {
        eventBus.fire(
          EventFn(EventType.Patients, actionType: ActionType.Plan_Execute),
        );
      } else if (data["type"] == 2) {
        eventBus.fire(
          EventFn(EventType.PatientInfo, actionType: ActionType.Refresh_Info),
        );
      } else if (data["type"] == 3) {
        eventBus.fire(
          EventFn(EventType.PatientInfo, actionType: ActionType.Refresh_Menu),
        );
      }
    };

    return Container(
      child: SizedBox(
        width: max((window.innerWidth ?? 0).toDouble(), 1920),
        height: max((window.innerHeight ?? 0).toDouble(), 1080),
        child: HtmlElementView(
          viewType: isHis == true ? 'isHis' : finalUrl,
          key: ValueKey(finalUrl),
        ),
      ),
    );
  }
}

WebViewForEditWeb getWebViewForEditWeb(Function? callBack, String webUrl) {
  return WebViewForEditWeb(
    key: getGlobalKey(),
    webUrl: webUrl,
    callBack: callBack,
  );
}

class WebViewForEditWeb extends StatefulWidget {
  final String? webUrl;
  final Function? callBack;
  final bool? isMedia;
  final bool? isDrug;
  final Map<String, dynamic>? postData;

  const WebViewForEditWeb({
    Key? key,
    this.webUrl,
    this.isDrug,
    this.callBack,
    this.postData,
    this.isMedia,
  }) : super(key: key);

  @override
  _WebViewForEditWebState createState() => _WebViewForEditWebState();
}

class _WebViewForEditWebState extends State<WebViewForEditWeb> {
  late html.IFrameElement _element;
  late EventListener receiveMsg;

  @override
  void initState() {
    super.initState();
    initEventListen();
  }

  Future sendMessage(String? types, Map<String, dynamic>? dataMap) async {
    Map data = {"type": types ?? "submit", "data": dataMap};
    html.IFrameElement? datas =
        document.getElementById("webview_edit") as html.IFrameElement?;
    if (datas == null || datas.contentWindow == null) return;
    datas.contentWindow!.postMessage(data, "*");
  }

  initEventListen() {
    receiveMsg = (event) {
      Map data = (event as html.MessageEvent).data;
      HXPrint("data获取数据啦 $data");
      var formData = data["type"];
      if (formData == "formData") {
        widget.callBack?.call(data["data"]);
      }
    };
    window.removeEventListener("message", receiveMsg);
    window.addEventListener("message", receiveMsg);
  }

  // 当前组件取消挂载的时候 取消message事件的绑定
  @override
  void dispose() {
    window.removeEventListener("message", receiveMsg);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    String iFrameUrl = "";
    if (widget.isDrug == true) {
      iFrameUrl =
          '${widget.webUrl}?time=${DateTime.now().millisecondsSinceEpoch}';
    } else {
      iFrameUrl =
          '${widget.webUrl}&time=${DateTime.now().millisecondsSinceEpoch}';
    }
    _element = html.IFrameElement()
      ..style.border = 'none'
      ..style.width = '100%'
      ..style.height = '100%'
      ..id = "webview_edit"
      ..src = "$iFrameUrl";

    // ignore:undefined_prefixed_name
    ui.platformViewRegistry.registerViewFactory(
      "$iFrameUrl",
      (int viewId) => _element,
    );

    return Scaffold(
      body: Container(
        child: HtmlElementView(
          viewType: "$iFrameUrl",
          onPlatformViewCreated: (formViewId) {},
        ),
      ),
    );
  }
}
