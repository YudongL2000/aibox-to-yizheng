import 'package:aitesseract/server/Http_request.dart';
import 'package:aitesseract/server/core/http_responds.dart';
import 'package:aitesseract/server/core/http_error_base.dart';
import 'package:aitesseract/utils/tools/hx_print.dart';

/// 基础API服务类
/// 所有API服务类都应该继承此类
abstract class BaseApiService {
  /// 通用请求方法
  /// 
  /// [url] 接口路径
  /// [method] 请求方法，默认为 "post"
  /// [params] 请求参数
  /// [headers] 自定义请求头
  /// [queryParameters] 查询参数（用于GET请求）
  /// 
  /// 返回类型 [T] 需要实现 fromJson 方法
  Future<T?> request<T>(String url,
      {String method = "post",
      Map<String, dynamic>? params,
      Map<String, dynamic>? headers,
      Map<String, dynamic>? queryParameters,
      T Function(Map<String, dynamic>)? fromJson}) async {
    try {
      final response = await HttpRequest.request<Map<String, dynamic>>(
        url,
        method: method,
        params: params,
        headers: headers,
        queryParameters: queryParameters,
      );

      if (response == null) {
        return null;
      }

      // 解析响应
      final hxResponse = HXNetResponse.fromJson(response);

      // 检查业务状态码
      if (hxResponse.code != "1" && hxResponse.code != 1) {
        throw HXNetError(
          hxResponse.errCode ?? "0",
          hxResponse.msg ?? "请求失败",
          data: hxResponse.data,
        );
      }

      // 如果提供了 fromJson 方法，则解析数据
      if (fromJson != null && hxResponse.data != null) {
        if (hxResponse.data is Map<String, dynamic>) {
          return fromJson(hxResponse.data as Map<String, dynamic>);
        } else if (hxResponse.data is List) {
          // 如果是列表，需要特殊处理
          return null;
        }
      }

      return hxResponse.data as T?;
    } on HXNetError catch (e) {
      HXPrint("API请求错误: ${e.msg}");
      rethrow;
    } catch (e) {
      HXPrint("API请求异常: $e");
      throw HXNetError("0", "网络请求异常: $e");
    }
  }

  /// 列表请求方法
  /// 
  /// [url] 接口路径
  /// [method] 请求方法
  /// [params] 请求参数
  /// [fromJson] 单个列表项的解析方法
  /// 
  /// 返回 [List<T>]
  Future<List<T>> requestList<T>(String url,
      {String method = "post",
      Map<String, dynamic>? params,
      Map<String, dynamic>? headers,
      Map<String, dynamic>? queryParameters,
      required T Function(Map<String, dynamic>) fromJson}) async {
    try {
      final response = await HttpRequest.request<Map<String, dynamic>>(
        url,
        method: method,
        params: params,
        headers: headers,
        queryParameters: queryParameters,
      );

      if (response == null) {
        return [];
      }

      final hxResponse = HXNetResponse.fromJson(response);

      if (hxResponse.code != "1" && hxResponse.code != 1) {
        throw HXNetError(
          hxResponse.errCode ?? "0",
          hxResponse.msg ?? "请求失败",
          data: hxResponse.data,
        );
      }

      // 解析列表数据
      if (hxResponse.data != null && hxResponse.data is List) {
        final List<dynamic> dataList = hxResponse.data as List<dynamic>;
        return dataList
            .map((item) => fromJson(item as Map<String, dynamic>))
            .toList();
      }

      return [];
    } on HXNetError catch (e) {
      HXPrint("API列表请求错误: ${e.msg}");
      rethrow;
    } catch (e) {
      HXPrint("API列表请求异常: $e");
      throw HXNetError("0", "网络请求异常: $e");
    }
  }
}
