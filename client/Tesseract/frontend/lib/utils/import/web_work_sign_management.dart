// ignore_for_file: avoid_web_libraries_in_flutter
import 'dart:async';
import 'dart:convert';
import 'dart:html' as html;
import 'dart:html';
import 'dart:js' if (dart.library.io) '' as js;
import 'dart:math';
import 'dart:ui' as ui;

import 'package:aitesseract/utils/enum_utils/enum_utils.dart';
import 'package:aitesseract/utils/event_bus/event_bus.dart';
import 'package:aitesseract/webView/hx_web_observe_instance.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

// const String viewType = 'signManagement';

class WebViewForWebUtilSignManagement {
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

  Widget initWebView(String url,
      {bool? needTimeStamp,
      Function? callBack,
      Function? jumpCallBack,
      Function? backCallBack,
      Function? imJumpCallBack,
      Function? createCallBack,
      bool? isSignManagement}) {
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
      ..id = finalUrl
      ..src = finalUrl;
    var container = html.DivElement()..append(_element);
    // ignore:undefined_prefixed_name
    ui.platformViewRegistry
        .registerViewFactory(finalUrl, (int viewId) => container);

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
      if (data["type"] == 1) {
        eventBus.fire(
            EventFn(EventType.Patients, actionType: ActionType.Plan_Execute));
      } else if (data["type"] == 2) {
        eventBus.fire(EventFn(EventType.PatientInfo,
            actionType: ActionType.Refresh_Info));
      } else if (data["type"] == 3) {
        eventBus.fire(EventFn(EventType.PatientInfo,
            actionType: ActionType.Refresh_Menu));
      }
    };

    return Container(
        key: ValueKey(finalUrl),
        child: SizedBox(
          width: max((window.innerWidth ?? 0).toDouble(), 1920),
          height: max((window.innerHeight ?? 0).toDouble(), 1080),
          child: HtmlElementView(
            key: ValueKey(finalUrl),
            viewType: finalUrl,
            onPlatformViewCreated: (formViewId) {
              createCallBack?.call();
            },
          ),
        ));
  }
}
