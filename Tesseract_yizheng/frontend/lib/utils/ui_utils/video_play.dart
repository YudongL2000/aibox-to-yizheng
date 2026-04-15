import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

class VideoWidget extends StatefulWidget {
  final String videoUrl;
  final double? width;
  final double? height;

  const VideoWidget({Key? key, required this.videoUrl, this.width, this.height})
      : super(key: key);
  @override
  VideoWidgetState createState() => VideoWidgetState();
}

class VideoWidgetState extends State<VideoWidget> {
  late VideoPlayerController _controller;
  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.network('${widget.videoUrl}')
      ..initialize().then((_) {
        if (mounted) {
          setState(() {});
        }
      });
    _controller.setVolume(0.0);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Color iconColor = context.spatial.palette.textPrimary;
    return Column(
      children: <Widget>[
        Container(
          width: widget.width,
          height: widget.height,
          child: Stack(
            children: [
              VideoPlayer(_controller),
              Positioned.fill(
                  child: Container(
                      child: Center(
                child: InkWell(
                  child: _controller.value.isPlaying
                      ? Container()
                      : Icon(Icons.play_circle_outline_rounded,
                          color: iconColor, size: 40),
                  onTap: () {
                    _controller.value.isPlaying
                        ? _controller.pause()
                        : _controller.play();
                    if (mounted) {
                      setState(() {});
                    }
                  },
                ),
              )))
            ],
          ),
        ),
      ],
    );
  }
}
