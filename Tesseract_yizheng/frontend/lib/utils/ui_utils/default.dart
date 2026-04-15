import 'package:flutter/material.dart';
import 'package:aitesseract/utils/ui_utils/hx_image.dart';
import 'package:aitesseract/utils/ui_utils/hx_text.dart';
import 'package:aitesseract/server/Http_config.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

class Default extends StatelessWidget {
  final List? data;
  final Widget? child;
  const Default({Key? key, this.data, this.child}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    return Container(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          data!.length > 0
              ? Container(
                  child: child,
                )
              : Container(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      HXImage(
                        imageUrl:
                            "${HttpConfig.assetsImgUrl}default_list@2x.png",
                        width: 150,
                        height: 150,
                      ),
                      HXText(
                        "暂无更多数据",
                        color: spatial.palette.textSecondary,
                        fontSize: 14,
                      )
                    ],
                  ),
                )
        ],
      ),
    );
  }
}
