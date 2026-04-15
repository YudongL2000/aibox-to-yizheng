import 'dart:convert';
import 'dart:core';

import 'package:aitesseract/server/Http_config.dart';
import 'package:aitesseract/server/core/http_error_base.dart';
import 'package:aitesseract/server/core/http_responds.dart';
import 'package:aitesseract/utils/cache/cache_manager.dart';
import 'package:aitesseract/utils/enum_utils/enum_utils.dart';
import 'package:aitesseract/utils/environment/environment_utils.dart';
import 'package:aitesseract/utils/event_bus/event_bus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';

import '../utils/tools/hx_print.dart';

class HttpRequest {
  // 全局配置

  static BaseOptions baseOptions = BaseOptions(
    baseUrl: HttpConfig.baseUrl,
    connectTimeout: HttpConfig.timeOut,
  );
  static Dio dio = Dio(baseOptions);

  static Future<T> request<T>(
    String url, {
    String method = "post",
    Map<String, dynamic>? params,
    Interceptor? inter,
    Map<String, dynamic>? headers,
    Map<String, dynamic>? queryParameters,
  }) async {
    // 获取token，优先使用缓存的token
    final token = HXCache.instance.getToken() ?? "";
    // 如果token不为空，添加Bearer前缀
    final authorization = token.isNotEmpty ? "Bearer $token" : "";

    Options options = Options(
      method: method,
      headers: headers ??
          {
            "Authorization": authorization,
            "organId": HXCache.instance.loadUserInfo()?.toString() ?? "",
          },
      contentType: "application/json",
    );

    var response, error;
    // 判断
    try {
      if (EnvironmentUtils.instance.isInDebugMode) {
        HXPrint(
          "发起 url is $url data is ${jsonEncode(params)},header is ${jsonEncode(options.headers)} queryParams is ${jsonEncode(queryParameters)}",
        );
      }

      response = await dio.request(
        url,
        data: params,
        options: options,
        queryParameters: queryParameters,
      );

      if (EnvironmentUtils.instance.isInDebugMode) {
        HXPrint(
          "${baseOptions.baseUrl} 结果url is $url data is ${jsonEncode(params)}, result is $response ,"
          " header is ${jsonEncode(options.headers)}  queryParams is ${jsonEncode(queryParameters)}",
        );
      }

      HXNetResponse baseRespond = HXNetResponse.fromJson(response.data);

      if (baseRespond.code != "0" && baseRespond.code != 0) {
        switch (baseRespond.errCode) {
          case "401":
            {
              HXCache.instance.removeUser();
              eventBus.fire(
                EventFn(EventType.Login_Logout, actionType: ActionType.Logout),
              );
            }
            break;
          case "1111001":
            {
              eventBus.fire(
                EventFn(EventType.Patients, actionType: ActionType.Plan_Jump),
              );
            }
            break;
          case "2111001":
            {
              eventBus.fire(
                EventFn(
                  EventType.HIS,
                  actionType: ActionType.Refresh_Tip,
                  data: baseRespond.msg ?? "",
                ),
              );
            }
            break;

          default:
            break;
        }
        throw HXNetError(
          baseRespond.errCode ?? "0",
          baseRespond.msg ?? "网络异常",
          data: response.data,
        );
      }
    } on DioError catch (e) {
      // 网关出错
      error = e;
      if (EnvironmentUtils.instance.isInDebugMode) {
        EasyLoading.showError(error.toString());
        return Future.value(null);
      } else {
        return Future.value(null);
      }
    } on HXNetError catch (e) {
      //  特殊错误
      if (e.code == '400') {
        // 需要提示
        EasyLoading.showError("${e.msg}");
        return Future.value(e.data);
      }
      // 登录接口返回code="0"表示成功，需要特殊处理
      if (e.code == '0' && e.data != null && e.data is Map<String, dynamic>) {
        final responseData = e.data as Map<String, dynamic>;
        final code = responseData['code'];
        final success = responseData['success'] == true;
        // 如果响应中code="0"或success=true，说明是成功的响应
        if ((code == "0" || code == 0) || success) {
          return Future.value(e.data);
        }
      }
      return Future.value(null);
    } catch (e) {
      // 网络出错误
      if (EnvironmentUtils.instance.isInDebugMode) {
        EasyLoading.showError(error.toString());
        return Future.value(null);
      } else {
        return Future.value(null);
      }
    }
    return response.data;
  }
}
