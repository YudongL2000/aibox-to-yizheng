/**
 * [INPUT]: 依赖 Web iframe、事件总线、Provider 模型与浏览器 API。
 * [OUTPUT]: 对外提供 WebViewForWebUtilHis，负责 HIS Web 页面嵌入与消息桥接。
 * [POS]: utils/import 的 Web 专用桥接器，属于历史页面集成层，不应继续引入新的状态依赖。[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

// ignore_for_file: avoid_web_libraries_in_flutter
import 'dart:async';
import 'dart:convert';
import 'dart:html' as html;
import 'dart:html';
import 'dart:js' if (dart.library.io) '' as js;
import 'dart:math';
import 'dart:ui' as ui;

import 'package:aitesseract/module/home/provider/home_provider.dart';
import 'package:aitesseract/module/work_space/model/work_space_model.dart';
import 'package:aitesseract/module/work_space/provider/work_space_provider.dart';
import 'package:aitesseract/utils/enum_utils/enum_utils.dart';
import 'package:aitesseract/utils/event_bus/event_bus.dart';
import 'package:aitesseract/utils/tools/hx_print.dart';
import 'package:aitesseract/webView/hx_web_observe_instance.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
// import 'package:webviewx/webviewx.dart'; // 暂时注释，Web平台使用iframe

import '../../module/home/model/home_index.dart';
import '../../module/login/model/login_model.dart';
import '../../module/work_space/model/work_space_search_result_model.dart';
import '../../server/Http_config.dart';
import '../cache/user_data.dart';

const String viewType = 'isHis';

class WebViewForWebUtilHis {
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
      bool? isHis}) {
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
      ..id = viewType
      ..src = finalUrl;
    final container = html.DivElement()..append(_element);
    // ignore:undefined_prefixed_name
    ui.platformViewRegistry
        .registerViewFactory(viewType, (int viewId) => container);

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
        child: SizedBox(
      width: max((window.innerWidth ?? 0).toDouble(), 1920),
      height: max((window.innerHeight ?? 0).toDouble(), 1080),
      child: HtmlElementView(
        key: ValueKey(finalUrl),
        viewType: viewType,
        onPlatformViewCreated: (formViewId) {
          createCallBack?.call();
        },
      ),
    ));
  }
}
