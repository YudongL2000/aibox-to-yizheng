/**
 * [INPUT]: 依赖 upload_media_model 的上传结果模型与 easyloading 的错误提示。
 * [OUTPUT]: 对外提供 HttpUpload 兼容壳，在未接入真实上传服务时显式失败。
 * [POS]: server 历史上传链的兜底适配器，负责把“缺失实现”从编译期错误降级为运行期明确失败。[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:aitesseract/utils/tools/upload_media_model.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';

class HttpUpload {
  static const String _kUploadUnavailableMessage = '当前工程未接入通用上传能力';

  Future<UploadMedia?> uploadImgAllPlatform({
    required dynamic imageFileBytes,
    String? fileType,
  }) {
    return _fail();
  }

  Future<UploadMedia?> uploadImgAllPlatformSpecialDisease({
    required dynamic imageFileBytes,
    String? fileType,
  }) {
    return _fail();
  }

  Future<UploadMedia?> uploadImageToVideo({
    required dynamic videoFileBytes,
  }) {
    return _fail();
  }

  Future<UploadMedia?> _fail() async {
    EasyLoading.showError(_kUploadUnavailableMessage);
    return null;
  }
}
