class UploadMedia {
  String? uri;
  String? name;
  int? size;
  String? ext;
  String? md5;
  bool? isAdd;
  String? url;
  String? fileId;
  String? link;

  UploadMedia(
      {this.uri,
      this.name,
      this.size,
      this.ext,
      this.md5,
      this.isAdd = false,
      this.url,
      this.fileId,
      this.link});

  UploadMedia.fromJson(Map<String, dynamic> json) {
    uri = json['uri'];
    name = json['name'];
    size = json['size'];
    ext = json['ext'];
    md5 = json['md5'];
    url = json['url'];
    link = json["link"];
    fileId = json["fileId"];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['uri'] = this.uri;
    data['name'] = this.name;
    data['size'] = this.size;
    data['ext'] = this.ext;
    data['md5'] = this.md5;
    data['url'] = this.url;
    return data;
  }
}

class MediaOcrUploadResModel {
  String? code;
  String? errCode;
  String? msg;
  ImageOcrUploadModel? data;
  AudioOcrUploadModel? audioModel;

  MediaOcrUploadResModel({this.code, this.errCode, this.msg, this.data});

  MediaOcrUploadResModel.fromJson(Map<String, dynamic> json) {
    code = json['code'];
    errCode = json['errCode'];
    msg = json['msg'];
    data = json['data'] != null
        ? new ImageOcrUploadModel.fromJson(json['data'])
        : null;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['code'] = this.code;
    data['errCode'] = this.errCode;
    data['msg'] = this.msg;
    if (this.data != null) {
      data['data'] = this.data!.toJson();
    }
    return data;
  }
}

class ImageOcrUploadModel {
  ImageOcrUploadResultModel? result;
  String? templateId;
  String? resourceId;
  String? url;

  ImageOcrUploadModel(
      {this.result, this.templateId, this.url, this.resourceId});

  ImageOcrUploadModel.fromJson(Map<String, dynamic> json) {
    result = json['result'] != null
        ? new ImageOcrUploadResultModel.fromJson(json['result'])
        : null;
    templateId = json['template_id'];
    url = json['url'];
    resourceId = json["resourceId"];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    if (this.result != null) {
      data['result'] = this.result!.toJson();
    }
    data['template_id'] = this.templateId;
    data['url'] = this.url;
    data["resourceId"] = this.resourceId;
    return data;
  }
}

class ImageOcrUploadResultModel {
  String? date;
  String? birthday;
  String? workUnit;
  String? leaveMsg;
  String? address;
  String? patientId;
  String? signature;
  String? sex;
  String? diagnosis;
  String? drugAllergy;
  String? chiefComplaint;
  String? menstrualHistory;
  String? professional;
  String? marriage;
  String? healthCheck;
  String? name;
  String? clinicDate;
  String? national;
  String? handlingMsg;
  String? familyHistory;
  String? auxiliaryExamination;
  String? department;
  String? medicalHistory;
  String? age;

  ImageOcrUploadResultModel(
      {this.date,
      this.birthday,
      this.workUnit,
      this.leaveMsg,
      this.address,
      this.patientId,
      this.signature,
      this.sex,
      this.diagnosis,
      this.drugAllergy,
      this.chiefComplaint,
      this.menstrualHistory,
      this.professional,
      this.marriage,
      this.healthCheck,
      this.name,
      this.clinicDate,
      this.national,
      this.handlingMsg,
      this.familyHistory,
      this.auxiliaryExamination,
      this.department,
      this.medicalHistory,
      this.age});

  ImageOcrUploadResultModel.fromJson(Map<String, dynamic> json) {
    date = json['date'];
    birthday = json['birthday'];
    workUnit = json['workUnit'];
    leaveMsg = json['leaveMsg'];
    address = json['address'];
    patientId = json['patientId'];
    signature = json['signature'];
    sex = json['sex'];
    diagnosis = json['diagnosis'];
    drugAllergy = json['drugAllergy'];
    chiefComplaint = json['chiefComplaint'];
    menstrualHistory = json['menstrualHistory'];
    professional = json['professional'];
    marriage = json['marriage'];
    healthCheck = json['healthCheck'];
    name = json['name'];
    clinicDate = json['clinicDate'];
    national = json['national'];
    handlingMsg = json['handlingMsg'];
    familyHistory = json['familyHistory'];
    auxiliaryExamination = json['auxiliaryExamination'];
    department = json['department'];
    medicalHistory = json['medicalHistory'];
    age = json['age'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['date'] = this.date;
    data['birthday'] = this.birthday;
    data['workUnit'] = this.workUnit;
    data['leaveMsg'] = this.leaveMsg;
    data['address'] = this.address;
    data['patientId'] = this.patientId;
    data['signature'] = this.signature;
    data['sex'] = this.sex;
    data['diagnosis'] = this.diagnosis;
    data['drugAllergy'] = this.drugAllergy;
    data['chiefComplaint'] = this.chiefComplaint;
    data['menstrualHistory'] = this.menstrualHistory;
    data['professional'] = this.professional;
    data['marriage'] = this.marriage;
    data['healthCheck'] = this.healthCheck;
    data['name'] = this.name;
    data['clinicDate'] = this.clinicDate;
    data['national'] = this.national;
    data['handlingMsg'] = this.handlingMsg;
    data['familyHistory'] = this.familyHistory;
    data['auxiliaryExamination'] = this.auxiliaryExamination;
    data['department'] = this.department;
    data['medicalHistory'] = this.medicalHistory;
    data['age'] = this.age;
    return data;
  }
}

class AudioOcrUploadModel {
  String? speechText;
  String? speechUrl;

  AudioOcrUploadModel({this.speechText, this.speechUrl});

  AudioOcrUploadModel.fromJson(Map<String, dynamic> json) {
    speechText = json['speechText'];
    speechUrl = json['speechUrl'];
  }
}
