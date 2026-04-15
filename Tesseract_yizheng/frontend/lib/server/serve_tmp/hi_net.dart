import 'package:aitesseract/server/serve_tmp/base_request.dart';
import 'package:aitesseract/server/serve_tmp/dio_adapter.dart';
import 'package:aitesseract/server/serve_tmp/hi_error.dart';
import 'package:aitesseract/server/serve_tmp/hi_net_adapter.dart';

class HiNet {
  HiNet._();

  static HiNet? _instance;
  static HiNet? getInstance() {
    if (_instance == null) {
      _instance = HiNet._();
    }
    return _instance;
  }

  Future fire({required BaseRequestTemp tempRequest}) async {
    HiNetResponse? respond;
    try {
      respond = await send(tempRequest: tempRequest);
    } on HiNetError catch (_) {
      respond = null;
    } catch (_) {
      respond = null;
    }
    if (respond == null) {
      return null;
    }

    switch (respond.statusCode) {
      case 200:
        {
          return respond.data;
        }
      case 401:
        {
          throw NeedLogin();
        }
      case 403:
        {
          throw NeedAuth(message: respond.data.toString(), data: respond.data);
        }
      default:
        {
          throw HiNetError(
              message: respond.data.toString(), data: respond.data);
        }
    }
  }

  Future send({required BaseRequestTemp tempRequest}) async {
    print("url is ${tempRequest.url()}");
    tempRequest.addHeader(key: "header", value: "111");
    HiNetAdapter adapter = DioAdapter();
    return adapter.send(requestTemp: tempRequest);
    //  return Future.value({"statusCode": 200, "data":{"code":0,"message":"success"}});
  }
}
