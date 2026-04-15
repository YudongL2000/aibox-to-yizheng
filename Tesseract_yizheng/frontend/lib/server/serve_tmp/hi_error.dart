class HiNetError implements Exception {
  final int? code;
  final String? message;
  final dynamic data;
  HiNetError({this.code, this.message, this.data});
}

class NeedAuth extends HiNetError {
  NeedAuth({int? code = 403, String? message = "鉴权异常", dynamic data})
      : super(code: code, message: message, data: data);
}

class NeedLogin extends HiNetError {
  NeedLogin({int? code = 401, String? message = "登录异常", dynamic data})
      : super(code: code, message: message, data: data);
}
