import 'dart:async';
import 'dart:convert';
import 'dart:html' as html;
import 'dart:html';
import 'dart:js' if (dart.library.io) '' as js;
import 'dart:ui_web' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';

class HisWebViewPageWidget extends StatefulWidget {
  final String src;
  final Function? callBack;
  final bool? needRefresh;
  final Function? jumpCallBack;
  final Function? imJumpCallBack;
  final Function? backCallBack;
  final Function? createCallBack;
  final Function? showWindowCallBack;
  final Function? jumpIndexCallBack;

  HisWebViewPageWidget(
      {required this.src,
      this.callBack,
      this.jumpIndexCallBack,
      this.showWindowCallBack,
      this.needRefresh,
      this.jumpCallBack,
      this.imJumpCallBack,
      this.backCallBack,
      this.createCallBack});

  @override
  _HisWebViewPageWidgetState createState() => _HisWebViewPageWidgetState();
}

class _HisWebViewPageWidgetState extends State<HisWebViewPageWidget> {
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

  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    String finalUrl = "";
    if (widget.needRefresh == true) {
      if (widget.src.contains("?") == false) {
        finalUrl =
            '${widget.src}?time=${DateTime.now().millisecondsSinceEpoch}';
      } else {
        finalUrl =
            '${widget.src}&time=${DateTime.now().millisecondsSinceEpoch}';
      }
    } else {
      finalUrl = widget.src;
    }
    //ignore: undefined_prefixed_name
    ui.platformViewRegistry.registerViewFactory(finalUrl, (int viewId) {
      IFrameElement _element = IFrameElement()
        ..src = widget.src
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..id = finalUrl;
      final container = html.DivElement()..append(_element);
      return container;
    });
    return Scaffold(
      body: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Expanded(
            child: HtmlElementView(
              key: ValueKey(finalUrl),
              viewType: finalUrl,
              onPlatformViewCreated: (formViewId) {
                widget.createCallBack?.call();
              },
            ),
          ),
        ],
      ),
    );
  }
}
