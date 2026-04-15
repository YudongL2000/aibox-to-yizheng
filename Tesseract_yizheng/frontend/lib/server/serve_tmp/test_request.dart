import 'package:aitesseract/server/serve_tmp/base_request.dart';

class TextRequest extends BaseRequestTemp {
  @override
  HttpMethodTemp httpMethod() {
    return HttpMethodTemp.HttpMethod_Get;
  }

  @override
  bool needLogin() {
    // TODO: implement needLogin
    return false;
  }

  @override
  String path() {
    // TODO: implement path
    return "";
  }
}
