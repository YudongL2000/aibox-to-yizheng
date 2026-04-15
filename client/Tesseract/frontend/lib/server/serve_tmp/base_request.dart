import 'package:aitesseract/server/Http_config.dart';

enum HttpMethodTemp { HttpMethod_Get, HttpMethod_Post, HttpMethod_Delete }

abstract class BaseRequestTemp {
  var pathParams;
  var useHttps = true;

  String authority() {
    return HttpConfig.baseUrl;
  }

  HttpMethodTemp httpMethod();

  String path();

  String url() {
    Uri uri;
    var pathStr = path();
    if (pathParams != null) {
      if (path().endsWith('/')) {
        pathStr = path() + pathParams;
      } else {
        pathStr = path() + "/" + pathParams;
      }
    }
    if (useHttps) {
      uri = Uri.https(authority(), pathStr, params);
    } else {
      uri = Uri.http(authority(), pathStr, params);
    }
    return uri.toString();
  }

  bool needLogin();

  Map<String, String> params = {};

  BaseRequestTemp addParam({required String key, required Object value}) {
    params[key] = value.toString();
    return this;
  }

  Map<String, dynamic> header = Map();

  BaseRequestTemp addHeader({required String key, required Object value}) {
    header[key] = value.toString();
    return this;
  }
}
