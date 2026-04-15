import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:aitesseract/server/Http_config.dart';

class HXImage extends StatefulWidget {
  final BoxFit? fit;
  final String imageUrl;
  final double? width;
  final double? height;

  final PlaceholderWidgetBuilder? placeholder;
  final LoadingErrorWidgetBuilder? errorWidget;
  final Color? color;
  final BorderRadius borderRadius;

  HXImage({
    Key? key,
    this.fit = BoxFit.cover,
    required this.imageUrl,
    this.width,
    this.height,
    this.placeholder,
    this.errorWidget,
    this.color,
    this.borderRadius = BorderRadius.zero,
  }) : super(key: key);

  @override
  _HXTabBarState createState() => _HXTabBarState();
}

class _HXTabBarState extends State<HXImage> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return widget.borderRadius == BorderRadius.zero
        ? CachedNetworkImage(
            fit: widget.fit ?? BoxFit.fill,
            width: widget.width,
            height: widget.height,
            imageUrl: widget.imageUrl,
            placeholder: widget.placeholder,
            color: widget.color,
            errorWidget: widget.errorWidget ??
                (context, url, error) => CachedNetworkImage(
                      imageUrl: "${HttpConfig.assetsImgUrl}load_fail.png",
                      fit: BoxFit.cover,
                      width: widget.width,
                      height: widget.height,
                    ),
          )
        : ClipRRect(
            borderRadius: widget.borderRadius,
            child: CachedNetworkImage(
              fit: widget.fit ?? BoxFit.fill,
              width: widget.width,
              height: widget.height,
              imageUrl: widget.imageUrl,
              placeholder: widget.placeholder,
              color: widget.color,

              errorWidget: widget.errorWidget ??
                  (context, url, error) => CachedNetworkImage(
                        imageUrl: "${HttpConfig.assetsImgUrl}load_fail.png",
                        fit: BoxFit.cover,
                        width: widget.width,
                        height: widget.height,
                      ),
            ));
  }
}
