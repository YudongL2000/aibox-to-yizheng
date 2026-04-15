import 'package:dio/dio.dart';
import 'dart:convert';
import 'package:aitesseract/server/Http_config.dart';

/// Agent图片上传接口配置
class HttpConfig_AgentUpload {
  /// 上传人脸图片接口
  static const String uploadFace = "/api/agent/upload-face";
  
  /// 基础URL
  static String get baseUrl => HttpConfig.agentBaseUrl;
}

/// 上传人脸图片请求参数
class UploadFaceRequest {
  final String profile; // 老刘 | 老付 | 老王
  final String fileName;
  final String contentBase64; // data:image/png;base64,....
  final int width;
  final int height;

  UploadFaceRequest({
    required this.profile,
    required this.fileName,
    required this.contentBase64,
    required this.width,
    required this.height,
  });

  Map<String, dynamic> toJson() {
    return {
      'profile': profile,
      'fileName': fileName,
      'contentBase64': contentBase64,
      'width': width,
      'height': height,
    };
  }
}

/// 上传人脸图片响应
class UploadFaceResponse {
  final bool success;
  final String profile;
  final String imageId;
  final String? error;

  UploadFaceResponse({
    required this.success,
    required this.profile,
    required this.imageId,
    this.error,
  });

  factory UploadFaceResponse.fromJson(Map<String, dynamic> json) {
    return UploadFaceResponse(
      success: json['success'] ?? false,
      profile: json['profile'] ?? '',
      imageId: json['imageId'] ?? '',
      error: json['error'] as String?,
    );
  }
}

/// Agent图片上传API服务
class AgentUploadApi {
  /// 上传人脸图片
  /// 
  /// [profile] 人物名称（老刘 | 老付 | 老王）
  /// [fileName] 文件名
  /// [contentBase64] base64编码的图片数据（包含data:image/png;base64,前缀）
  /// 
  /// 返回上传结果
  Future<UploadFaceResponse?> uploadFace({
    required String profile,
    required String fileName,
    required String contentBase64,
    required int width,
    required int height,
  }) async {
    try {
      final dio = Dio(BaseOptions(
        baseUrl: HttpConfig_AgentUpload.baseUrl,
        connectTimeout: const Duration(seconds: 30).inMilliseconds,
        receiveTimeout: const Duration(seconds: 30).inMilliseconds,
      ));

      final request = UploadFaceRequest(
        profile: profile,
        fileName: fileName,
        contentBase64: contentBase64,
        width: width,
        height: height,
      );

      final requestData = request.toJson();
      final url = '${HttpConfig_AgentUpload.baseUrl}${HttpConfig_AgentUpload.uploadFace}';
      
      // 打印请求参数（base64内容截断显示）
      final requestDataForLog = Map<String, dynamic>.from(requestData);
      if (requestDataForLog['contentBase64'] != null) {
        final base64Str = requestDataForLog['contentBase64'] as String;
        requestDataForLog['contentBase64'] = base64Str.length > 100 
            ? '${base64Str.substring(0, 100)}... (${base64Str.length} chars)' 
            : base64Str;
      }
      
      print('========== Agent Upload Face API ==========');
      print('URL: $url');
      print('Method: POST');
      print('Request: ${JsonEncoder.withIndent('  ').convert(requestDataForLog)}');
      print('============================================');

      final response = await dio.post(
        HttpConfig_AgentUpload.uploadFace,
        data: requestData,
        options: Options(
          headers: {
            'Content-Type': 'application/json',
          },
        ),
      );

      // 打印返回值
      print('========== Agent Upload Face Response ==========');
      print('Status Code: ${response.statusCode}');
      if (response.data != null) {
        print('Response: ${JsonEncoder.withIndent('  ').convert(response.data)}');
      }
      print('================================================');

      if (response.statusCode == 200 && response.data != null) {
        return UploadFaceResponse.fromJson(
          response.data as Map<String, dynamic>,
        );
      }

      return null;
    } on DioError catch (e) {
      print('========== Agent Upload Face Error ==========');
      print('Error: $e');
      if (e.response != null) {
        print('Response Data: ${e.response?.data}');
      }
      print('=============================================');
      rethrow;
    } catch (e) {
      print('========== Agent Upload Face Error ==========');
      print('Error: $e');
      print('=============================================');
      rethrow;
    }
  }
}
