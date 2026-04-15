import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:flutter/material.dart';
import 'package:model_viewer_plus/model_viewer_plus.dart';

/// 模型全屏预览页：左侧详细信息，右侧 3D 模型
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

    return Scaffold(
      backgroundColor: const Color(0xFF0A0E1A),
      body: SafeArea(
        child: Row(
          children: [
            // 左侧：详细信息
            Container(
              width: 320,
              decoration: BoxDecoration(
                color: const Color(0xFF0A0E1A),
                border: Border(
                  right: BorderSide(
                    color: const Color(0xFF00D9FF).withOpacity(0.2),
                    width: 1,
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 标题栏 + 关闭
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 12, 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '设备 #${index + 1}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.of(context).pop(),
                          icon: const Icon(Icons.close),
                          color: Colors.white70,
                          style: IconButton.styleFrom(
                            backgroundColor: Colors.white.withOpacity(0.08),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(
                    height: 1,
                    color: Color(0xFF00D9FF),
                    indent: 20,
                    endIndent: 20,
                  ),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(20),
                      child: deviceInfo != null
                          ? _buildDetailSection(isDisconnected)
                          : _buildPlaceholderDetail(),
                    ),
                  ),
                ],
              ),
            ),
            // 右侧：3D 模型全屏预览
            Expanded(
              child: Stack(
                children: [
                  if (_kShowModelWithoutLogic || !isDisconnected)
                    ModelViewer(
                      src: modelSrc,
                      alt: 'Device Model $index',
                      ar: false,
                      autoRotate: false,
                      autoPlay: true,
                      cameraControls: true,
                      disableZoom: false,
                      backgroundColor: const Color(0xFF0A0E1A),
                    )
                  else
                    Container(
                      color: const Color(0xFF0A0E1A),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.power_off,
                              size: 64,
                              color: Colors.grey.withOpacity(0.5),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              '设备断开',
                              style: TextStyle(
                                color: Colors.grey.withOpacity(0.7),
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailSection(bool isDisconnected) {
    final d = deviceInfo!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _detailRow('状态', isDisconnected ? '断开' : (d.isPlugIn ? '已连接' : '未连接')),
        const SizedBox(height: 12),
        _detailRow('端口', d.portId),
        const SizedBox(height: 12),
        _detailRow(
          '类型',
          isDisconnected
              ? '未连接'
              : (d.deviceType.isNotEmpty ? d.deviceType.toUpperCase() : '未知'),
        ),
        const SizedBox(height: 12),
        if (d.deviceId.isNotEmpty) ...[
          _detailRow('设备 ID', d.deviceId),
          const SizedBox(height: 12),
        ],
        if (d.notes.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            '备注',
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: const Color(0xFF00D9FF).withOpacity(0.2),
                width: 1,
              ),
            ),
            child: Text(
              d.notes.toString(),
              style: const TextStyle(
                color: Colors.white70,
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

  Widget _detailRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 72,
          child: Text(
            '$label:',
            style: TextStyle(
              color: Colors.white.withOpacity(0.6),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              color: Colors.white,
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

  Widget _buildPlaceholderDetail() {
    return Center(
      child: Text(
        '暂无设备详情',
        style: TextStyle(
          color: Colors.white.withOpacity(0.5),
          fontSize: 14,
        ),
      ),
    );
  }
}
