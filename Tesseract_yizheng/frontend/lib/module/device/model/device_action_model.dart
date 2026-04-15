/// MQTT 设备指令模型（device/usb/action）
/// 用于向端侧发送设备控制指令
class DeviceActionPayload {
  final String? sessionId;
  final String? targetId;
  final String? timestamp;
  final List<DeviceActionItem> action;

  DeviceActionPayload({
    this.sessionId,
    this.targetId,
    this.timestamp,
    required this.action,
  });

  Map<String, dynamic> toJson() {
    return {
      if (sessionId != null) 'session_id': sessionId,
      if (targetId != null) 'target_id': targetId,
      if (timestamp != null) 'timestamp': timestamp,
      'action': action.map((item) => item.toJson()).toList(),
    };
  }
}

/// 单条设备指令（action 数组元素）
class DeviceActionItem {
  final String portId;
  final String deviceType;
  final Map<String, dynamic>? commands;
  final Map<String, dynamic>? notes;

  DeviceActionItem({
    required this.portId,
    required this.deviceType,
    this.commands,
    this.notes,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'port_id': portId,
      'device_type': deviceType,
    };
    if (commands != null && commands!.isNotEmpty) {
      json['commands'] = commands;
    }
    if (notes != null && notes!.isNotEmpty) {
      json['notes'] = notes;
    }
    return json;
  }
}
