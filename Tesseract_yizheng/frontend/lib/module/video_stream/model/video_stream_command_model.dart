/// 服务端通过 MQTT 下发的视频流控制命令
class VideoStreamCommand {
  /// 动作：start_pull 拉流 | start_push 推流 | stop 停止
  final String action;

  /// 拉流地址（HLS/m3u8、MP4 等），start_pull 时必填
  final String? url;

  /// 推流密钥/路径（服务端分配），start_push 时可选
  final String? streamKey;

  /// 流唯一标识，用于 stop 时指定停止哪路
  final String? streamId;

  final Map<String, dynamic>? extra;

  VideoStreamCommand({
    required this.action,
    this.url,
    this.streamKey,
    this.streamId,
    this.extra,
  });

  factory VideoStreamCommand.fromJson(Map<String, dynamic> json) {
    return VideoStreamCommand(
      action: json['action']?.toString() ?? '',
      url: json['url']?.toString(),
      streamKey: json['stream_key']?.toString(),
      streamId: json['stream_id']?.toString(),
      extra: json['extra'] is Map<String, dynamic>
          ? json['extra'] as Map<String, dynamic>
          : null,
    );
  }

  bool get isStartPull => action == 'start_pull';
  bool get isStartPush => action == 'start_push';
  bool get isStop => action == 'stop';
}

/// 客户端上报到 MQTT 的流状态（可选，供服务端做联动）
class VideoStreamStatus {
  final String streamId;
  final String status; // ready | pulling | pushing | stopped | error
  final String? message;

  VideoStreamStatus({
    required this.streamId,
    required this.status,
    this.message,
  });

  Map<String, dynamic> toJson() => {
        'stream_id': streamId,
        'status': status,
        'message': message,
        'timestamp': DateTime.now().toIso8601String(),
      };
}
