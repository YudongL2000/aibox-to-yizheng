import 'dart:async';

import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:aitesseract/server/mqtt/mqtt_device_config.dart';
import 'package:aitesseract/server/mqtt/mqtt_device_service.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

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
            _devices.removeWhere((d) =>
                d.portId == item.portId && d.deviceId == item.deviceId);
          } else {
            final idx = _devices.indexWhere((d) =>
                d.portId == item.portId && d.deviceId == item.deviceId);
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
          _error = '${_error}\n\n提示：Web 平台需要 broker 支持 WebSocket\n'
              '当前配置：ws://${MqttDeviceConfig.host}:${MqttDeviceConfig.wsPort}\n'
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
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E1A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0E1A),
        title: const Text(
          '设备列表',
          style: TextStyle(color: Colors.white, fontSize: 18),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          _mqtt.isConnected
              ? Padding(
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
                            color: Colors.white.withOpacity(0.8),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : TextButton(
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
              '主题: ${MqttDeviceConfig.topicDeviceEvent}',
              style: TextStyle(
                color: Colors.white.withOpacity(0.5),
                fontSize: 12,
              ),
            ),
          ),
          Expanded(
            child: _devices.isEmpty
                ? Center(
                    child: Text(
                      _mqtt.isConnected
                          ? '暂无设备事件，等待端侧上报…'
                          : '请先连接 MQTT 以接收设备事件',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.6),
                        fontSize: 14,
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: _devices.length,
                    itemBuilder: (context, i) => _DeviceCard(device: _devices[i]),
                  ),
          ),
        ],
      ),
    );
  }
}

class _DeviceCard extends StatelessWidget {
  final DeviceInfoItem device;

  const _DeviceCard({required this.device});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF151923),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFF00D9FF).withOpacity(0.2),
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
                  color: device.isPlugIn
                      ? const Color(0xFF28CA42).withOpacity(0.2)
                      : Colors.orange.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  device.isPlugIn ? '已插入' : '已拔出',
                  style: TextStyle(
                    color: device.isPlugIn
                        ? const Color(0xFF28CA42)
                        : Colors.orange,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                '${device.deviceType} · ${device.deviceId}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
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
                color: Colors.white.withOpacity(0.5),
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              device.notes.entries
                  .map((e) => '${e.key}: ${e.value}')
                  .join('  ·  '),
              style: TextStyle(
                color: Colors.white.withOpacity(0.8),
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
    return Row(
      children: [
        SizedBox(
          width: 56,
          child: Text(
            '$label:',
            style: TextStyle(
              color: Colors.white.withOpacity(0.5),
              fontSize: 12,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              color: Colors.white.withOpacity(0.9),
              fontSize: 12,
            ),
          ),
        ),
      ],
    );
  }
}
