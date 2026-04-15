import 'package:extended_image/extended_image.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:photo_view/photo_view.dart';

class PreviewPhotoWidget extends StatefulWidget {
  final String url;
  final double minScale;
  final double maxScale;

  PreviewPhotoWidget(this.url,
      {Key? key, this.minScale = 0.5, this.maxScale = 5})
      : super(key: key);

  @override
  State<StatefulWidget> createState() => _PreviewPhotoWidgetState();
}

class _PreviewPhotoWidgetState extends State<PreviewPhotoWidget> {
  late PhotoViewControllerBase controller;

  @override
  void initState() {
    super.initState();
    controller = PhotoViewController(initialScale: 1.0);
  }

  @override
  Widget build(BuildContext context) {
    return ExtendedImage.network(
      widget.url,
      fit: BoxFit.contain,
      mode: ExtendedImageMode.gesture,
      initGestureConfigHandler: (state) {
        return GestureConfig(
            minScale: widget.minScale,
            animationMinScale: widget.minScale,
            maxScale: widget.maxScale,
            animationMaxScale: widget.maxScale,
            speed: 1.0,
            inertialSpeed: 100.0,
            initialScale: 1.0,
            inPageView: false);
      },
    );
  }
}
