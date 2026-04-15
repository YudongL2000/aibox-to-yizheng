import 'package:aitesseract/server/Http_config.dart';

// http://192.168.168.66:9080/medicalOrdersIntegrate
// http://192.168.168.66:9080/netInquiryIntegrate
// http://192.168.168.66:9080/doctorcenterIntegrate
// http://192.168.168.66:9080/prescriptionIntegrate

class AdmissionIm {
  static getMedicalOrdersIntegrateBaseUrl() {
    return HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/";
  }

  // /icd/fuzzyQuery 根据模糊别名查询诊断名
  static String fuzzyQuery =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/icd/fuzzyQuery";

  // 药品列表
  static String drugList = HttpConfig.baseAdminUrl + "/drugIntegrate/drug/list";

  //获取用法用量
  static String drugDosage =
      HttpConfig.baseAdminUrl + "/drugIntegrate/drug/dosage";

  //检验输入药品
  static String drugCheckInfuse =
      HttpConfig.baseAdminUrl + "/drugIntegrate/drug/check/infuse";

  // 检查检验
  static String inspectList =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/inspect/list";

  static String drugDetail =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/drug/item/detail";

  static String signList = HttpConfig.baseAdminUrl +
      "/prescriptionIntegrate/preGroup/signList"; //签收列表

  static String dispenseList = HttpConfig.baseAdminUrl +
      "/prescriptionIntegrate/preGroup/dispenseList"; // 发药列表
  static String signGroup = HttpConfig.baseAdminUrl +
      "/prescriptionIntegrate/prescription/signGroup"; //签收列表
  static String signPre = HttpConfig.baseAdminUrl +
      "/prescriptionIntegrate/prescription/signPre"; //签收
  static String dispensing = HttpConfig.baseAdminUrl +
      "/prescriptionIntegrate/prescription/dispensing"; //发药
  static String dispensingGroup = HttpConfig.baseAdminUrl +
      "/prescriptionIntegrate/prescription/dispensingGroup"; //发药批量

  static String signDetailPre = HttpConfig.baseAdminUrl +
      "/prescriptionIntegrate/prescription/preDetail"; //签收

  static String diseaseInfoDetail = HttpConfig.baseAdminUrl +
      "/netInquiryIntegrate/medicalRecord/queryRecordDetails"; // 病例详情

  // 添加模板
  static String addTemplate =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/doctor/template/add";

  static String addTemplate2 = HttpConfig.baseAdminUrl +
      "/medicalOrdersIntegrate/doctor/template/add/unite";

  //开医嘱
  static String addObtainDrugAdvice =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/medical/issue";

  //医嘱回显
  static String echo =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/medical/echo";

  // /medical/issue
  // 电子病历
  static String addMedicalV1 = HttpConfig.baseAdminUrl +
      "/netInquiryIntegrate/medical/history/update/medical";
  // 下诊断
  static String updateDiagnosticListV2 = HttpConfig.baseAdminUrl +
      "/medicalOrdersIntegrate/diagnostic/updateDiagnosticListV2";

  // 获取im 咨询记录
  static String queryDocAdvisoryRecordV1 = HttpConfig.baseAdminUrl +
      "/netInquiryIntegrate/admission/queryDocAdvisoryRecordV1";

  // 接诊（接单）
  static String receiveOrder = HttpConfig.baseAdminUrl +
      "/netInquiryIntegrate/admission/docReceiveOrder";

  // 拒绝接诊
  static String refuseOrder = HttpConfig.baseAdminUrl +
      "/netInquiryIntegrate/admission/updateRefuseAdm";

  // 获取聊天记录
  static String getmsg =
      HttpConfig.baseAdminUrl + "/netInquiryIntegrate/admission/im/getmsg";

  // 获取历史就诊记录
  static String getHistory =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/medical/historyV3";

  // 停止医嘱
  static String stopMedical =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/medical/stop";

  //医嘱记录
  static String getCurrentRecord =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/medical/currentV2";

  //医嘱记录
  static String stopMedic =
      // /medical/stop
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/medical/stop";
  static String reasonList =
      // /medical/stop
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/medical/reason/list";

  // 获取医嘱模板列表
  static String getTemplate =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/doctor/template/list";

  static String getTemplate2 = HttpConfig.baseAdminUrl +
      "/medicalOrdersIntegrate/doctor/template/list/unite";

  // 删除医嘱模板
  static String delTemplate =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/doctor/template/del/";

  // 查看互联网用户详情
  static String findByIdDetails = HttpConfig.baseAdminUrl +
      "/netInquiryIntegrate/medicalRecord/findByIdDetails/";
  static String queryImAccount = HttpConfig.baseAdminUrl +
      "/netInquiryIntegrate/admission/queryImAccount/";
  static String findOneByPatientId = HttpConfig.baseAdminUrl +
      "/netInquiryIntegrate/patient/findOneByPatientId/";
  //诊断列表
  static String diagnosisList = HttpConfig.baseAdminUrl +
      "/medicalOrdersIntegrate/diagnostic/listDiagnosticDescByStatus";
  // 消费条数
  static String consume =
      HttpConfig.baseAdminUrl + "/netInquiryIntegrate/admprocess/consume";

  // 咨询结束
  static String over =
      HttpConfig.baseAdminUrl + "/netInquiryIntegrate/admprocess/over";
  static String doctorDetailV1 = HttpConfig.baseAdminUrl +
      "/medicalOrdersIntegrate/drug/order/doctorDetailV1";
// 病例详情
  static String medicalDetail = HttpConfig.baseAdminUrl +
      "/netInquiryIntegrate/medical/history/find/detail";
  // 医嘱详情
  static String medicalDetailv1 =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/medical/one";

// /illness/one
  // 复诊开发详情
  static String illnessOne =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/illness/one";
  // 复诊开发接诊
  static String admitted =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/illness/admitted";
  static String illnessList =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/illness/wait/admitted";
  static String checkrepeat =
      HttpConfig.baseAdminUrl + "/medicalOrdersIntegrate/illness/check/medical";
}
