## 其他补充
### 阶段说明：
1. IntakeAgent（目的：通过文字交互确认用户需求所包含的所有节点后生成JSON文档在n8n实例上构建）：
  - 用户给出prompt：见到老刘竖个中指说一句“滚”，见到老付比个V说“你长得好帅”
  - 跟用户交互澄清用户的需求，澄清需求的时候需要包含相应的组件名（你的意思是否是：机器人通过“摄像头”见到老刘的时候要用“人脸识别”出是他并且使用“机械手”朝他比个中指并且通过“语音合成”向他骂一句滚）
  - 弹出工作流生成确认卡片 + 搭配一个工作流的生成介绍气泡“好的确认了你的需求之后，我将先搭建工作流然后引导你一步步上传/输入这个工作流需要的组建和配置”
  - 用户在卡片上确认生成工作流，然后开始load工作流
2. ConfigAgent：（目的：基于已经构建好的工作流JSON文档，基于节点连接顺序来逐个填充各个节点的字段值，具体展开如下）

### 注释说明：
1. // IntakeAgent：表明该字段需要在 IntakeAgent 阶段结尾生成工作流 JSON 文件时完成赋值，如每个节点呈现在前端的 title；随机数节点输出的中间变量 n等
2. // ConfigAgent：表明该字段需要在 ConfigAgent 阶段需要与用户进行交互来确认对应的字段值，如"TTS_input"需要通过文字交互确认；"execute_emoji"需要通过单选框在 5 个可选的表情中选择；“device_ID”需要通过硬件插入时回传到设备信息来进行填充等

### 字段说明：
自定义一级字段（notes.*）作为每个节点的必填字段，默认值为 placeholder：
    "extra": "configured",       // ConfigAgent 阶段，将会按照节点配置的状态动态更新
    "topology": "usb3",            // ConfigAgent 阶段，将会根据插入硬件时回传的接口信息动态更新
    "device_ID": "screen1",      // ConfigAgent 阶段，将会根据插入硬件时回传的设备信息动态更新
    "session_ID": "123334",    // IntakeAgent  阶段，自动填充上sessionId-服务端会话ID
    "title": "胜负表情展示",  	     // IntakeAgent 阶段，agent基于用户需求的理解，生成对于这个节点的 10 字以内标题
    "subtitle": "物理显示单元", // IntakeAgent 阶段，agent基于用户需求的理解，生成对于这个节点的 15 字以内描述
    "category": "SCREEN",      // IntakeAgent 阶段，agent 基于功能匹配对应的节点类型：MIC | LLM | CAM | HAND | YOLO-HAND | YOLO-RPS | FACE-NET | BASE | TTS | ASR | SCREEN | SPEAKER | WHEEL | RAM | ASSIGN

自定义二级字段（notes.sub.*）作为每个节点对应参数的存放字段，字段名基于不同节点有所差异，具体不同节点的对应category与字段结构展开如下：

## 2.2 触发器-"type": "n8n-nodes-base.scheduleTrigger"
{
  "parameters": {
    "rule": {
      "interval": [
        {}
      ]
    }
  },
  "id": "5a880bb8-2bdb-432c-94ff-ebfa2c1e17f7",
  "name": "schedule_trigger_5s",
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.1,
  "position": [
    -2384,
    1968
  ],
  "notes": {
    "extra": "前端状态自定义字段",
    "device_ID": null,
    "topology": null,
    "subtitle": "游戏的“发令枪”。每隔5秒自动开启一轮新的游戏流程，确保游戏能循环进行。",
    "sub": {
      "seconds": 5    // IntakeAgent
    },
    "title": "游戏开始触发器",
    "category": "BASE",
    "session_ID": "123334"
  }
}
## 2.3 感知器-"type": "n8n-nodes-base.httpRequest"
### 2.3.1 摄像头节点-"category": "CAM"
{
  "parameters": {
    "method": "POST",
    "url": "http://robot.local/api/camera/snapshot",
    "options": {}
  },
  "id": "22292b48-1721-4a8c-8c96-577ead0d3e5c",
  "name": "http_request_camera_snapshot",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.3,
  "position": [
    -816,
    1968
  ],
  "notes": {
    "extra": "configured",
    "device_ID": "cam1",
    "topology": "usb2",
    "subtitle": "调用摄像头，在倒数结束的瞬间捕捉用户的手势画面。",
    "sub": {
      "output": "camera1"    // IntakeAgent（固定变量名，多个时数字递增）
    },
    "title": "用户快照",
    "category": "CAM",
    "session_ID": "123334"
  }
}
## 2.4 处理器-"type": "n8n-nodes-base.set"
### 2.4.1 石头剪刀布识别节点-"category": "YOLO-RPS"
{
  "parameters": {
    "assignments": {
      "assignments": []
    },
    "options": {}
  },
  "id": "f59e5d53-37dd-4c36-bb75-207365294ce9",
  "name": "set_rps_recognition",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [
    -592,
    1968
  ],
  "notes": {
    "extra": "configured",
    "device_ID": null,
    "topology": null,
    "subtitle": "数据登记单元。将AI认出的用户手势标签存入系统，准备与机器人结果进行PK。",
    "sub": {
      "yolov_input": "camera1",        // IntakeAgent（基于前置摄像头的输出变量名填充）
      "yolov_output": "userGesture"    // IntakeAgent（固定变量名，石头剪刀布场景）
    },
    "title": "用户出拳结果登记",
    "category": "YOLO-RPS",
    "session_ID": "123334"
  }
}
### 2.4.2 音频生成节点-"category": "TTS"
{
  "parameters": {
    "assignments": {
      "assignments": []
    },
    "options": {}
  },
  "id": "8cfc8747-7461-4b23-a962-3852a52319c0",
  "name": "set_audio_generate_countdown",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [
    -2160,
    1968
  ],
  "notes": {
    "extra": "configuring | configured",
    "device_ID": null,
    "topology": null,
    "subtitle": "表达转换单元。将“3, 2, 1”文字实时转化为语音文件，用于播报。",
    "sub": {
      "TTS_input": "三、二、一！", // ConfigAgent（与用户文字交互确认字段值）
      "audio_name": "count_down"  // IntakeAgent（基于节点功能生成合适的字段值，作为节点输出的变量名）
    },
    "title": "倒数语音合成",
    "category": "TTS",
    "session_ID": "1233"
  }
}
### 2.4.3 随机数节点-"category": "RAM"
{
  "parameters": {
    "assignments": {
      "assignments": []
    },
    "options": {}
  },
  "id": "44b73913-11cd-40c6-9d2c-2a38409a0ef4",
  "name": "set_generate_random_n",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [
    -1040,
    2160
  ],
  "notes": {
    "extra": "configured",
    "device_ID": null,
    "topology": null,
    "subtitle": "机器人“出拳”决策单元。利用随机算法在1-3之间选一个数，作为机器人本次出的招式。",
    "sub": {
      "random_rule": 3,    // IntakeAgent（固定字段值，石头剪刀布场景）
      "output": "n"        // IntakeAgent（固定字段值，石头剪刀布场景）
    },
    "title": "随机出拳计算",
    "category": "RAM",
    "session_ID": "1233"
  }
}
### 2.4.4 赋值节点-"category": "ASSIGN"
{
  "parameters": {
    "assignments": {
      "assignments": []
    },
    "options": {}
  },
  "id": "44b73913-11cd-40c6-9d2c-2a38409a0ef4",
  "name": "set_robot_gesture_paper",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [
    -1040,
    2160
  ],
  "notes": {
    "extra": "configured",
    "device_ID": null,
    "topology": null,
    "subtitle": "数据记录单元。将随机生成的数字翻译成具体的游戏手势标签，存入内存。",
    "sub": {
      "robotGesture": "paper"    // IntakeAgent（基于前一个连接节点生成合适的字段值）
    },
    "title": "机器人手势赋值",
    "category": "ASSIGN",
    "session_ID": "1233"
  }
}
## 2.5 执行器-"type": "n8n-nodes-base.code"
### 2.5.1 机械手节点-"category": "HAND"
{
  "parameters": {},
  "id": "18103120-8869-4689-8e11-a56dbae00a1a",
  "name": "code_hand_execute_rock",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [
    -1264,
    1776
  ],
  "notes": {
    "extra": "前端状态自定义字段",
    "title": "物理手势驱动",
    "subtitle": "物理动作单元。驱动机械手实时摆出对应的石头、剪刀或布的形状。",
    "category": "HAND",
    "session_ID": "123334",
    "device_ID": "hand1",
    "topology": "usb1",
    "sub": {
      "execute_gesture": "Rock"    // IntakeAgent(基于工作流目的填入 ["Waving","Middle_Finger","Rock","Scissors","Paper","Victory","Default","Put_down"])
    }
  }
}
### 2.5.2 喇叭节点-"category": "SPEAKER"
{
  "parameters": {},
  "id": "0e4335f8-8b9c-40b3-9f5c-2cef59d82e74",
  "name": "code_speaker_execute_countdown",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [
    -1936,
    1968
  ],
  "notes": {
    "extra": "configured",
    "device_ID": "speaker1",
    "topology": "usb3",
    "subtitle": "物理反馈单元。通过喇叭播放倒数语音，提醒用户准备出拳。",
    "sub": {
      "audio_name": "count_down"    // IntakeAgent（基于前置TTS的输出变量名填充）
    },
    "title": "倒数音频播报",
    "category": "SPEAKER",
    "session_ID": "123334"
  }
}
### 2.5.3 屏幕节点-"category": "SCREEN"
{
  "parameters": {},
  "id": "4064999b-fb36-4305-80fe-e24c4771bab6",
  "name": "code_screen_execute_empty_angry",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [
    -144,
    1296
  ],
  "notes": {
    "extra": "placeholder",    // ConfigAgent
    "title": "胜负表情展示",    // IntakeAgent
    "subtitle": "物理显示单元", // IntakeAgent
    "category": "SCREEN",      // IntakeAgent
    "topology": "usb3",        // ConfigAgent
    "device_ID": "screen1",    // ConfigAgent
    "session_ID": "123334",    // IntakeAgent
    "sub": {
      "execute_emoji": "Angry" // ConfigAgent
    }
  }
}