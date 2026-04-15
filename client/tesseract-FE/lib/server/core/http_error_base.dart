class NeedLogin extends HXNetError {
  NeedLogin({String code = "401", String message = "请登录"})
      : super(code, message);
}

class NeedAuth extends HXNetError {
  NeedAuth(String message, {String code = "403", dynamic data})
      : super(message, code, data: data);
}

class HXNetError implements Exception {
  final String code;
  final String msg;
  final dynamic data;
  HXNetError(this.code, this.msg, {this.data});
}
