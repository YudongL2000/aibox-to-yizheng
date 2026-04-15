# API接口封装使用说明

## 目录结构

```
lib/server/api/
├── base_api_service.dart      # 基础API服务类
├── models/
│   └── base_response.dart     # 基础响应模型
├── ai_interaction_api.dart    # AI交互接口示例
└── README.md                  # 本文件
```

## 使用步骤

### 1. 根据飞书文档配置接口路径

编辑 `ai_interaction_api.dart` 中的 `HttpConfig_AI_Interaction` 类，将接口路径替换为文档中的实际路径：

```dart
class HttpConfig_AI_Interaction {
  // 根据文档中的接口路径替换
  static const String sendMessage = "/api/v1/ai/interact";  // 示例
  static const String getHistory = "/api/v1/ai/history";    // 示例
  // ...
}
```

### 2. 根据文档定义数据模型

根据飞书文档中的返回数据结构，修改或创建对应的模型类：

```dart
class AIMessage {
  // 根据文档中的字段名和类型进行定义
  final String id;           // 文档中的字段名可能是 id, messageId 等
  final String content;      // 文档中的字段名可能是 content, text, message 等
  // ...
  
  factory AIMessage.fromJson(Map<String, dynamic> json) {
    return AIMessage(
      // 根据文档中的实际字段名进行映射
      id: json['id'] ?? json['messageId'] ?? '',
      content: json['content'] ?? json['text'] ?? '',
      // ...
    );
  }
}
```

### 3. 根据文档调整响应解析逻辑

编辑 `base_response.dart` 中的 `BaseResponse` 类，根据文档中的响应结构进行调整：

```dart
class BaseResponse<T> {
  // 根据文档中的字段名调整
  final dynamic code;      // 可能是 code, status, errCode
  final String? message;   // 可能是 message, msg, errorMsg
  final T? data;          // 可能是 data, result, content
  
  // 根据文档中的成功状态码判断
  bool get isSuccess {
    return code == 0 || code == 200 || code == "1";  // 根据文档调整
  }
}
```

### 4. 在代码中使用API

```dart
import 'package:aitesseract/server/api/ai_interaction_api.dart';

// 创建API实例
final api = AIInteractionApi();

// 发送消息
try {
  final message = await api.sendMessage("用户输入的内容");
  if (message != null) {
    // 处理返回的消息
    print("AI回复: ${message.content}");
  }
} on HXNetError catch (e) {
  // 处理业务错误
  print("错误: ${e.msg}");
} catch (e) {
  // 处理其他错误
  print("异常: $e");
}

// 获取历史记录
try {
  final history = await api.getHistory(page: 1, pageSize: 20);
  // 处理历史记录列表
} catch (e) {
  // 错误处理
}
```

## 创建新的API服务类

### 步骤1: 创建配置类

```dart
class HttpConfig_YourModule {
  static const String yourEndpoint = "/api/v1/your/endpoint";
}
```

### 步骤2: 创建数据模型

```dart
class YourModel {
  final String field1;
  final int field2;
  
  YourModel({required this.field1, required this.field2});
  
  factory YourModel.fromJson(Map<String, dynamic> json) {
    return YourModel(
      field1: json['field1'] ?? '',
      field2: json['field2'] ?? 0,
    );
  }
}
```

### 步骤3: 创建API服务类

```dart
class YourApiService extends BaseApiService {
  /// 你的接口方法
  Future<YourModel?> yourMethod(String param) async {
    try {
      final result = await request<Map<String, dynamic>>(
        HttpConfig_YourModule.yourEndpoint,
        params: {
          'param': param,
        },
        fromJson: (json) => json,
      );
      
      if (result != null) {
        return YourModel.fromJson(result);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }
}
```

## 注意事项

1. **字段映射**: 根据飞书文档中的实际字段名进行映射，注意大小写和下划线
2. **类型转换**: 注意文档中的数据类型，进行正确的类型转换
3. **错误处理**: 使用 try-catch 捕获 `HXNetError` 进行业务错误处理
4. **空值处理**: 使用 `??` 操作符提供默认值，避免空指针异常
5. **列表解析**: 使用 `requestList` 方法处理列表类型的响应

## 常见问题

### Q: 如何根据文档调整响应解析？

A: 查看文档中的响应结构，修改 `BaseResponse.fromJson` 方法中的字段映射：

```dart
factory BaseResponse.fromJson(Map<String, dynamic> json) {
  return BaseResponse<T>(
    code: json['code'] ?? json['status'],  // 根据文档调整
    message: json['message'] ?? json['msg'],  // 根据文档调整
    data: json['data'] ?? json['result'],  // 根据文档调整
  );
}
```

### Q: 如何处理分页数据？

A: 使用 `PageResponse` 模型或自定义分页模型：

```dart
Future<PageResponse<YourModel>> getList({
  int page = 1,
  int pageSize = 20,
}) async {
  // 实现分页逻辑
}
```

### Q: 如何上传文件？

A: 参考 `HttpRequest.uploadImgAllPlatform` 方法，或使用 FormData：

```dart
// 在 BaseApiService 中添加文件上传方法
Future<T?> uploadFile<T>(...) async {
  // 实现文件上传逻辑
}
```
