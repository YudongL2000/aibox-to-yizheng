import 'package:aitesseract/server/mqtt/mqtt_device_service.dart';

/// 通用的 MQTT 发布服务
/// 用于发送任意 JSON 数据到指定的 MQTT 主题
/// 内部使用 MqttDeviceService 的 publishJson 方法
class MqttPublishService {
  final MqttDeviceService _deviceMqtt;

  MqttPublishService(this._deviceMqtt);

  /// 发布 JSON 数据到指定的 MQTT 主题
  Future<bool> publishJson(String topic, Map<String, dynamic> jsonData) async {
    // 直接使用 MqttDeviceService 的 publishJson 方法
    return await _deviceMqtt.publishJson(topic, jsonData);
  }
}
