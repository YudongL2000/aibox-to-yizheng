import 'package:aitesseract/server/serve_tmp/base_request.dart';
import 'package:aitesseract/server/serve_tmp/hi_error.dart';
import 'package:dio/dio.dart';

import 'hi_net_adapter.dart';

class DioAdapter extends HiNetAdapter {
  @override
  Future<HiNetResponse?> send<T>({required BaseRequestTemp requestTemp}) async {
    // TODO: implement send

    var respond, option = Options(headers: requestTemp.header);
    var error;
    try {
      if (requestTemp.httpMethod() == HttpMethodTemp.HttpMethod_Get) {
        respond = await Dio().get(requestTemp.url(), options: option);
      } else if (requestTemp.httpMethod() == HttpMethodTemp.HttpMethod_Post) {
        respond = await Dio().post(requestTemp.url(), options: option);
      } else if (requestTemp.httpMethod() == HttpMethodTemp.HttpMethod_Delete) {
        respond = await Dio().delete(requestTemp.url(), options: option);
      }
    } on DioError catch (e) {
      error = e;
      respond = e.response;
    }
    if (error != null) {
      throw HiNetError(
          code: respond?.statusCode,
          message: error.toString(),
          data: buildRespond(respond, requestTemp));
    }
    return buildRespond(respond, requestTemp);
  }

  HiNetResponse buildRespond(Response response, BaseRequestTemp requestTemp) {
    return HiNetResponse(response.data, requestTemp, response.statusCode,
        response.statusMessage, response);
  }
}
