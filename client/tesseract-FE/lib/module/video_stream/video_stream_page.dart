import 'dart:async';

import 'package:aitesseract/module/video_stream/model/video_stream_command_model.dart';
import 'package:aitesseract/server/mqtt/mqtt_device_config.dart';
import 'package:aitesseract/server/mqtt/mqtt_video_stream_service.dart';
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

/// 视频推拉流页：通过 MQTT 接收服务端命令，执行拉流播放 / 推流状态上报
/// Web 端仅支持拉流（播放）；推流由服务端或端侧执行，本端只上报状态
class VideoStreamPage extends StatefulWidget {
  const VideoStreamPage({super.key});

  @override
  State<VideoStreamPage> createState() => _VideoStreamPageState();
}

class _VideoStreamPageState extends State<VideoStreamPage> {
  final MqttVideoStreamService _mqtt = MqttVideoStreamService();
  StreamSubscription<VideoStreamCommand>? _cmdSub;

  String? _pullUrl;
  VideoPlayerController? _pullController;

  bool _pushActive = false;
  CameraController? _cameraController;
  List<CameraDescription> _cameras = [];
  String? _error;
  bool _connecting = false;
  String? _currentStreamId;

  @override
  void initState() {
    super.initState();
    _listenCommands();
  }

  void _listenCommands() {
    _cmdSub = _mqtt.commandStream.listen((cmd) {
      if (!mounted) return;
      if (cmd.isStartPull) {
        _startPull(cmd.url, cmd.streamId);
      } else if (cmd.isStartPush) {
        _startPush(cmd.streamKey, cmd.streamId);
      } else if (cmd.isStop) {
        _stop(cmd.streamId);
      }
    });
  }

  Future<void> _startPull(String? url, String? streamId) async {
    if (url == null || url.isEmpty) return;
    await _stop(streamId);
    setState(() {
      _currentStreamId = streamId;
      _pullUrl = url;
    });
    _pullController = VideoPlayerController.networkUrl(Uri.parse(url))
      ..initialize().then((_) {
        if (mounted && _pullUrl == url) {
          _pullController!.play();
          setState(() {});
        }
      }).catchError((e) {
        if (mounted) setState(() => _error = '拉流失败: $e');
      });
    _mqtt.publishStatus(VideoStreamStatus(
      streamId: streamId ?? 'default',
      status: 'pulling',
      message: url,
    ));
  }

  Future<void> _startPush(String? streamKey, String? streamId) async {
    await _stop(streamId);
    // Web 端不打开摄像头：推流由服务端/端侧执行，本端仅上报状态
    if (kIsWeb) {
      if (!mounted) return;
      setState(() {
        _pushActive = true;
        _currentStreamId = streamId;
        _error = null;
      });
      _mqtt.publishStatus(VideoStreamStatus(
        streamId: streamId ?? 'default',
        status: 'pushing',
        message: streamKey ?? 'web_client_ready',
      ));
      return;
    }
    if (_cameras.isEmpty) {
      try {
        _cameras = await availableCameras();
      } catch (e) {
        if (mounted) setState(() => _error = '获取摄像头失败: $e');
        return;
      }
    }
    if (_cameras.isEmpty) {
      setState(() => _error = '无可用摄像头');
      return;
    }
    final cam = _cameras.first;
    _cameraController = CameraController(
      cam,
      ResolutionPreset.medium,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );
    try {
      await _cameraController!.initialize();
    } catch (e) {
      if (mounted) setState(() => _error = '摄像头初始化失败: $e');
      return;
    }
    if (!mounted) return;
    setState(() {
      _pushActive = true;
      _currentStreamId = streamId;
      _error = null;
    });
    _mqtt.publishStatus(VideoStreamStatus(
      streamId: streamId ?? 'default',
      status: 'pushing',
      message: streamKey,
    ));
  }

  Future<void> _stop(String? streamId) async {
    if (streamId != null && _currentStreamId != null && streamId != _currentStreamId) return;
    await _pullController?.dispose();
    _pullController = null;
    await _cameraController?.dispose();
    _cameraController = null;
    if (mounted) {
      setState(() {
        _pullUrl = null;
        _pushActive = false;
        _currentStreamId = null;
      });
    }
    _mqtt.publishStatus(VideoStreamStatus(
      streamId: streamId ?? 'default',
      status: 'stopped',
    ));
  }

  @override
  void dispose() {
    _cmdSub?.cancel();
    _pullController?.dispose();
    _cameraController?.dispose();
    _mqtt.dispose();
    super.dispose();
  }

  Future<void> _connect() async {
    if (_connecting) return;
    setState(() {
      _connecting = true;
      _error = null;
    });
    final ok = await _mqtt.connectAndSubscribe();
    if (!mounted) return;
    setState(() {
      _connecting = false;
      if (!ok) _error = 'MQTT 连接失败';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E1A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0E1A),
        title: const Text(
          '视频推拉流',
          style: TextStyle(color: Colors.white, fontSize: 18),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          if (_mqtt.isConnected)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFF28CA42),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '已连接',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.8),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            TextButton(
              onPressed: _connecting ? null : _connect,
              child: Text(
                _connecting ? '连接中…' : '连接 MQTT',
                style: const TextStyle(color: Color(0xFF00D9FF)),
              ),
            ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                _error!,
                style: const TextStyle(color: Colors.redAccent, fontSize: 13),
              ),
            ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              '订阅: ${MqttVideoStreamConfig.topicCommand} · 上报: ${MqttVideoStreamConfig.topicStatus}',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.5),
                fontSize: 12,
              ),
            ),
          ),
          Expanded(
            child: _buildContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (!_mqtt.isConnected) {
      return Center(
        child: Text(
          '请先连接 MQTT，等待服务端下发 start_pull / start_push / stop 命令',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.6),
            fontSize: 14,
          ),
          textAlign: TextAlign.center,
        ),
      );
    }
    if (_pushActive) {
      // Web 端：不展示摄像头，仅提示推流由服务端/端侧执行
      if (kIsWeb) {
        return Container(
          margin: const EdgeInsets.all(16),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: const Color(0xFF151923),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF00D9FF).withValues(alpha: 0.3)),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.cloud_upload, size: 48, color: Colors.white.withValues(alpha: 0.6)),
              const SizedBox(height: 16),
              Text(
                '推流由服务端/端侧执行',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 16),
              ),
              const SizedBox(height: 8),
              Text(
                'Web 端仅上报状态，已通知服务端',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 13),
              ),
            ],
          ),
        );
      }
      if (_cameraController != null && _cameraController!.value.isInitialized) {
        return Container(
          margin: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF00D9FF).withValues(alpha: 0.3)),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: CameraPreview(_cameraController!),
          ),
        );
      }
    }
    if (_pullUrl != null && _pullController != null) {
      return Container(
        margin: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF00D9FF).withValues(alpha: 0.3)),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: _pullController!.value.isInitialized
              ? Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox.expand(
                      child: FittedBox(
                        fit: BoxFit.contain,
                        child: SizedBox(
                          width: _pullController!.value.size.width,
                          height: _pullController!.value.size.height,
                          child: VideoPlayer(_pullController!),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 16,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: Icon(
                              _pullController!.value.isPlaying ? Icons.pause : Icons.play_arrow,
                              color: Colors.white,
                              size: 36,
                            ),
                            onPressed: () {
                              setState(() {
                                _pullController!.value.isPlaying
                                    ? _pullController!.pause()
                                    : _pullController!.play();
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                )
              : const Center(child: CircularProgressIndicator(color: Color(0xFF00D9FF))),
        ),
      );
    }
    if (_pullUrl != null && _pullController == null) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF00D9FF)));
    }
    return Center(
      child: Text(
        '等待服务端下发命令（start_pull / start_push / stop）',
        style: TextStyle(
          color: Colors.white.withValues(alpha: 0.6),
          fontSize: 14,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }
}
