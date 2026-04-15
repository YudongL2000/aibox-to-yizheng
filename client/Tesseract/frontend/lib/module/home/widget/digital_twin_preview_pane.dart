/**
 * [INPUT]: 依赖 DigitalTwinSceneEnvelope 暴露的 preview sessions 与 top controls，依赖 Flutter Web iframe 预览资产。
 * [OUTPUT]: 对外提供 DigitalTwinPreviewPane、DigitalTwinTopControlStrip、DigitalTwinCameraPreviewFrame 与波形卡片，承载 mic/speaker/camera 预览区，并将 camera p2p 改为显式 connect/disconnect。
 * [POS]: module/home/widget 的左侧预览面板与顶部控制视图层，被 HomeWorkspacePage 直接嵌入。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

// ignore_for_file: avoid_web_libraries_in_flutter

import 'dart:async';
import 'dart:convert';
import 'dart:html' as html show IFrameElement, MessageEvent, window;
import 'dart:math' as math;
import 'dart:ui_web' as ui;

import 'package:aitesseract/module/device/model/digital_twin_scene_envelope.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

class DigitalTwinPreviewPane extends StatelessWidget {
  final List<DigitalTwinPreviewSessionState> previewSessions;
  final List<DigitalTwinTopControlState> topControls;
  final double headerHeight;
  final ValueChanged<DigitalTwinTopControlState>? onTopControlTapped;

  const DigitalTwinPreviewPane({
    super.key,
    required this.previewSessions,
    required this.topControls,
    required this.headerHeight,
    this.onTopControlTapped,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 0, 16),
      decoration: BoxDecoration(
        color: const Color(0xFF0C1220),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: const Color(0xFF00D9FF).withOpacity(0.12),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          SizedBox(
            height: headerHeight,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: <Widget>[
                  const Expanded(
                    child: Text(
                      'PREVIEW SESSIONS',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Color(0xFFB8C0D0),
                        fontSize: 12,
                        letterSpacing: 1,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  _buildCountChip(previewSessions.length.toString()),
                ],
              ),
            ),
          ),
          const Divider(color: Color(0xFF00D9FF), height: 1, thickness: 1),
          if (topControls.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: DigitalTwinTopControlStrip(
                controls: topControls,
                onTapped: onTopControlTapped,
              ),
            ),
          Expanded(
            child: previewSessions.isEmpty
                ? _buildEmptyPane()
                : ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: previewSessions.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final session = previewSessions[index];
                      if (session.isCamera) {
                        return DigitalTwinCameraPreviewFrame(
                          key: ValueKey<String>('camera-${session.sessionId}'),
                          session: session,
                        );
                      }
                      if (session.isSpeaker) {
                        return DigitalTwinWaveformCard(
                          session: session,
                          title: session.label,
                          icon: Icons.volume_up_rounded,
                          accentColor: const Color(0xFF7AE582),
                        );
                      }
                      return DigitalTwinWaveformCard(
                        session: session,
                        title: session.label,
                        icon: Icons.mic_rounded,
                        accentColor: const Color(0xFF00D9FF),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyPane() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          '等待 preview/runtime state 注入',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white.withOpacity(0.58),
            fontSize: 13,
            height: 1.5,
          ),
        ),
      ),
    );
  }

  Widget _buildCountChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF00D9FF).withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFF00D9FF).withOpacity(0.35)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xFF00D9FF),
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class DigitalTwinTopControlStrip extends StatelessWidget {
  final List<DigitalTwinTopControlState> controls;
  final ValueChanged<DigitalTwinTopControlState>? onTapped;

  const DigitalTwinTopControlStrip({
    super.key,
    required this.controls,
    this.onTapped,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: controls
          .map(
            (control) => _TopControlChip(
              control: control,
              onTapped: onTapped,
            ),
          )
          .toList(growable: false),
    );
  }
}

class _TopControlChip extends StatelessWidget {
  final DigitalTwinTopControlState control;
  final ValueChanged<DigitalTwinTopControlState>? onTapped;

  const _TopControlChip({
    required this.control,
    this.onTapped,
  });

  @override
  Widget build(BuildContext context) {
    final accent = control.isMicControl
        ? const Color(0xFF00D9FF)
        : const Color(0xFF7AE582);
    final icon =
        control.isMicControl ? Icons.mic_rounded : Icons.volume_up_rounded;
    return InkWell(
      onTap: control.enabled && onTapped != null
          ? () => onTapped!(control.copyWith(active: !control.active))
          : null,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: accent.withOpacity(control.active ? 0.18 : 0.08),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: control.active
                ? accent.withOpacity(0.55)
                : Colors.white.withOpacity(0.12),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(icon, size: 16, color: accent),
            const SizedBox(width: 6),
            Text(
              control.label,
              style: TextStyle(
                color: Colors.white.withOpacity(control.enabled ? 0.9 : 0.45),
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 8),
            _buildStatusDot(accent, control.active),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusDot(Color accent, bool active) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: active ? accent : Colors.white.withOpacity(0.2),
        shape: BoxShape.circle,
      ),
    );
  }
}

class DigitalTwinWaveformCard extends StatefulWidget {
  final DigitalTwinPreviewSessionState session;
  final String title;
  final IconData icon;
  final Color accentColor;

  const DigitalTwinWaveformCard({
    super.key,
    required this.session,
    required this.title,
    required this.icon,
    required this.accentColor,
  });

  @override
  State<DigitalTwinWaveformCard> createState() =>
      _DigitalTwinWaveformCardState();
}

class _DigitalTwinWaveformCardState extends State<DigitalTwinWaveformCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _syncAnimationState();
  }

  @override
  void didUpdateWidget(covariant DigitalTwinWaveformCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncAnimationState();
    if (oldWidget.session.amplitude != widget.session.amplitude ||
        oldWidget.session.muted != widget.session.muted ||
        oldWidget.session.active != widget.session.active) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _syncAnimationState() {
    if (widget.session.active && !widget.session.muted) {
      if (!_controller.isAnimating) {
        _controller.repeat();
      }
      return;
    }
    if (_controller.isAnimating) {
      _controller.stop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF121A2A),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: widget.accentColor.withOpacity(0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(widget.icon, color: widget.accentColor, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  widget.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              _buildStateChip(widget.session.active ? 'LIVE' : 'IDLE'),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            widget.session.muted ? '静音' : '采样中',
            style: TextStyle(
              color: Colors.white.withOpacity(0.62),
              fontSize: 11,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 72,
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) {
                return CustomPaint(
                  painter: _PreviewWaveformPainter(
                    amplitude: widget.session.amplitude,
                    phase: _controller.value * math.pi * 2,
                    color: widget.accentColor,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStateChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: widget.accentColor.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: widget.accentColor,
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _PreviewWaveformPainter extends CustomPainter {
  final double amplitude;
  final double phase;
  final Color color;

  const _PreviewWaveformPainter({
    required this.amplitude,
    required this.phase,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final barCount = 26;
    final barWidth = size.width / (barCount * 1.5);
    final baseHeight = size.height * 0.18;
    final maxHeight = size.height * 0.82;
    for (var i = 0; i < barCount; i += 1) {
      final wave = (math.sin(phase + i * 0.42) + 1) / 2;
      final normalized = (0.18 + wave * 0.82) * amplitude.clamp(0.12, 1.0);
      final height = baseHeight + normalized * maxHeight;
      final left = i * barWidth * 1.5;
      final top = size.height - height;
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(left, top, barWidth, height),
        const Radius.circular(999),
      );
      canvas.drawRRect(rect, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _PreviewWaveformPainter oldDelegate) {
    return oldDelegate.amplitude != amplitude ||
        oldDelegate.phase != phase ||
        oldDelegate.color != color;
  }
}

class DigitalTwinCameraPreviewFrame extends StatefulWidget {
  final DigitalTwinPreviewSessionState session;

  const DigitalTwinCameraPreviewFrame({
    super.key,
    required this.session,
  });

  @override
  State<DigitalTwinCameraPreviewFrame> createState() =>
      _DigitalTwinCameraPreviewFrameState();
}

class _DigitalTwinCameraPreviewFrameState
    extends State<DigitalTwinCameraPreviewFrame> {
  html.IFrameElement? _iframeElement;
  StreamSubscription<html.MessageEvent>? _messageSub;
  String? _iframeViewId;
  String _statusText = '等待 WebRTC 会话';
  bool _isLoading = false;
  bool _iframeReady = false;
  bool _shouldConnect = false;

  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      _messageSub = html.window.onMessage.listen(_handleWindowMessage);
      _initIframe();
    }
  }

  @override
  void didUpdateWidget(covariant DigitalTwinCameraPreviewFrame oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.session.sessionId != widget.session.sessionId) {
      _shouldConnect = false;
    }
    if ((widget.session.streamUrl ?? '').isEmpty) {
      _shouldConnect = false;
    }
    if (oldWidget.session.sessionId != widget.session.sessionId ||
        oldWidget.session.streamUrl != widget.session.streamUrl) {
      _initIframe();
    }
  }

  @override
  void dispose() {
    _messageSub?.cancel();
    super.dispose();
  }

  void _initIframe() {
    if (!kIsWeb ||
        widget.session.streamUrl == null ||
        widget.session.streamUrl!.isEmpty) {
      _iframeElement = null;
      _iframeViewId = null;
      _iframeReady = false;
      setState(() {
        _isLoading = false;
        _statusText = '等待 streamUrl';
      });
      return;
    }
    _iframeReady = false;
    setState(() {
      _isLoading = true;
      _statusText = _shouldConnect ? '正在准备预览通道' : '点击连接预览';
    });
    _iframeViewId =
        'camera_preview_${widget.session.sessionId}_${DateTime.now().microsecondsSinceEpoch}';
    ui.platformViewRegistry.registerViewFactory(_iframeViewId!, (int _) {
      final iframe = html.IFrameElement()
        ..src = _buildPreviewUrl()
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..allow = 'autoplay; encrypted-media; fullscreen'
        ..allowFullscreen = true
        ..onLoad.listen((_) {
          _iframeReady = true;
          if (!mounted) return;
          setState(() {
            _isLoading = false;
            _statusText = _shouldConnect ? '准备连接 P2P 预览' : '点击连接预览';
          });
          if (_shouldConnect) {
            _postConnectPreview();
          }
        })
        ..onError.listen((_) {
          _iframeReady = false;
          if (!mounted) return;
          setState(() {
            _isLoading = false;
            _statusText = 'iframe 加载失败';
          });
        });
      _iframeElement = iframe;
      return iframe;
    });
  }

  String _buildPreviewUrl() {
    final uri = Uri(
      path: '/model_viewer/p2p_preview.html',
      queryParameters: <String, String>{
        'sessionId': widget.session.sessionId,
        'channel': widget.session.sessionId,
        'audio': widget.session.controlState['audio']?.toString() ?? '7',
        'recvOnly': 'true',
      },
    );
    return uri.toString();
  }

  void _postConnectPreview() {
    final targetWindow = _iframeElement?.contentWindow;
    if (targetWindow == null) return;
    targetWindow.postMessage(
      jsonEncode(<String, dynamic>{
        'source': 'flutter-digital-twin-preview',
        'type': 'configure',
        'command': 'connect',
        'sessionId': widget.session.sessionId,
        'streamUrl': widget.session.streamUrl,
        'muted': widget.session.muted,
        'active': widget.session.active,
        'runtimeState': widget.session.runtimeState,
      }),
      '*',
    );
  }

  void _postStopPreview() {
    final targetWindow = _iframeElement?.contentWindow;
    if (targetWindow == null) return;
    targetWindow.postMessage(
      jsonEncode(<String, dynamic>{
        'source': 'flutter-digital-twin-preview',
        'type': 'stop',
        'sessionId': widget.session.sessionId,
      }),
      '*',
    );
  }

  void _togglePreviewConnection() {
    if ((widget.session.streamUrl ?? '').isEmpty) {
      setState(() {
        _statusText = '等待 streamUrl';
      });
      return;
    }

    final nextShouldConnect = !_shouldConnect;
    setState(() {
      _shouldConnect = nextShouldConnect;
      _statusText = nextShouldConnect ? '准备连接 P2P 预览' : '预览已断开';
    });

    if (!nextShouldConnect) {
      _postStopPreview();
      return;
    }

    if (_iframeReady) {
      _postConnectPreview();
      return;
    }

    _initIframe();
  }

  void _handleWindowMessage(html.MessageEvent event) {
    final data = _normalizeMessage(event.data);
    if (data == null) return;
    if (data['source']?.toString() != 'digital-twin-camera-preview') return;
    if (data['sessionId']?.toString() != widget.session.sessionId) return;
    final type = data['type']?.toString();
    if (type == 'preview-ready') {
      if (!mounted) return;
      setState(() {
        _statusText = 'P2P 预览已连接';
        _shouldConnect = true;
      });
    } else if (type == 'preview-state') {
      if (!mounted) return;
      setState(() {
        _statusText = data['message']?.toString() ?? '预览状态更新';
        if (data['state']?.toString() == 'stopped') {
          _shouldConnect = false;
        }
      });
    } else if (type == 'preview-error') {
      if (!mounted) return;
      setState(() {
        _statusText = data['message']?.toString() ?? '预览失败';
        _shouldConnect = false;
      });
    }
  }

  Map<String, dynamic>? _normalizeMessage(dynamic raw) {
    if (raw is String && raw.trim().isNotEmpty) {
      try {
        return _normalizeMessage(jsonDecode(raw));
      } catch (_) {
        return null;
      }
    }
    if (raw is Map<String, dynamic>) {
      return Map<String, dynamic>.from(raw);
    }
    if (raw is Map) {
      return Map<String, dynamic>.from(raw.cast<String, dynamic>());
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF121A2A),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF7AE582).withOpacity(0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(Icons.videocam_rounded,
                  color: Color(0xFF7AE582), size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  widget.session.label,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              _statusChip(),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            _statusText,
            style: TextStyle(
              color: Colors.white.withOpacity(0.62),
              fontSize: 11,
            ),
          ),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed: _isLoading ? null : _togglePreviewConnection,
              icon: Icon(
                _shouldConnect ? Icons.stop_circle_outlined : Icons.play_circle_fill_rounded,
                size: 16,
              ),
              label: Text(_shouldConnect ? '断开预览' : '连接预览'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF7AE582),
                side: BorderSide(color: const Color(0xFF7AE582).withOpacity(0.4)),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(height: 10),
          AspectRatio(
            aspectRatio: 16 / 9,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: Stack(
                fit: StackFit.expand,
                children: <Widget>[
                  if (kIsWeb &&
                      widget.session.streamUrl != null &&
                      widget.session.streamUrl!.isNotEmpty)
                    if (_iframeViewId != null)
                      HtmlElementView(
                        viewType: _iframeViewId!,
                        key: ValueKey<String>(
                          'camera-preview-${widget.session.sessionId}-${widget.session.streamUrl}',
                        ),
                      )
                    else
                      Container(
                        color: const Color(0xFF0A0E1A),
                        alignment: Alignment.center,
                        child: Text(
                          '准备 camera p2p iframe',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.55),
                            fontSize: 12,
                          ),
                        ),
                      )
                  else
                    Container(
                      color: const Color(0xFF0A0E1A),
                      alignment: Alignment.center,
                      child: Text(
                        '等待 camera p2p stream',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.55),
                          fontSize: 12,
                        ),
                      ),
                    ),
                  if (_isLoading)
                    Container(
                      color: Colors.black.withOpacity(0.22),
                      child: const Center(
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF7AE582),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusChip() {
    final active = widget.session.active;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF7AE582).withOpacity(active ? 0.16 : 0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        active ? 'LIVE' : 'IDLE',
        style: TextStyle(
          color:
              active ? const Color(0xFF7AE582) : Colors.white.withOpacity(0.55),
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
