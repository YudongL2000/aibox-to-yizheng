import 'dart:convert';

import 'package:aitesseract/server/serve_tmp/base_request.dart';

class HiNetResponse<T> {
  T? data;
  BaseRequestTemp? request;
  int? statusCode;
  String? statusMessage;
  dynamic extra;

  HiNetResponse(
      this.data, this.request, this.statusCode, this.statusMessage, this.extra);

  @override
  String toString() {
    if (data is Map) {
      return json.encode(data);
    } else {
      return data.toString();
    }
  }
}

abstract class HiNetAdapter {
  Future<HiNetResponse?> send<T>({required BaseRequestTemp requestTemp});
}
