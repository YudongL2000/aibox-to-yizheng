import 'dart:async';

import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:aitesseract/server/mqtt/mqtt_device_config.dart';
import 'package:aitesseract/server/mqtt/mqtt_device_service.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

/*
 * [INPUT]: 通过 MQTT 展示设备接入与插拔状态，支持连接、重试与错误回传。
 * [OUTPUT]: 对外提供 DeviceListPage，使用 spatial 语义 token 做设备卡片与状态文本着色。
 * [POS]: module/device 页，承接设备页首屏列表与事件流可视化入口。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

/// 仅通过 MQTT 收：展示设备列表与状态（plug_in / plug_out）
class DeviceListPage extends StatefulWidget {
  const DeviceListPage({super.key});

  @override
  State<DeviceListPage> createState() => _DeviceListPageState();
}

class _DeviceListPageState extends State<DeviceListPage> {
  final MqttDeviceService _mqtt = MqttDeviceService();
  final List<DeviceInfoItem> _devices = [];
  StreamSubscription<DeviceEventPayload>? _sub;
  bool _connecting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _listenEvents();
  }

  void _listenEvents() {
    _sub = _mqtt.deviceEventStream.listen((event) {
      if (!mounted) return;
      setState(() {
        for (var item in event.deviceInfo) {
          if (item.isPlugOut) {
            _devices.removeWhere(
                (d) => d.portId == item.portId && d.deviceId == item.deviceId);
          } else {
            final idx = _devices.indexWhere(
                (d) => d.portId == item.portId && d.deviceId == item.deviceId);
            if (idx >= 0) {
              _devices[idx] = item;
            } else {
              _devices.add(item);
            }
          }
        }
      });
    });
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
      if (!ok) {
        _error = _mqtt.lastError ?? '连接失败，请检查网络或 broker 地址';
        if (kIsWeb) {
          final configuredUrl = MqttDeviceConfig.webSocketUrl.isNotEmpty
              ? MqttDeviceConfig.webSocketUrl
              : '未配置（请设置 TESSERACT_MQTT_HOST）';
          _error = '$_error\n\n提示：Web 平台需要 broker 支持 WebSocket\n'
              '当前配置：$configuredUrl\n'
              '如果 broker 不支持 WebSocket，请联系管理员配置 WebSocket 端口';
        }
      }
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    _mqtt.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;

    return Scaffold(
      backgroundColor: spatial.palette.bgBase,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(Icons.arrow_back_ios,
                        color: spatial.palette.textPrimary),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  Text(
                    '设备列表',
                    style: TextStyle(
                      color: spatial.palette.textPrimary,
                      fontSize: 18,
                    ),
                  ),
                  const Spacer(),
                  _mqtt.isConnected
                      ? Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color:
                                    spatial.status(SpatialStatusTone.success),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '已连接',
                              style: TextStyle(
                                color: spatial.palette.textPrimary
                                    .withValues(alpha: 0.8),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        )
                      : TextButton(
                          onPressed: _connecting ? null : _connect,
                          child: Text(
                            _connecting ? '连接中…' : '连接',
                            style: TextStyle(
                                color: spatial.status(SpatialStatusTone.info)),
                          ),
                        ),
                ],
              ),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.all(12),
                child: Text(
                  _error!,
                  style: TextStyle(
                    color: spatial.status(SpatialStatusTone.danger),
                    fontSize: 13,
                  ),
                ),
              ),
            Expanded(
              child: _devices.isEmpty
                  ? Center(
                      child: Text(
                        _mqtt.isConnected ? '暂无设备' : '未连接',
                        style: TextStyle(
                          color: spatial.palette.textSecondary,
                          fontSize: 14,
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      itemCount: _devices.length,
                      itemBuilder: (context, i) =>
                          _DeviceCard(device: _devices[i]),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DeviceCard extends StatelessWidget {
  final DeviceInfoItem device;

  const _DeviceCard({required this.device});

  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    final bool plugged = device.isPlugIn;
    final Color statusColor = plugged
        ? spatial.status(SpatialStatusTone.success)
        : spatial.status(SpatialStatusTone.warning);
    final Color statusBackground = plugged
        ? spatial.status(SpatialStatusTone.success).withValues(alpha: 0.2)
        : spatial.status(SpatialStatusTone.warning).withValues(alpha: 0.2);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: spatial.surface(SpatialSurfaceTone.muted),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: spatial.status(SpatialStatusTone.info).withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBackground,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  device.isPlugIn ? '已插入' : '已拔出',
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                '${device.deviceType} · ${device.deviceId}',
                style: spatial.heroTextStyle().copyWith(fontSize: 15),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _RowLabel('端口', device.portId),
          if (device.notes.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              '备注',
              style: TextStyle(
                color: spatial.palette.textSecondary.withValues(alpha: 0.75),
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              device.notes.entries
                  .map((e) => '${e.key}: ${e.value}')
                  .join('  ·  '),
              style: TextStyle(
                color: spatial.palette.textPrimary.withValues(alpha: 0.8),
                fontSize: 12,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}

class _RowLabel extends StatelessWidget {
  final String label;
  final String value;

  const _RowLabel(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;

    return Row(
      children: [
        SizedBox(
          width: 56,
          child: Text(
            '$label:',
            style: TextStyle(
              color: spatial.palette.textSecondary.withValues(alpha: 0.75),
              fontSize: 12,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              color: spatial.palette.textPrimary.withValues(alpha: 0.9),
              fontSize: 12,
            ),
          ),
        ),
      ],
    );
  }
}
