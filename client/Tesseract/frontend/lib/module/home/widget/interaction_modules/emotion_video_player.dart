import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:aitesseract/server/Http_config.dart';

/// 情绪视频播放器组件
/// 用于在选项后方显示本地视频（生气、平和、难过、开心）
class EmotionVideoPlayer extends StatefulWidget {
  final String emotion; // 情绪名称：生气、平和、难过、开心
  final double? width;
  final double? height;

  const EmotionVideoPlayer({
    super.key,
    required this.emotion,
    this.width,
    this.height,
  });

  @override
  State<EmotionVideoPlayer> createState() => _EmotionVideoPlayerState();
}

class _EmotionVideoPlayerState extends State<EmotionVideoPlayer> {
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    try {
      final videoUrl =
          '${HttpConfig.magiBaseUrl}/assets/assets/videos/${widget.emotion}.mp4';

      _controller = VideoPlayerController.networkUrl(Uri.parse(videoUrl))
        ..setVolume(0.0) // 静音
        ..setLooping(true); // 循环播放

      await _controller!.initialize();

      if (mounted) {
        setState(() {
          _isInitialized = true;
        });
        // 自动播放
        _controller!.play();
      }
    } catch (e) {
      print('加载视频失败: $e');
      if (mounted) {
        setState(() {
          _hasError = true;
        });
      }
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return const SizedBox.shrink(); // 加载失败时不显示
    }

    if (!_isInitialized || _controller == null) {
      return SizedBox(
        width: widget.width ?? 40,
        height: widget.height ?? 40,
        child: const Center(
          child: SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Color(0xFF00D9FF),
            ),
          ),
        ),
      );
    }

    return Container(
      width: widget.width ?? 40,
      height: widget.height ?? 40,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withOpacity(0.2), width: 1),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: SizedBox.expand(
          child: FittedBox(
            fit: BoxFit.cover,
            child: SizedBox(
              width: _controller!.value.size.width,
              height: _controller!.value.size.height,
              child: VideoPlayer(_controller!),
            ),
          ),
        ),
      ),
    );
  }
}
