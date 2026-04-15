class NotificationModel {
  String? module;
  String? action;
  String? content;
  int? clientAction; // 是否显示内容 1 显示 2 操作 3显示&操作
  Map<String, dynamic>? businessData; //扩展字段

  NotificationModel({
    this.module,
    this.action,
    this.content,
    this.clientAction,
    this.businessData,
  });

  NotificationModel.fromJson(Map<String, dynamic> json) {
    module = json['module'];
    action = json['action'];
    content = json['content'];
    clientAction = json['clientAction'];
    businessData = json['businessData'];
  }
}

class BusinessData {
  String? doctorContent;
  String? patientContent;
  String? id;
  String? type;

  BusinessData(this.doctorContent, this.patientContent, this.id, this.type);
  BusinessData.fromJson(Map<String, dynamic> json) {
    doctorContent = json['doctorContent'] ?? "";
    patientContent = json['patientContent'] ?? "";
    id = json['id'] ?? "";
    type = json['type'] ?? "";
  }
}
