class HXNetResponse<T> {
  var code;
  var data;
  String? errCode;
  String? msg;

  HXNetResponse({
    this.data,
    this.code,
    this.errCode,
    this.msg,
  });

  HXNetResponse.fromJson(Map<String, dynamic> json) {
    code = json['code'];
    data = json['data'];
    errCode = json['errCode'].toString();
    if (json['msg'] != null) {
      msg = json['msg'];
    }
    if (json['message'] != null) {
      msg = json['message'];
    }
  }
}
