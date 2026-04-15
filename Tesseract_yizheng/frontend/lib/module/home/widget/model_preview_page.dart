import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:flutter/material.dart';
import 'package:model_viewer_plus/model_viewer_plus.dart';

/// 模型全屏预览页：左侧详细信息，右侧 3D 模型；页面壳层保持单层侧栏 + 画布。
/// 临时：设为 true 时始终展示模型，不依赖设备连接状态
const bool _kShowModelWithoutLogic = true;

class ModelPreviewPage extends StatelessWidget {
  final int index;
  final String modelSrc;
  final DeviceInfoItem? deviceInfo;

  const ModelPreviewPage({
    super.key,
    required this.index,
    required this.modelSrc,
    this.deviceInfo,
  });

  @override
  Widget build(BuildContext context) {
    final isDisconnected = deviceInfo == null ||
        deviceInfo!.deviceType.isEmpty ||
        deviceInfo!.deviceType.toLowerCase() == 'null';
    final SpatialThemeData spatial = context.spatial;
    final Color accent = spatial.status(SpatialStatusTone.info);
    final Color borderColor = accent.withValues(alpha: 0.2);
    final Color mutedText = spatial.textMuted;
    final Color mutedSurface = spatial.surface(SpatialSurfaceTone.muted);
    final Color panelSurface = spatial.surface(SpatialSurfaceTone.panel);

    return Scaffold(
      backgroundColor: spatial.palette.bgBase,
      body: SafeArea(
        child: Row(
          children: [
            SizedBox(
              width: 320,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '设备 #${index + 1}',
                          style: spatial.sectionTextStyle(),
                        ),
                        IconButton(
                          onPressed: () => Navigator.of(context).pop(),
                          icon: const Icon(Icons.close),
                          color: mutedText,
                          style: IconButton.styleFrom(
                            backgroundColor: mutedSurface,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(20),
                      child: deviceInfo != null
                          ? _buildDetailSection(
                              isDisconnected: isDisconnected,
                              spatial: spatial,
                            )
                          : _buildPlaceholderDetail(spatial: spatial),
                    ),
                  ),
                ],
              ),
            ),
            VerticalDivider(width: 1, thickness: 1, color: borderColor),
            Expanded(
              child: ColoredBox(
                color: panelSurface,
                child: _kShowModelWithoutLogic || !isDisconnected
                    ? ModelViewer(
                        src: modelSrc,
                        alt: 'Device Model $index',
                        ar: false,
                        autoRotate: false,
                        autoPlay: true,
                        cameraControls: true,
                        disableZoom: false,
                        backgroundColor: spatial.palette.bgBase,
                      )
                    : Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.power_off,
                              size: 64,
                              color: mutedText.withValues(alpha: 0.5),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              '设备断开',
                              style: TextStyle(
                                color: mutedText.withValues(alpha: 0.7),
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailSection({
    required bool isDisconnected,
    required SpatialThemeData spatial,
  }) {
    final d = deviceInfo!;
    final Color accent = spatial.status(SpatialStatusTone.info);
    final Color mutedText = spatial.textMuted;
    final Color accentGlow = spatial.surface(SpatialSurfaceTone.elevated);
    final Color borderColor = accent.withValues(alpha: 0.2);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _detailRow(
          '状态',
          isDisconnected ? '断开' : (d.isPlugIn ? '已连接' : '未连接'),
          labelColor: mutedText.withValues(alpha: 0.8),
          valueColor: spatial.palette.textPrimary,
        ),
        const SizedBox(height: 12),
        _detailRow('端口', d.portId,
            labelColor: mutedText, valueColor: mutedText),
        const SizedBox(height: 12),
        _detailRow(
          '类型',
          isDisconnected
              ? '未连接'
              : (d.deviceType.isNotEmpty ? d.deviceType.toUpperCase() : '未知'),
          labelColor: mutedText,
          valueColor: spatial.palette.textPrimary,
        ),
        const SizedBox(height: 12),
        if (d.deviceId.isNotEmpty) ...[
          _detailRow(
            '设备 ID',
            d.deviceId,
            labelColor: mutedText,
            valueColor: spatial.palette.textPrimary,
          ),
          const SizedBox(height: 12),
        ],
        if (d.notes.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            '备注',
            style: TextStyle(
              color: mutedText,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: accentGlow,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: borderColor,
                width: 1,
              ),
            ),
            child: Text(
              d.notes.toString(),
              style: TextStyle(
                color: mutedText.withValues(alpha: 0.7),
                fontSize: 11,
                height: 1.4,
              ),
              maxLines: 10,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ],
    );
  }

  Widget _detailRow(
    String label,
    String value, {
    required Color labelColor,
    required Color valueColor,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 72,
          child: Text(
            '$label:',
            style: TextStyle(
              color: labelColor,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              color: valueColor,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildPlaceholderDetail({required SpatialThemeData spatial}) {
    return Center(
      child: Text(
        '暂无设备详情',
        style: spatial.bodyTextStyle(),
      ),
    );
  }
}
