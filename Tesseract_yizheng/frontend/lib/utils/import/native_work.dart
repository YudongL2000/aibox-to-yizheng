import 'package:flutter/material.dart';

import '../../module/login/model/login_model.dart';

void doSomething() {}

void setSession() {}

void storeUserInfo(LoginModel userModel) {}

void setToken() {}

void addAddress() {}

Widget getWebViewWidget(String url,
    {bool? needTimeStamp,
    Function? callBack,
    Function? jumpCallBack,
    Function? backCallBack,
    Function? imJumpCallBack,
    Function? createCallBack,
    bool? isHis,
    bool? useIframe,
    bool? isSignManagement}) {
  // WebViewXController? controllers; // 暂时注释
  print(url);

  // TODO: 迁移到 webview_flutter 4.x API
  return Container(
    child: Center(
      child: Text('WebView 需要迁移到 webview_flutter 4.x'),
    ),
  );
  /* 暂时注释，等待迁移
  return Container(
    child: WebViewX(
      key: ValueKey(url),
      initialSourceType: SourceType.url,
      onPageFinished: (value) {
        if (url.contains("webhis_index.html")) {
          // controllers?.evalRawJavascript("document.querySelector('html').style = '--vir-font-default: 36px; --vir-font-important:30px; --vir-font-secondary:32px;'");
        }
      },
      onWebViewCreated: (controller) => {
        controllers = controller,
        controller.loadContent(
          "${url}&env=${EnvironmentUtils.currentEnvironment}",
          SourceType.url,
        ),
      },
      dartCallBacks: {
        DartCallback(
            name: 'sendFormMessage',
            callBack: (data) async => {callBack!(data)}),
        DartCallback(
          name: 'functionJump',
          callBack: (data) => {jumpCallBack!(data)},
        ),
        DartCallback(
          name: 'functionJumpx',
          callBack: (data) => {print("==================${data}")},
        ),
        DartCallback(
          name: 'refreshTask',
          callBack: (data) => {
            // 签约管理刷新服务包执行
            if (data["type"] == 1)
              {
                eventBus.fire(EventFn(EventType.Patients,
                    actionType: ActionType.Plan_Execute)),
              }
            else if (data["type"] == 2)
              {
                eventBus.fire(EventFn(EventType.PatientInfo,
                    actionType: ActionType.Refresh_Info)),
              }
            else if (data["type"] == 3)
              {
                eventBus.fire(EventFn(EventType.PatientInfo,
                    actionType: ActionType.Refresh_Menu)),
              }
          },
        ),
        DartCallback(
          name: 'setTab',
          callBack: (data) => {
            jsonData = jsonDecode(data),
            // multiPatientModelEntity = MultiPatientModelEntity.fromJson(jsonData),
            // eventBus.fire(EventFn(EventType.SignManagement,
            //     actionType: ActionType.MULTI_PATIENT_INFO,
            //     data: multiPatientModelEntity))
          },
        ),
      },
      height: 1080.h,
      width: 1920.w,
    ),
  );
  */
}

void onPressed(String path) {}

void onTap(String url) {}

void localStorageClear() {}

Future? sendMessage(String? content, Map<String, dynamic>? dataMap) {
  return null;
}

GlobalKey ditWebViewKey = GlobalKey();

Future? sendMessageSubmit(String? content, Map<String, dynamic>? dataMap) {
  return null;
}

Widget getWebViewForEditWeb(Function? callBack, String webUrl) {
  return Container();
}

GlobalKey getGlobalKey() {
  return GlobalKey();
}
