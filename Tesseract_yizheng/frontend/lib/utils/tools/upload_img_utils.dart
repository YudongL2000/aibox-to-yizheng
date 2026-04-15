/**
 * [INPUT]: 依赖 file_picker、upload_media_model 与历史上传适配器 HttpUpload。
 * [OUTPUT]: 对外提供 UploadUtils，负责把文件选择动作折叠为上传回调。
 * [POS]: utils/tools 的历史上传入口，当前通过兼容适配器在未接入服务时明确失败。[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:typed_data';

import 'package:aitesseract/utils/enum_utils/enum_utils.dart';
import 'package:aitesseract/utils/tools/upload_media_model.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';

import '../../server/http_request_upload.dart';

typedef UploadSucCallBack = void Function(UploadMedia uploadImg);
typedef UploadFailCallBack = void Function();

class UploadUtils {
  static bool viladeImage(String name) {
    if (['jpg', 'png', 'gif', 'pdf', "jpeg"].indexOf(name) >= 0) {
      return true;
    } else {
      return false;
    }
  }

  static Future<void> pickAndUpload(
      {UploadSucCallBack? suc,
      UploadFailCallBack? fail,
      FileType? fileType = FileType.image,
      List<String>? allowedExtensions,
      UploadType? uploadType = UploadType.UploadTypeFileUpload,
      bool? isSpecialDisease}) async {
    // 具体的上传方法
    _upload({Uint8List? imageFileBytes, String? fileExtension}) async {
      if (fileType == FileType.image) {
        if (!UploadUtils.viladeImage(fileExtension ?? "")) {
          EasyLoading.showError("请上传正确格式图片（.PNG、.JPG、.GIF、.PDF）");
          return;
        }
        if (isSpecialDisease == true) {
          await HttpUpload()
              .uploadImgAllPlatformSpecialDisease(
                  imageFileBytes: imageFileBytes, fileType: fileExtension)
              .then((UploadMedia? uploadImg) {
            if (uploadImg != null) {
              suc?.call(uploadImg);
            } else {
              fail?.call();
            }
          });
        } else {
          await HttpUpload()
              .uploadImgAllPlatform(
                  imageFileBytes: imageFileBytes, fileType: fileExtension)
              .then((UploadMedia? uploadImg) {
            if (uploadImg != null) {
              suc?.call(uploadImg);
            } else {
              fail?.call();
            }
          });
        }
      } else if (fileType == FileType.video) {
        await HttpUpload()
            .uploadImageToVideo(videoFileBytes: imageFileBytes)
            .then((UploadMedia? uploadVideo) {
          if (uploadVideo != null) {
            suc?.call(uploadVideo);
          } else {
            fail?.call();
          }
        });
      } else {
        if (isSpecialDisease == true) {
          await HttpUpload()
              .uploadImgAllPlatformSpecialDisease(
                  imageFileBytes: imageFileBytes, fileType: fileExtension)
              .then((UploadMedia? uploadImg) {
            if (uploadImg != null) {
              suc?.call(uploadImg);
            } else {
              fail?.call();
            }
          });
        } else {
          await HttpUpload()
              .uploadImgAllPlatform(
                  imageFileBytes: imageFileBytes, fileType: fileExtension)
              .then((UploadMedia? uploadImg) {
            if (uploadImg != null) {
              suc?.call(uploadImg);
            } else {
              fail?.call();
            }
          });
        }
      }
    }

    // 选择文件进行文件上传
    FilePicker.platform
        .pickFiles(
            lockParentWindow: true,
            type: fileType ?? FileType.image,
            allowedExtensions: allowedExtensions,
            withData: true)
        .then((result) async {
      // 无论是使用windows 还是 web使用相同的方法获取文件的bytes资源进行上传
      if (result != null && result.files.isNotEmpty) {
        final fileBytes = result.files.first.bytes;
        List<String> nameList = result.files.first.name.split(".");
        _upload(imageFileBytes: fileBytes, fileExtension: nameList.last);
      } else {
        fail?.call();
      }
    });
  }

  static Future<void> upload(
      {Uint8List? imageFileBytes,
      String? fileExtension,
      UploadSucCallBack? suc,
      UploadFailCallBack? fail,
      FileType? fileType = FileType.image,
      List<String>? allowedExtensions,
      UploadType? uploadType = UploadType.UploadTypeFileUpload}) async {
    if (fileType == FileType.image) {
      if (!UploadUtils.viladeImage(fileExtension ?? "")) {
        EasyLoading.showError("请上传正确格式图片（.PNG、.JPG、.GIF、.PDF）");
        return;
      }
      await HttpUpload()
          .uploadImgAllPlatform(
              imageFileBytes: imageFileBytes, fileType: fileExtension)
          .then((UploadMedia? uploadImg) {
        if (uploadImg != null) {
          suc?.call(uploadImg);
        } else {
          fail?.call();
        }
      });
    } else if (fileType == FileType.video) {
      await HttpUpload()
          .uploadImageToVideo(videoFileBytes: imageFileBytes)
          .then((UploadMedia? uploadVideo) {
        if (uploadVideo != null) {
          suc?.call(uploadVideo);
        } else {
          fail?.call();
        }
      });
    } else if (fileType == FileType.audio) {
      await HttpUpload()
          .uploadImgAllPlatform(
              imageFileBytes: imageFileBytes, fileType: fileExtension)
          .then((UploadMedia? uploadVideo) {
        if (uploadVideo != null) {
          suc?.call(uploadVideo);
        } else {
          fail?.call();
        }
      });
    } else {
      await HttpUpload()
          .uploadImgAllPlatform(
              imageFileBytes: imageFileBytes, fileType: fileExtension)
          .then((UploadMedia? uploadImg) {
        if (uploadImg != null) {
          suc?.call(uploadImg);
        } else {
          fail?.call();
        }
      });
    }
  }

//
// static Future<MediaOcrUploadResModel?> pickAndUploadOcrMedia(
//     {Function(MediaOcrUploadResModel? resModel)? suc,
//      Function(MediaOcrUploadResModel? resModel)? fail,
//       FileType? fileType = FileType.image}) async {
//
//   // 选择文件进行文件上传
//   FilePicker.platform
//       .pickFiles(
//       lockParentWindow: true,
//       type: fileType ??  FileType.image,
//       withData: true)
//       .then((result) async {
//     // 无论是使用windows 还是 web使用相同的方法获取文件的bytes资源进行上传
//     if (result != null && result.files.isNotEmpty) {
//       final fileBytes =   result.files.first.bytes;
//       if (fileType == FileType.image) {
//         await HttpUpload()
//             .uploadImgAllPlatform(imageFileBytes: imageFileBytes)
//             .then((UploadMedia? uploadImg) {
//           if (uploadImg != null) {
//             suc?.call(uploadImg);
//           } else {
//             fail?.call();
//           }
//         });
//
//         await HttpUpload()
//             .uploadImgWithOcr(imageFileBytes: fileBytes)
//             .then((MediaOcrUploadResModel? uploadImg) {
//           if (uploadImg != null) {
//             suc?.call(uploadImg);
//           } else {
//             fail?.call(null);
//           }
//         });
//       }
//       if (fileType == FileType.audio) {
//         await HttpUpload()
//             .uploadAudioWithOcr(audioFileBytes: fileBytes)
//             .then((MediaOcrUploadResModel? uploadImg) {
//           if (uploadImg != null) {
//             suc?.call(uploadImg);
//           } else {
//             fail?.call(null);
//           }
//         });
//       } else {
//         fail?.call(null);
//       }
//
//     } else {
//       fail?.call(null);
//     }
//   });
// }
}
