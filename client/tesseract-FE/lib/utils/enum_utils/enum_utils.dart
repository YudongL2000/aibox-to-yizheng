enum TopLevelMenuType {
  TopLevelMenuType_H,
  TopLevelMenuType_V,
  TopLevelMenuType_E
}

enum MiddleLevelMenuType {
  MiddleLevelMenuType_WorkSpace, // 工作台
  MiddleLevelMenuType_PatientsManagement, // 患者管理
  MiddleLevelMenuType_TagManagement, // 标签管理
  MiddleLevelMenuType_PlanManagement, // 方案管理
  MiddleLevelMenuType_TargetManagement, // 指标管理

  //todo 暂时放在这。
  MiddleLevelMenuType_UserManagement, // 用户管理
  MiddleLevelMenuType_GroupManagement, // 团队管理
  MiddleLevelMenuType_PackageManagement, // 服务包管理
  MiddleLevelMenuType_MetaManagement, // 元数据管理
  MiddleLevelMenuType_PatientGroups, // 患者分组管理
  MiddleLevelMenuType_DataAnlysis, // 患者分组管理
  MiddleLevelMenuType_OrganizationManagement, // 机构管理
  MiddleLevelMenuType_RoleManagement, // 角色管理
  MiddleLevelMenuType_ContentManagement, // 内容管理
  MiddleLevelMenuType_AssessmentManagement, // 评估随访

}

// 用于分页
enum OperationPage { Before, After, First, Current }

// eventBus 业务事件类型
enum ActionType {
  Login, // 登录
  Logout, // 登出
  Push_Plan, // 推方案
  Push_Assess, // 推评估
  Push_Short_Note, // 推短信
  Plan_Jump, // 服务包跳转
  Plan_Execute, // 服务包任务执行
  Refresh_Task, // 服务包状态刷新
  Push_Teach, // 退宣教
  Build_Plan, // 创建方案
  Show_Health, // 显示健康管理档案
  Show_Health_Medical, // 显示健康管理档案 默认选中诊疗数据
  SubmitForms,
  Config_Plan, // 配置方案
  Show_DataCompari, // 数据对比
  show_new_group_by_template, // 通过模板新建分组

  Order_Detail, // 订单详情
  Order_Complaint_Handle, // 投诉处理
  Order_Apply, // 评价回复
  Order_Handle_Check, // 处理查看

  Agree_Refund, // 同意退款
  Disagree_Refund, // 拒绝退款

  WorkSpace_Quickly_Patient_Build, // 工作台-快捷操作-患者建档
  WorkSpace_Quickly_ToDo_Assess, // 工作台-快捷操作-进行评估
  WorkSpace_Quickly_Alloc_Group, // 工作台-快捷操作-分级入组

  Clear, // 清空数据
  Refresh_Tip, // 刷新HIS提示
  Refresh_Info, // 360刷新服务包
  Jump_Index, // 360跳转
  Refresh_Count, // im 联合门诊刷新代办
  VpnState,
  Refresh_Menu, // 签约刷新菜单数字
  Show_Refresh, // 显示刷新
  Request_Info, // 请求用户信息
  Request_Info_Credit, // 请求用户签约信息
  ADD_APPOINTMENT,
  MULTI_PATIENT_INFO, //签约多个用户切换
  MULTI_PATIENT_Change, //签约多个用户切换
  MULTI_PATIENT_ChangeIndex, //签约多个用户切换
  MULTI_PATIENT_Remove, // 签约用户删除
  REFRESH_PATIENT_INFO, // 签约刷新用户信息
  Patient_Record_Close, // 360关闭

  Open_HIS_EndDrawer
}

// eventBus 模块类别
enum EventType {
  Login_Logout, // 登录登出
  WorkSpace, // 工作台
  Patients, // 患者管理
  Plan, // 方案管理
  Health, // 健康管理 档案
  DataCompari, // 数据对比
  Order, // 订单管理
  User, // 用户管理
  HIS, // his
  SignManagement, // 签约管理
  PatientInfo, // 360
  HomeTopBar, // 顶部菜单栏bar

}

enum PlanBuildCellType {
  Input, // 输入框
  Input_Unit, // 带单位的输入框
  Input_Many, // 可多选的输入框
  Chose, // 下拉选择
  Chose_Many, // 下拉选择/多选
  Chose_Build, // 带按钮的下拉选择
  Upload, // 上传图片
  Introduce,
}

// 表单配置
enum PlanDetailFormSectionConfig {
  Name_Input, // 任务名称
  Code_Input, // 任务编码
  Task_Type, // 任务类型
  Remark, // 备注
  Execute_Config_Target, // 执行配置-执行对象
  Execute_Config_Time, // 执行配置-执行时间
  Execute_Config_Effective, // 执行配置-执行时效

  Event_Name, // 任务名称
  Event_Chose, // 选择事件
  Event_Type, // 事件类型
  Form_Chose, // 表单类
  Role_List, // 角色列表

  SubFlowList, // 子流程列表
  SubFlowName, // 子流程名称
  SubFlowRule, // 子流程规则
  SubFlowDes, // 子流程描述
}

enum PlanTreeItemPosition {
  Position_Only, // 只有一个
  Position_Left, // 最左侧
  Position_Mid, // 中间
  Position_Right, // 最右侧
  Position_None, // 占位
  Position_End, // 结束
}

enum PlanBuildTaskType {
  Normal, // 普通任务
  Timer, // 定时任务

}

enum PlanBuildEventType {
  Normal, // 普通事件
  Timer, // 定时任务执行
  Delay, // 任务完成延时执行任务
}

enum PlanBuildEventRoleAuthType {
  Read, // 仅查看
  Operation, // 可操作

}

enum PatientDiagnosisTreatType {
  DiagnosisTreatInspectionReport, // 检验报告
  DiagnosisTreatExamineReport, // 检查报告
  DiagnosisTreatMedicalHistory // 病历
}

enum UploadType {
  UploadTypeFileUpload, // 普通文件上传
  UploadTypeOcrUpload, // ocr 图片识别-语音转文字上传
}

enum WorkSpace_Msg_List {
  WorkSpace_Msg_List_System, // 系统消息
  WorkSpace_Msg_List_Important, // 重要消息
  WorkSpace_Msg_List_Abnormal // 指标异常
}

enum IMEndDrawerType {
  IMEndDrawerType_Push_Empty, // 重置
  IMEndDrawerType_Push_Plan, // 推方案
  IMEndDrawerType_Push_Teach, // 推宣教
  IMEndDrawerType_Push_Assess, // 推评估
  IMEndDrawerType_Disease_Info, // 病情资料
  IMEndDrawerType_Medic_Detail, // 药品详情
  IMEndDrawerType_Diagnose_Detail_List, // 诊断详情列表
  IMEndDrawerType_Add_Doctor_Advice, // 开医嘱
  IMEndDrawerType_Add_Disease_Information, // 病情资料
  IMEndDrawerType_Add_Onion_Outpatient, // 新增联合门诊
  IMEndDrawerType_Add_Onion_Outpatient_Conclusion, // 新增联合门诊结论
  IMEndDrawerType_Onion_Outpatient_Conclusion_Detail, // 联合门诊结论详情
  IMEndDrawerType_Trans_Defend, // 防疫转诊
  IMEndDrawerType_Appointment, // 快速预约
  IMEndDrawerType_Trans_Apply, // 转诊申请
}

enum Patient360EndDrawerType {
  IMEndDrawerType_Push_Teach, // 推宣教
  IMEndDrawerType_Push_Assess, // 推评估
  IMEndDrawerTypeImOnionOutpatient, //复诊开方
  IMEndDrawerType_Fast_Appointment, // 快速预约
  IMEndDrawerType_Push_Plan, // 推方案
  IMEndDrawerType_Push_Message, // 推短信
}

enum PatientManagementFilterPackageType {
  PatientManagementFilterPackageType_All, // 全部
  PatientManagementFilterPackageType_A, // A包
  PatientManagementFilterPackageType_B, // B包
  PatientManagementFilterPackageType_C, // c包
}

enum PatientManagementFilterAgeType {
  PatientManagementFilterAgeType_All, // 全部
  PatientManagementFilterAgeType_18, //
  PatientManagementFilterAgeType_18_TO_30, //
  PatientManagementFilterAgeType_30_TO_40, //
  PatientManagementFilterAgeType_40_TO_50,
  PatientManagementFilterAgeType_50_TO_60,
  PatientManagementFilterAgeType_60_TO_70
}

enum PatientManagementFilterSexType {
  PatientManagementFilterSexType_All, // 全部
  PatientManagementFilterSexType_Man, //
  PatientManagementFilterSexType_Woman, //
  PatientManagementFilterSexType_Unknown, //
  PatientManagementFilterSexType_UnExplain,
}

enum PatientManagementFilterDiseaseType {
  PatientManagementFilterSex_All, // 全部
  PatientManagementFilterSex_Man, //
  PatientManagementFilterSex_Woman, //
  PatientManagementFilterSex_Unknown, //
  PatientManagementFilterSex_UnExplain,
}

enum GroupManagement_Drawer_Type {
  GroupManagement_Drawer_Type_Create, // 创建团队
  GroupManagement_Drawer_Type_Edit, // 编辑团队
  GroupManagement_Drawer_Type_Detail // 团队详情
}

enum PatientGroup_Drawer_Type {
  PatientGroup_Drawer_Type_Category_Alloc, // 患者分组
  PatientGroup_Drawer_Type_Group_Alloc, // 分配团队
  PatientGroup_Drawer_Type_Push_Message, // 推短信
  PatientGroup_Drawer_Type_Patient_Detail // 患者详情
}

enum DistributionManagement_Drawer_Type {
  DistributionManagement_Drawer_Type_Sure_Sign, // 确认签收
  DistributionManagement_Drawer_Type_Sign_Detail, // 签收详情
  DistributionManagement_Drawer_Type_Dispense, // 发药
}

enum HXNotificationType {
  HXNotificationType_WorkSpace_Drawer_Open, // 工作台打开抽屉
  HXNotificationType_PatientManagement_Drawer_Open, // 患者管理打开抽屉
  HXNotificationType_ReLoadData, // 重新登录-切换机构/切换团队 刷新数据
  HXNotificationType_Appointment_Drawer_Open, // 预约管理打开抽屉
  HXNotificationType_Chat_Drawer_Open, // im打开抽屉

  HXNotificationType_OPEN_DIDGNOSE_1, // 打开诊疗
  HXNotificationType_OPEN_DIDGNOSE_2, // 打开诊疗

  HXNotificationType_JUMP_ADVICES, // 跳转医嘱

}
