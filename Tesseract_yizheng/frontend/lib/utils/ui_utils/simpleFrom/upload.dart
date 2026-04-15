import 'package:aitesseract/utils/tools/upload_img_utils.dart';
import 'package:aitesseract/utils/tools/upload_media_model.dart';
import 'package:aitesseract/utils/ui_utils/hx_image.dart';
import 'package:aitesseract/utils/ui_utils/hx_text.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

class SimpleUploadFormField extends StatefulWidget {
  SimpleUploadFormField(
      {Key? key,
      this.callback,
      this.imgUrl,
      this.isMult = false,
      this.subTitle,
      this.enable = true,
      this.deleteCallBack,
      this.width,
      this.height,
      this.imgUrls})
      : super(key: key);
  final callback;
  final bool isMult;
  final String? subTitle;
  final String? imgUrl;
  final List<String>? imgUrls;
  final double? width;
  final double? height;
  final bool? enable;
  final Function? deleteCallBack;

  @override
  _SimpleUploadFormFieldState createState() => _SimpleUploadFormFieldState();
}

class _SimpleUploadFormFieldState extends State<SimpleUploadFormField> {
  List<String> imgdata = [];

  @override
  void initState() {
    super.initState();
    imgdata = [];
  }

  _init() {
    if (widget.imgUrl != "Null" &&
        widget.imgUrl != "" &&
        widget.imgUrl != null) {
      imgdata.add(widget.imgUrl ?? "");
    }
    if (widget.imgUrls != null) {
      imgdata.addAll(widget.imgUrls ?? []);
    }
  }

  List<Widget> imageArr() {
    return imgdata
        .asMap()
        .keys
        .map((e) => InkWell(
            onTap: () {},
            child: Container(
                margin: EdgeInsets.only(left: 10),
                width: widget.width ?? 190,
                height: widget.height ?? 130,
                child: HXImage(imageUrl: imgdata[e]))))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    final Color panelColor = spatial.surface(SpatialSurfaceTone.muted);
    final Color disableTextColor = spatial.palette.textSecondary;
    final Color dangerColor = spatial.status(SpatialStatusTone.danger);

    _init();
    return widget.isMult
        ? Container(
            margin: EdgeInsets.only(left: 10),
            child: Wrap(
              alignment: WrapAlignment.start,
              children: [
                ...imageArr(),
                widget.enable == false
                    ? Container()
                    : InkWell(
                        onTap: () async {
                          if (widget.enable == false) {
                            return;
                          }
                          await UploadUtils.pickAndUpload(
                              fileType: FileType.image,
                              suc: (UploadMedia uploadImg) {
                                imgdata.add(uploadImg.uri!);
                                if (mounted) {
                                  setState(() {});
                                }
                                widget.callback(uploadImg.uri);
                              },
                              fail: () {});
                        },
                        child: Container(
                          margin: EdgeInsets.only(left: 10),
                          decoration: BoxDecoration(
                              color: panelColor,
                              borderRadius:
                                  BorderRadius.all(Radius.circular(10))),
                          width: widget.width ?? 190,
                          height: widget.height ?? 130,
                          child: Center(
                            child: Icon(Icons.upload_outlined),
                          ),
                        ),
                      ),
              ],
            ),
          )
        : Container(
            margin: EdgeInsets.only(left: 10),
            child: InkWell(
                onTap: () async {
                  if (widget.enable == false) {
                    return;
                  }
                  await UploadUtils.pickAndUpload(
                      fileType: FileType.image,
                      suc: (UploadMedia uploadImg) {
                        if (!widget.isMult) {
                          imgdata.clear();
                        }
                        imgdata.add(uploadImg.uri!);
                        if (mounted) {
                          setState(() {});
                        }
                        widget.callback(uploadImg.uri);
                      },
                      fail: () {});
                },
                child: imgdata.length == 0
                    ? Container(
                        margin: EdgeInsets.only(left: 10),
                        decoration: BoxDecoration(
                            color: panelColor,
                            borderRadius:
                                BorderRadius.all(Radius.circular(10))),
                        width: widget.width ?? 190,
                        height: widget.height ?? 130,
                        child: Center(
                          child: widget.subTitle != null
                              ? HXText(
                                  "${widget.subTitle}",
                                  color: disableTextColor,
                                  fontSize: 12,
                                )
                              : Icon(Icons.upload_outlined),
                        ),
                      )
                    : InkWell(
                        onTap: () {},
                        child: Container(
                            margin: EdgeInsets.only(left: 10),
                            width: widget.width ?? 190,
                            height: widget.height ?? 130,
                            child: Stack(
                              children: [
                                HXImage(imageUrl: imgdata[0]),
                                Visibility(
                                  visible: widget.deleteCallBack != null,
                                  child: Positioned(
                                      right: 0,
                                      top: 0,
                                      child: InkWell(
                                          onTap: () {
                                            imgdata.clear();
                                            if (mounted) {
                                              setState(() {});
                                            }
                                            widget.deleteCallBack?.call();
                                          },
                                          child: Icon(
                                            Icons.remove_circle,
                                            size: 20,
                                            color: dangerColor,
                                          ))),
                                )
                              ],
                            )),
                      )),
          );
  }
}
