import 'dart:async';

import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:flutter/material.dart';

/// Code console 组件：展示 JSON 并自动循环滚动，用于构建工作流/部署阶段
class CodeConsoleWidget extends StatelessWidget {
  /// 要展示的 JSON 文本，为空时显示「等待 JSON...」
  final String? jsonText;

  /// 高度，默认 140
  final double height;

  const CodeConsoleWidget({
    super.key,
    this.jsonText,
    this.height = 140,
  });

  @override
  Widget build(BuildContext context) {
    final spatial = context.spatial;
    return Container(
      height: height,
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      decoration: BoxDecoration(
        color: spatial.surfaceOverlay,
        borderRadius: BorderRadius.circular(spatial.radiusLg),
        border: Border.all(
          color: spatial.borderSubtle,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            child: Text(
              'CODE CONSOLE',
              style: TextStyle(
                color: spatial.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.8,
                fontFamily: SpatialDesignTokens.fontMono,
              ),
            ),
          ),
          Divider(
            height: 1,
            color: spatial.borderSubtle,
            indent: 10,
            endIndent: 10,
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(7),
                bottomRight: Radius.circular(7),
              ),
              child: _CodeConsoleScrollContent(
                jsonText: jsonText ?? '',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Code console 内 JSON 自动循环滚动内容
class _CodeConsoleScrollContent extends StatefulWidget {
  final String jsonText;

  const _CodeConsoleScrollContent({required this.jsonText});

  @override
  State<_CodeConsoleScrollContent> createState() =>
      _CodeConsoleScrollContentState();
}

class _CodeConsoleScrollContentState extends State<_CodeConsoleScrollContent> {
  final ScrollController _scrollController = ScrollController();
  Timer? _scrollTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startAutoScroll());
  }

  void _startAutoScroll() {
    if (widget.jsonText.isEmpty) return;
    _scrollTimer?.cancel();
    _scrollTimer = Timer.periodic(SpatialDesignTokens.motionFast, (_) {
      if (!mounted || !_scrollController.hasClients) return;
      final maxExtent = _scrollController.position.maxScrollExtent;
      final current = _scrollController.offset;
      if (maxExtent <= 0) return;
      double next = current + 8;
      if (next >= maxExtent) {
        _scrollController.jumpTo(0);
      } else {
        _scrollController.jumpTo(next);
      }
    });
  }

  @override
  void didUpdateWidget(covariant _CodeConsoleScrollContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.jsonText != widget.jsonText) {
      _scrollController.jumpTo(0);
      if (widget.jsonText.isNotEmpty) _startAutoScroll();
    }
  }

  @override
  void dispose() {
    _scrollTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.jsonText.isEmpty) {
      return const SizedBox.shrink();
    }
    final spatial = context.spatial;
    return SingleChildScrollView(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      child: SelectableText(
        widget.jsonText,
        style: TextStyle(
          color: spatial.status(SpatialStatusTone.success),
          fontSize: 10,
          fontFamily: SpatialDesignTokens.fontMono,
          height: 1.35,
        ),
      ),
    );
  }
}
