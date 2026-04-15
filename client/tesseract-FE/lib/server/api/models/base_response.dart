/// 基础响应模型
/// 根据飞书文档中的响应结构进行适配
class BaseResponse<T> {
  /// 状态码（根据文档中的字段名调整，可能是 code, status, errCode 等）
  final dynamic code;
  
  /// 消息（根据文档中的字段名调整，可能是 msg, message, msg 等）
  final String? message;
  
  /// 数据（根据文档中的字段名调整，可能是 data, result, content 等）
  final T? data;
  
  /// 错误码（如果有）
  final String? errCode;

  BaseResponse({
    this.code,
    this.message,
    this.data,
    this.errCode,
  });

  /// 是否成功（根据文档中的成功状态码判断，可能是 code == 0, code == 200, code == "1" 等）
  bool get isSuccess {
    return code == 0 || code == 200 || code == "1" || code == 1;
  }

  factory BaseResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic)? fromJsonT,
  ) {
    return BaseResponse<T>(
      code: json['code'] ?? json['status'] ?? json['errCode'],
      message: json['message'] ?? json['msg'] ?? json['message'],
      errCode: json['errCode']?.toString(),
      data: json['data'] != null && fromJsonT != null
          ? fromJsonT(json['data'])
          : json['data'] as T?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'code': code,
      'message': message,
      'data': data,
      'errCode': errCode,
    };
  }
}

/// 分页响应模型
class PageResponse<T> {
  /// 数据列表
  final List<T> list;
  
  /// 总数
  final int total;
  
  /// 当前页
  final int current;
  
  /// 每页数量
  final int pageSize;

  PageResponse({
    required this.list,
    required this.total,
    required this.current,
    required this.pageSize,
  });

  factory PageResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) {
    // 根据文档中的字段名调整（可能是 list, data, records, items 等）
    final List<dynamic> listData = json['list'] ?? 
                                   json['data'] ?? 
                                   json['records'] ?? 
                                   json['items'] ?? 
                                   [];
    
    return PageResponse<T>(
      list: listData
          .map((item) => fromJsonT(item as Map<String, dynamic>))
          .toList(),
      total: json['total'] ?? json['totalCount'] ?? 0,
      current: json['current'] ?? json['currentPage'] ?? json['page'] ?? 1,
      pageSize: json['pageSize'] ?? json['size'] ?? 10,
    );
  }
}
