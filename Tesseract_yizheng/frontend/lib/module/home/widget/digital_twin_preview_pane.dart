/*
 * [INPUT]: 依赖 DigitalTwinSceneEnvelope 暴露的 preview sessions 与 top controls，依赖 Flutter Web iframe 预览资产。
 * [OUTPUT]: 对外提供 DigitalTwinPreviewPane、DigitalTwinTopControlStrip、DigitalTwinCameraPreviewFrame 与波形卡片，承载 mic/speaker/camera 预览区，并将 camera p2p 改为显式 connect/disconnect；preview pane 本身不再输出额外外层 panel/top-control 壳，只保留低圆角矩形内容列表，同时把 inactive preview session 默认折叠成可展开按钮，并压平 camera 预览内部的多层嵌套框；组件可按需被宿主作为画布 overlay 叠加展示。
 * [POS]: module/home/widget 的配件 preview 与顶部控制视图层，被 HomeWorkspacePage 直接嵌入，也是工作台 preview 语言收口点。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

// ignore_for_file: avoid_web_libraries_in_flutter

import 'dart:async';
import 'dart:convert';
import 'dart:html' as html show IFrameElement, MessageEvent, window;
import 'dart:math' as math;
import 'dart:ui_web' as ui;

import 'package:aitesseract/module/device/model/digital_twin_scene_envelope.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

class DigitalTwinPreviewPane extends StatefulWidget {
  final List<DigitalTwinPreviewSessionState> previewSessions;
  final EdgeInsetsGeometry padding;

  const DigitalTwinPreviewPane({
    super.key,
    required this.previewSessions,
    this.padding = const EdgeInsets.symmetric(vertical: 12),
  });

  @override
  State<DigitalTwinPreviewPane> createState() => _DigitalTwinPreviewPaneState();
}

class _DigitalTwinPreviewPaneState extends State<DigitalTwinPreviewPane> {
  final Set<String> _expandedInactiveSessionIds = <String>{};

  @override
  void didUpdateWidget(covariant DigitalTwinPreviewPane oldWidget) {
    super.didUpdateWidget(oldWidget);
    final sessionsById = <String, DigitalTwinPreviewSessionState>{
      for (final session in widget.previewSessions) session.sessionId: session,
    };
    _expandedInactiveSessionIds.removeWhere((sessionId) {
      final session = sessionsById[sessionId];
      return session == null || session.active;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.previewSessions.isEmpty) {
      return _buildEmptyPane();
    }
    final List<Widget> children = <Widget>[];
    for (var index = 0; index < widget.previewSessions.length; index += 1) {
      final session = widget.previewSessions[index];
      final presentation = _sessionPresentation(context, session);
      if (!_isExpanded(session)) {
        children.add(
          _CollapsedPreviewSessionButton(
            session: session,
            title: presentation.title,
            icon: presentation.icon,
            accentColor: presentation.accentColor,
            onPressed: () => _setExpanded(session.sessionId, true),
          ),
        );
      } else if (session.isCamera) {
        children.add(
          DigitalTwinCameraPreviewFrame(
            key: ValueKey<String>('camera-${session.sessionId}'),
            session: session,
            title: presentation.title,
            icon: presentation.icon,
            accentColor: presentation.accentColor,
            onCollapse: session.active
                ? null
                : () => _setExpanded(session.sessionId, false),
          ),
        );
      } else {
        children.add(
          DigitalTwinWaveformCard(
            session: session,
            title: presentation.title,
            icon: presentation.icon,
            accentColor: presentation.accentColor,
            onCollapse: session.active
                ? null
                : () => _setExpanded(session.sessionId, false),
          ),
        );
      }
      if (index < widget.previewSessions.length - 1) {
        children.add(const SizedBox(height: 12));
      }
    }
    return SingleChildScrollView(
      padding: widget.padding,
      primary: false,
      physics: const ClampingScrollPhysics(),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    );
  }

  bool _isExpanded(DigitalTwinPreviewSessionState session) {
    return session.active ||
        _expandedInactiveSessionIds.contains(session.sessionId);
  }

  void _setExpanded(String sessionId, bool expanded) {
    setState(() {
      if (expanded) {
        _expandedInactiveSessionIds.add(sessionId);
        return;
      }
      _expandedInactiveSessionIds.remove(sessionId);
    });
  }

  _PreviewSessionPresentation _sessionPresentation(
    BuildContext context,
    DigitalTwinPreviewSessionState session,
  ) {
    final spatial = context.spatial;
    if (session.isCamera) {
      return _PreviewSessionPresentation(
        title: session.label,
        icon: Icons.videocam_rounded,
        accentColor: spatial.status(SpatialStatusTone.success),
      );
    }
    if (session.isSpeaker) {
      return _PreviewSessionPresentation(
        title: session.label,
        icon: Icons.volume_up_rounded,
        accentColor: spatial.status(SpatialStatusTone.success),
      );
    }
    return _PreviewSessionPresentation(
      title: session.label,
      icon: Icons.mic_rounded,
      accentColor: spatial.status(SpatialStatusTone.info),
    );
  }

  Widget _buildEmptyPane() => const SizedBox.shrink();
}

class _PreviewSessionPresentation {
  final String title;
  final IconData icon;
  final Color accentColor;

  const _PreviewSessionPresentation({
    required this.title,
    required this.icon,
    required this.accentColor,
  });
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
    final spatial = context.spatial;
    final accent = control.isMicControl
        ? spatial.status(SpatialStatusTone.info)
        : spatial.status(SpatialStatusTone.success);
    final icon =
        control.isMicControl ? Icons.mic_rounded : Icons.volume_up_rounded;
    return InkWell(
      onTap: control.enabled && onTapped != null
          ? () => onTapped!(control.copyWith(active: !control.active))
          : null,
      borderRadius: BorderRadius.circular(spatial.radiusMd),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: control.active
              ? accent.withValues(alpha: 0.12)
              : spatial.surface(SpatialSurfaceTone.dataBlock),
          borderRadius: BorderRadius.circular(spatial.radiusMd),
          border: Border.all(
            color: control.active
                ? accent.withValues(alpha: 0.42)
                : spatial.borderSubtle,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(icon, size: 16, color: accent),
            const SizedBox(width: 6),
            Text(
              control.label,
              style: spatial.monoTextStyle(
                color: control.enabled
                    ? spatial.palette.textPrimary
                    : spatial.textMuted.withValues(alpha: 0.55),
                size: 10,
              ),
            ),
            const SizedBox(width: 8),
            _buildStatusDot(context, accent, control.active),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusDot(BuildContext context, Color accent, bool active) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color:
            active ? accent : context.spatial.textMuted.withValues(alpha: 0.45),
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
  final VoidCallback? onCollapse;

  const DigitalTwinWaveformCard({
    super.key,
    required this.session,
    required this.title,
    required this.icon,
    required this.accentColor,
    this.onCollapse,
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
      duration: Duration(
        milliseconds: SpatialDesignTokens.motionSlow.inMilliseconds * 3,
      ),
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
    final spatial = context.spatial;
    return _PreviewSessionShell(
      icon: widget.icon,
      title: widget.title,
      accentColor: widget.accentColor,
      active: widget.session.active,
      onCollapse: widget.onCollapse,
      body: Container(
        decoration: spatial.dataBlockDecoration(
          accent: widget.accentColor,
          radius: spatial.radiusSm,
        ),
        padding: const EdgeInsets.all(12),
        child: SizedBox(
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
        const Radius.circular(2),
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
  final String title;
  final IconData icon;
  final Color accentColor;
  final VoidCallback? onCollapse;

  const DigitalTwinCameraPreviewFrame({
    super.key,
    required this.session,
    required this.title,
    required this.icon,
    required this.accentColor,
    this.onCollapse,
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
  String _statusText = '';
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
    if (_shouldConnect) {
      _postStopPreview();
    }
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
        _statusText = '';
      });
      return;
    }
    _iframeReady = false;
    setState(() {
      _isLoading = true;
      _statusText = _shouldConnect ? '连接中' : '';
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
            _statusText = _shouldConnect ? '连接中' : '';
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
            _statusText = '加载失败';
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
      return;
    }

    final nextShouldConnect = !_shouldConnect;
    setState(() {
      _shouldConnect = nextShouldConnect;
      _statusText = nextShouldConnect ? '连接中' : '';
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
        _statusText = '已连接';
        _shouldConnect = true;
      });
    } else if (type == 'preview-state') {
      if (!mounted) return;
      setState(() {
        _statusText = data['message']?.toString() ?? '';
        if (data['state']?.toString() == 'stopped') {
          _shouldConnect = false;
          _statusText = '';
        }
      });
    } else if (type == 'preview-error') {
      if (!mounted) return;
      setState(() {
        _statusText = data['message']?.toString() ?? '连接失败';
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
    final spatial = context.spatial;
    return _PreviewSessionShell(
      icon: widget.icon,
      title: widget.title,
      accentColor: widget.accentColor,
      active: widget.session.active,
      onCollapse: widget.onCollapse,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  _statusText.isNotEmpty ? _statusText : '等待 streamUrl',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: spatial.captionTextStyle().copyWith(fontSize: 11),
                ),
              ),
              const SizedBox(width: 10),
              OutlinedButton.icon(
                onPressed: _isLoading ? null : _togglePreviewConnection,
                icon: Icon(
                  _shouldConnect
                      ? Icons.stop_circle_outlined
                      : Icons.play_circle_fill_rounded,
                  size: 16,
                ),
                label: Text(_shouldConnect ? '断开预览' : '连接预览'),
                style: spatial.secondaryButtonStyle(accent: widget.accentColor),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(spatial.radiusSm),
            child: AspectRatio(
              aspectRatio: 16 / 9,
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
                        color: spatial.surface(SpatialSurfaceTone.overlay),
                      )
                  else
                    Container(
                      color: spatial.surface(SpatialSurfaceTone.overlay),
                      alignment: Alignment.centerLeft,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: Text(
                        '等待 streamUrl',
                        style: spatial.bodyTextStyle().copyWith(
                              color: spatial.textMuted,
                            ),
                      ),
                    ),
                  if (_isLoading)
                    Container(
                      color: spatial.surface(SpatialSurfaceTone.overlay),
                      child: Center(
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: widget.accentColor,
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
}

class _PreviewSessionShell extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color accentColor;
  final bool active;
  final Widget body;
  final VoidCallback? onCollapse;

  const _PreviewSessionShell({
    required this.icon,
    required this.title,
    required this.accentColor,
    required this.active,
    required this.body,
    this.onCollapse,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: spatial.panelDecoration(
        tone: SpatialSurfaceTone.dataBlock,
        accent: accentColor,
        radius: spatial.radiusMd,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(icon, color: accentColor, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: spatial.cardTitleStyle().copyWith(fontSize: 13),
                ),
              ),
              if (onCollapse != null) ...<Widget>[
                _PreviewHeaderIconButton(
                  icon: Icons.unfold_less_rounded,
                  accentColor: accentColor,
                  tooltip: '收起模块',
                  onPressed: onCollapse!,
                ),
                const SizedBox(width: 8),
              ],
              _PreviewStateChip(
                label: active ? 'LIVE' : 'IDLE',
                accentColor: accentColor,
                active: active,
              ),
            ],
          ),
          const SizedBox(height: 12),
          body,
        ],
      ),
    );
  }
}

class _PreviewStateChip extends StatelessWidget {
  final String label;
  final Color accentColor;
  final bool active;

  const _PreviewStateChip({
    required this.label,
    required this.accentColor,
    required this.active,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: accentColor.withValues(alpha: active ? 0.16 : 0.08),
        borderRadius: BorderRadius.circular(spatial.radiusSm),
        border: Border.all(
          color: active
              ? accentColor.withValues(alpha: 0.28)
              : spatial.borderSubtle,
        ),
      ),
      child: Text(
        label,
        style: spatial.monoTextStyle(
          color: active ? accentColor : spatial.textMuted,
          size: 10,
        ),
      ),
    );
  }
}

class _PreviewHeaderIconButton extends StatelessWidget {
  final IconData icon;
  final Color accentColor;
  final String tooltip;
  final VoidCallback onPressed;

  const _PreviewHeaderIconButton({
    required this.icon,
    required this.accentColor,
    required this.tooltip,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(spatial.radiusSm),
        child: Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: accentColor.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(spatial.radiusSm),
            border: Border.all(
              color: accentColor.withValues(alpha: 0.24),
            ),
          ),
          child: Icon(
            icon,
            size: 14,
            color: accentColor,
          ),
        ),
      ),
    );
  }
}

class _CollapsedPreviewSessionButton extends StatelessWidget {
  final DigitalTwinPreviewSessionState session;
  final String title;
  final IconData icon;
  final Color accentColor;
  final VoidCallback onPressed;

  const _CollapsedPreviewSessionButton({
    required this.session,
    required this.title,
    required this.icon,
    required this.accentColor,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    return Align(
      alignment: Alignment.centerLeft,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(spatial.radiusSm),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: spatial.panelDecoration(
            tone: SpatialSurfaceTone.panel,
            accent: accentColor,
            radius: spatial.radiusSm,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(icon, color: accentColor, size: 16),
              const SizedBox(width: 8),
              Text(
                title,
                style: spatial.monoTextStyle(
                  color: spatial.palette.textPrimary,
                  size: 10,
                ),
              ),
              const SizedBox(width: 8),
              _PreviewStateChip(
                label: session.active ? 'LIVE' : 'IDLE',
                accentColor: accentColor,
                active: session.active,
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.unfold_more_rounded,
                size: 14,
                color: spatial.textMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
