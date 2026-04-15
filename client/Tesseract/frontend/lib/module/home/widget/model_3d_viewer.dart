/*
 * [INPUT]: 依赖 Flutter Web 的 HtmlElementView、iframe postMessage 与 three.js viewer 页面，并消费 JSON-safe 的 host/viewer 协议消息。
 * [OUTPUT]: 对外提供 Model3DViewer 组件、Model3DViewerController、Model3DTransform、Model3DLightingConfig 与消息协议桥接能力，其中 transform 统一代表预览窗口全局坐标系的绝对位姿，并支持场景初始化缩放、运行时缩放同步与 viewer 诊断日志。
 * [POS]: module/home/widget 的数字孪生渲染桥，被 HomeWorkspacePage 用来驱动 iframe 内的 three.js viewer。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:async';
import 'dart:convert';
import 'dart:html' as html show IFrameElement, MessageEvent, window;
import 'dart:ui_web' as ui;

import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:flutter/foundation.dart' show kIsWeb, listEquals;
import 'package:flutter/material.dart';

const String _viewerSource = 'digital-twin-viewer';
const String _hostSource = 'flutter-digital-twin';
const int _viewerProtocolVersion = 1;

enum Model3DInteractionMode { translate, rotate }

class Model3DTransform {
  final int index;
  final String modelId;
  final double posX;
  final double posY;
  final double posZ;
  final double rotX;
  final double rotY;
  final double rotZ;
  final double scaleX;
  final double scaleY;
  final double scaleZ;

  const Model3DTransform({
    required this.index,
    required this.modelId,
    this.posX = 0,
    this.posY = 0,
    this.posZ = 0,
    this.rotX = 0,
    this.rotY = 0,
    this.rotZ = 0,
    this.scaleX = 1,
    this.scaleY = 1,
    this.scaleZ = 1,
  });

  /// 统一以预览窗口全局坐标系中的绝对位姿表达。
  List<double> get position => <double>[posX, posY, posZ];
  List<double> get rotation => <double>[rotX, rotY, rotZ];
  List<double> get scale => <double>[scaleX, scaleY, scaleZ];

  Model3DTransform copyWith({
    int? index,
    String? modelId,
    double? posX,
    double? posY,
    double? posZ,
    double? rotX,
    double? rotY,
    double? rotZ,
    double? scaleX,
    double? scaleY,
    double? scaleZ,
  }) {
    return Model3DTransform(
      index: index ?? this.index,
      modelId: modelId ?? this.modelId,
      posX: posX ?? this.posX,
      posY: posY ?? this.posY,
      posZ: posZ ?? this.posZ,
      rotX: rotX ?? this.rotX,
      rotY: rotY ?? this.rotY,
      rotZ: rotZ ?? this.rotZ,
      scaleX: scaleX ?? this.scaleX,
      scaleY: scaleY ?? this.scaleY,
      scaleZ: scaleZ ?? this.scaleZ,
    );
  }

  Map<String, dynamic> toProtocolJson() {
    return <String, dynamic>{
      'index': index,
      'modelId': modelId,
      'position': <String, double>{
        'x': posX,
        'y': posY,
        'z': posZ,
      },
      'rotation': <String, double>{
        'x': rotX,
        'y': rotY,
        'z': rotZ,
      },
      'scale': <String, double>{
        'x': scaleX,
        'y': scaleY,
        'z': scaleZ,
      },
    };
  }
}

class Model3DLightingConfig {
  final String backgroundHex;
  final double ambientIntensity;
  final double keyLightIntensity;
  final double keyLightPosX;
  final double keyLightPosY;
  final double keyLightPosZ;

  const Model3DLightingConfig({
    this.backgroundHex = '#0A0E1A',
    this.ambientIntensity = 0.65,
    this.keyLightIntensity = 0.95,
    this.keyLightPosX = 5,
    this.keyLightPosY = 10,
    this.keyLightPosZ = 7,
  });

  List<double> get keyLightPosition => <double>[
        keyLightPosX,
        keyLightPosY,
        keyLightPosZ,
      ];

  Model3DLightingConfig copyWith({
    String? backgroundHex,
    double? ambientIntensity,
    double? keyLightIntensity,
    double? keyLightPosX,
    double? keyLightPosY,
    double? keyLightPosZ,
  }) {
    return Model3DLightingConfig(
      backgroundHex: backgroundHex ?? this.backgroundHex,
      ambientIntensity: ambientIntensity ?? this.ambientIntensity,
      keyLightIntensity: keyLightIntensity ?? this.keyLightIntensity,
      keyLightPosX: keyLightPosX ?? this.keyLightPosX,
      keyLightPosY: keyLightPosY ?? this.keyLightPosY,
      keyLightPosZ: keyLightPosZ ?? this.keyLightPosZ,
    );
  }

  Map<String, dynamic> toProtocolJson() {
    return <String, dynamic>{
      'backgroundColor': backgroundHex,
      'ambientIntensity': ambientIntensity,
      'keyLightIntensity': keyLightIntensity,
      'keyLightPosition': <String, double>{
        'x': keyLightPosX,
        'y': keyLightPosY,
        'z': keyLightPosZ,
      },
    };
  }
}

class Model3DViewerController {
  _Model3DViewerState? _state;
  List<Model3DTransform> _pendingTransforms = const <Model3DTransform>[];
  String? _selectedModelId;
  Model3DInteractionMode _interactionMode = Model3DInteractionMode.translate;
  Model3DLightingConfig _lightingConfig = const Model3DLightingConfig();

  void _attach(_Model3DViewerState state) {
    _state = state;
    _flush();
  }

  void _detach(_Model3DViewerState state) {
    if (identical(_state, state)) {
      _state = null;
    }
  }

  void updateTransforms(List<Model3DTransform> transforms) {
    _pendingTransforms = List<Model3DTransform>.from(transforms);
    _state?._postTransforms(_pendingTransforms);
  }

  void setSelectedModel(String? modelId) {
    _selectedModelId = modelId;
    _state?._postSelection(modelId);
  }

  void setInteractionMode(Model3DInteractionMode mode) {
    _interactionMode = mode;
    _state?._postInteractionMode(mode);
  }

  void setLightingConfig(Model3DLightingConfig config) {
    _lightingConfig = config;
    _state?._postLightingConfig(config);
  }

  void requestSnapshot() {
    _state?._requestSnapshot();
  }

  void _flush() {
    _state?._postLightingConfig(_lightingConfig);
    _state?._postInteractionMode(_interactionMode);
    _state?._postSelection(_selectedModelId);
    if (_pendingTransforms.isNotEmpty) {
      _state?._postTransforms(_pendingTransforms);
    }
  }
}

class Model3DViewer extends StatefulWidget {
  final String? modelUrl;
  final List<String>? modelUrls;
  final List<String>? modelIds;
  final String layout;
  final double spacing;
  final List<List<double>>? initialPositions;
  final List<List<double>>? initialRotations;
  final List<List<double>>? initialScales;
  final bool draggable;
  final String? fileFormat;
  final String placeholderText;
  final Color backgroundColor;
  final void Function(List<Model3DTransform>)? onTransformsChanged;
  final ValueChanged<String?>? onSelectionChanged;
  final ValueChanged<bool>? onViewerReadyChanged;
  final Model3DViewerController? controller;

  const Model3DViewer({
    super.key,
    this.modelUrl,
    this.modelUrls,
    this.modelIds,
    this.layout = 'center',
    this.spacing = 1.5,
    this.initialPositions,
    this.initialRotations,
    this.initialScales,
    this.draggable = true,
    this.fileFormat,
    this.placeholderText = 'AWAITING 3D MODEL',
    this.backgroundColor = const Color(0xFF0A0E1A),
    this.onTransformsChanged,
    this.onSelectionChanged,
    this.onViewerReadyChanged,
    this.controller,
  });

  @override
  State<Model3DViewer> createState() => _Model3DViewerState();
}

class _Model3DViewerState extends State<Model3DViewer> {
  String? _iframeViewId;
  String? _channelId;
  bool _isLoading = false;
  bool _viewerReady = false;
  String? _errorMessage;
  html.IFrameElement? _iframeElement;
  StreamSubscription<html.MessageEvent>? _messageSub;

  List<String> get _effectiveUrls {
    final urls = widget.modelUrls;
    if (urls != null && urls.isNotEmpty) {
      return urls
          .map(DigitalTwinModelItem.normalizeFlutterWebModelAssetUrl)
          .toList(growable: false);
    }
    final single = widget.modelUrl;
    if (single != null && single.isNotEmpty) {
      return <String>[
        DigitalTwinModelItem.normalizeFlutterWebModelAssetUrl(single),
      ];
    }
    return const <String>[];
  }

  List<String> get _effectiveModelIds {
    final ids = widget.modelIds;
    if (ids != null && ids.length == _effectiveUrls.length) {
      return List<String>.from(ids);
    }
    return List<String>.generate(
      _effectiveUrls.length,
      (int index) => 'model_${index + 1}',
    );
  }

  @override
  void initState() {
    super.initState();
    widget.controller?._attach(this);
    if (kIsWeb) {
      _messageSub = html.window.onMessage.listen(_handleWindowMessage);
    }
    if (kIsWeb && _effectiveUrls.isNotEmpty) {
      _initViewer();
    }
  }

  @override
  void didUpdateWidget(Model3DViewer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller?._detach(this);
      widget.controller?._attach(this);
    }
    if (_shouldRebuildViewer(oldWidget)) {
      if (kIsWeb && _effectiveUrls.isNotEmpty) {
        debugPrint(
          '[DigitalTwin][ViewerBridge] rebuild viewer urls=${_effectiveUrls.length} modelIds=${_effectiveModelIds.join(",")}',
        );
        _initViewer();
      }
    }
  }

  @override
  void dispose() {
    _messageSub?.cancel();
    widget.controller?._detach(this);
    super.dispose();
  }

  bool _shouldRebuildViewer(Model3DViewer oldWidget) {
    return !_stringListEquals(oldWidget.modelUrls, widget.modelUrls) ||
        !_stringListEquals(oldWidget.modelIds, widget.modelIds) ||
        oldWidget.modelUrl != widget.modelUrl ||
        oldWidget.layout != widget.layout ||
        oldWidget.spacing != widget.spacing ||
        !_vectorMatrixEquals(
            oldWidget.initialPositions, widget.initialPositions) ||
        !_vectorMatrixEquals(
          oldWidget.initialRotations,
          widget.initialRotations,
        ) ||
        !_vectorMatrixEquals(oldWidget.initialScales, widget.initialScales) ||
        oldWidget.draggable != widget.draggable;
  }

  void _handleWindowMessage(html.MessageEvent event) {
    if (!mounted) return;
    final data = _normalizeViewerMessagePayload(event.data);
    if (data == null) return;
    if (data['source'] != _viewerSource) return;
    if (data['channel'] != _channelId) return;

    final type = data['type']?.toString();
    switch (type) {
      case 'viewerReady':
        final modelCount = (data['modelCount'] as num?)?.toInt() ?? 0;
        debugPrint(
          '[DigitalTwin][ViewerBridge] viewerReady channel=$_channelId modelCount=$modelCount',
        );
        setState(() {
          _viewerReady = true;
        });
        widget.onViewerReadyChanged?.call(true);
        widget.controller?._flush();
        widget.controller?.requestSnapshot();
        break;
      case 'selectionChanged':
        widget.onSelectionChanged?.call(data['modelId']?.toString());
        break;
      case 'transformsChanged':
        final transforms = _parseTransforms(data['models']);
        debugPrint(
          '[DigitalTwin][ViewerBridge] transformsChanged channel=$_channelId models=${transforms.length}',
        );
        if (transforms.isNotEmpty) {
          widget.onTransformsChanged?.call(transforms);
        }
        break;
      case 'viewerError':
        final msg = data['message']?.toString() ?? '3D viewer failed';
        debugPrint('[DigitalTwin][ViewerBridge] viewerError: $msg');
        setState(() {
          _isLoading = false;
          _errorMessage = msg;
        });
        break;
      default:
        break;
    }
  }

  Map<String, dynamic>? _normalizeViewerMessagePayload(dynamic raw) {
    if (raw is String && raw.trim().isNotEmpty) {
      try {
        return _normalizeViewerMessagePayload(jsonDecode(raw));
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

  List<Model3DTransform> _parseTransforms(dynamic raw) {
    if (raw is! List) return const <Model3DTransform>[];
    final result = <Model3DTransform>[];
    for (final item in raw) {
      if (item is! Map) continue;
      final index = (item['index'] as num?)?.toInt() ?? result.length;
      final position = item['position'];
      final rotation = item['rotation'];
      final scale = item['scale'];
      result.add(
        Model3DTransform(
          index: index,
          modelId: item['modelId']?.toString() ?? 'model_${index + 1}',
          posX: _readAxis(position, 'x'),
          posY: _readAxis(position, 'y'),
          posZ: _readAxis(position, 'z'),
          rotX: _readAxis(rotation, 'x'),
          rotY: _readAxis(rotation, 'y'),
          rotZ: _readAxis(rotation, 'z'),
          scaleX: _readAxis(scale, 'x', fallback: 1),
          scaleY: _readAxis(scale, 'y', fallback: 1),
          scaleZ: _readAxis(scale, 'z', fallback: 1),
        ),
      );
    }
    return result;
  }

  double _readAxis(dynamic raw, String key, {double fallback = 0}) {
    if (raw is Map) {
      final value = raw[key];
      if (value is num) return value.toDouble();
    }
    return fallback;
  }

  void _postToViewer(String type, {Map<String, dynamic>? payload}) {
    if (!kIsWeb) return;
    final targetWindow = _iframeElement?.contentWindow;
    final channel = _channelId;
    if (targetWindow == null || channel == null) return;
    final message = <String, dynamic>{
      'source': _hostSource,
      'version': _viewerProtocolVersion,
      'channel': channel,
      'type': type,
    };
    if (payload != null) {
      message.addAll(payload);
    }
    targetWindow.postMessage(jsonEncode(message), '*');
  }

  void _postTransforms(List<Model3DTransform> transforms) {
    _postToViewer(
      'setTransforms',
      payload: <String, dynamic>{
        'models': transforms
            .map((Model3DTransform item) => item.toProtocolJson())
            .toList(),
      },
    );
  }

  void _postSelection(String? modelId) {
    _postToViewer(
      'selectModel',
      payload: <String, dynamic>{'modelId': modelId},
    );
  }

  void _postInteractionMode(Model3DInteractionMode mode) {
    _postToViewer(
      'setInteractionMode',
      payload: <String, dynamic>{'mode': mode.name},
    );
  }

  void _postLightingConfig(Model3DLightingConfig config) {
    _postToViewer(
      'setLighting',
      payload: config.toProtocolJson(),
    );
  }

  void _requestSnapshot() {
    _postToViewer('requestSnapshot');
  }

  void _initViewer() {
    if (!kIsWeb || _effectiveUrls.isEmpty) return;
    debugPrint(
      '[DigitalTwin][ViewerBridge] initViewer urls=${_effectiveUrls.length} modelIds=${_effectiveModelIds.join(",")}',
    );
    setState(() {
      _isLoading = true;
      _viewerReady = false;
      _errorMessage = null;
    });
    _channelId = 'viewer_channel_${DateTime.now().microsecondsSinceEpoch}';
    _iframeViewId = 'model_3d_viewer_${DateTime.now().microsecondsSinceEpoch}';
    _registerViewer();
  }

  void _registerViewer() {
    final viewId = _iframeViewId;
    if (!kIsWeb || viewId == null) return;
    final viewerUrl = _buildViewerUrl();

    ui.platformViewRegistry.registerViewFactory(viewId, (int _) {
      final iframe = html.IFrameElement()
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..allow = 'fullscreen; autoplay; encrypted-media'
        ..allowFullscreen = true;
      iframe.onLoad.listen((_) {
        if (!mounted) return;
        debugPrint(
          '[DigitalTwin][ViewerBridge] iframe loaded channel=$_channelId url=$viewerUrl',
        );
        setState(() {
          _isLoading = false;
        });
        widget.onViewerReadyChanged?.call(false);
        widget.controller?._flush();
      });
      iframe.onError.listen((_) {
        if (!mounted) return;
        debugPrint(
          '[DigitalTwin][ViewerBridge] iframe load error channel=$_channelId url=$viewerUrl',
        );
        setState(() {
          _isLoading = false;
          _errorMessage = 'Failed to load 3D model';
        });
      });
      iframe.src = viewerUrl;
      _iframeElement = iframe;
      return iframe;
    });
  }

  String _buildViewerUrl() {
    final urls = _effectiveUrls;
    if (urls.isEmpty) return '';

    final String viewerPage =
        Uri.base.removeFragment().resolve('model_viewer/index.html').toString();
    final query = <String>[];
    for (final url in urls) {
      query.add('file=${Uri.encodeComponent(url)}');
    }
    for (final modelId in _effectiveModelIds) {
      query.add('id=${Uri.encodeComponent(modelId)}');
    }
    query.add('layout=${Uri.encodeComponent(widget.layout)}');
    query.add('spacing=${widget.spacing}');
    query.add('drag=${widget.draggable}');
    if (_channelId != null) {
      query.add('channel=${Uri.encodeComponent(_channelId!)}');
    }
    if (widget.initialPositions != null &&
        widget.initialPositions!.isNotEmpty) {
      final posStr = widget.initialPositions!
          .map((List<double> item) => _vectorToQuery(item))
          .join('|');
      query.add('pos=${Uri.encodeComponent(posStr)}');
    }
    if (widget.initialRotations != null &&
        widget.initialRotations!.isNotEmpty) {
      final rotStr = widget.initialRotations!
          .map((List<double> item) => _vectorToQuery(item))
          .join('|');
      query.add('rot=${Uri.encodeComponent(rotStr)}');
    }
    if (widget.initialScales != null && widget.initialScales!.isNotEmpty) {
      final scaleStr = widget.initialScales!
          .map((List<double> item) => _vectorToQuery(item))
          .join('|');
      query.add('scl=${Uri.encodeComponent(scaleStr)}');
    }
    query.add('t=${DateTime.now().millisecondsSinceEpoch}');
    final sep = viewerPage.contains('?') ? '&' : '?';
    return '$viewerPage$sep${query.join('&')}';
  }

  String _vectorToQuery(List<double> value) {
    final x = value.isNotEmpty ? value[0] : 0;
    final y = value.length > 1 ? value[1] : 0;
    final z = value.length > 2 ? value[2] : 0;
    return '$x,$y,$z';
  }

  void refresh() {
    if (_effectiveUrls.isNotEmpty) {
      _initViewer();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_effectiveUrls.isEmpty) return _buildPlaceholder();
    if (_errorMessage != null) return _buildErrorView();
    if (kIsWeb && _iframeViewId != null) {
      return Stack(
        children: <Widget>[
          HtmlElementView(
            key: ValueKey<String>(
              '${_iframeViewId}_${_channelId}_${_effectiveUrls.join('|')}',
            ),
            viewType: _iframeViewId!,
          ),
          if (_isLoading)
            Container(
              color: widget.backgroundColor.withValues(alpha: 0.82),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: <Widget>[
                    const CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Color(0xFF00D9FF),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _viewerReady
                          ? 'Synchronizing scene...'
                          : 'Loading 3D Model...',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.7),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      );
    }
    return _buildPlaceholder();
  }

  Widget _buildPlaceholder() {
    return Container(
      color: widget.backgroundColor,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Icon(
              Icons.view_in_ar,
              color: Color(0xFF00D9FF),
              size: 48,
            ),
            const SizedBox(height: 8),
            Text(
              widget.placeholderText,
              style: const TextStyle(
                color: Color(0xFF00D9FF),
                fontSize: 12,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorView() {
    return Container(
      color: widget.backgroundColor,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Icon(Icons.error_outline, color: Colors.red, size: 48),
            const SizedBox(height: 16),
            Text(
              _errorMessage ?? 'Failed to load model',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: refresh,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00D9FF),
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

bool _stringListEquals(List<String>? a, List<String>? b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return listEquals(a, b);
}

bool _vectorMatrixEquals(List<List<double>>? a, List<List<double>>? b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (!_vectorEquals(a[i], b[i])) {
      return false;
    }
  }
  return true;
}

bool _vectorEquals(List<double> a, List<double> b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if ((a[i] - b[i]).abs() > 0.0001) {
      return false;
    }
  }
  return true;
}
