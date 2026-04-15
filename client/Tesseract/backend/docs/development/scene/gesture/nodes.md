# 手势识别场景节点规范（gesture）

## 1. 场景目标
- 机器人定时启动识别流程。
- 抓拍并识别人脸身份（老刘 / 老付）。
- 根据身份执行机械手动作并播报对应语音。

## 2. notes 字段规范
每个节点必须包含以下一级字段：
- `extra`
- `topology`
- `device_ID`
- `session_ID`
- `title`
- `subtitle`
- `category`
- `sub`

`category` 允许值：
`MIC | LLM | CAM | HAND | YOLO-HAND | YOLO-RPS | FACE-NET | BASE | TTS | ASR | SCREEN | SPEAKER | WHEEL | RAM | ASSIGN | LLM-EMO`

## 3. 节点类型规范
### 3.1 触发器
- 类型固定：`n8n-nodes-base.scheduleTrigger`
- 名称建议：`schedule_trigger_30s`
- `notes.sub`：`{"seconds": 30}`

### 3.2 感知器
- 类型固定：`n8n-nodes-base.httpRequest`
- 摄像头节点类别：`CAM`
- `notes.sub`：`{"output": "camera1"}`

### 3.3 处理器
- 类型固定：`n8n-nodes-base.set`
- 本场景允许处理器：
  - 人脸识别（`FACE-NET`）
  - TTS 文本准备（`TTS`）
- `notes.sub` 约束：
  - 人脸识别：`{"facenet_input": "camera1", "facenet_output": "facenet_output", "face_url":[
          "oss://bucket-name/path/to/image1.jpg",       
          "oss://bucket-name/path/to/image2.jpg"
      ],
      "face_info":[
           "人物名称1",
           "人物名称2"
      ]}` // 用户在ConfigAgent阶段可配置对应的人脸图片以及人脸名字，response.type=image_upload 
  - TTS：`{"TTS_input": "...", "audio_name": "..."}` // 用户在ConfigAgent阶段可配置TTS_input，response.type=text

### 3.4 逻辑器
- 类型固定：`n8n-nodes-base.if`
- 变量比较必须使用变量名，不允许 `{{$json.xxx}}` 格式。

### 3.5 执行器
- 类型固定：`n8n-nodes-base.code`
- 本场景允许执行器：
  - 机械手动作（`HAND`）
  - 喇叭播放（`SPEAKER`）
- 执行参数全部写入 `notes.sub`：
  - 机械手：`{"execute_gesture": ["Waving","Put_down","Middle_Finger","Victory"]}` // 用户在ConfigAgent阶段可配置，response.type=select_single ，同配置屏幕一样4选一
  - 喇叭：`{"audio_name": "..."}`

## 4. 标题与副标题（few-shot）
- 触发器：`定期开启新一轮任务`
- 摄像头：`视觉影像捕获`
- 人脸处理器：`AI 特征识别器`
- 身份判断 IF：`身份验证网关`
- 机械手执行器：`手势肢体传动`
- TTS 处理器：`语音合成算法`
- 喇叭执行器：`音频回响器`

## 5. 连接拓扑规则（强制）
1. 触发器只能有一条主链输出。
2. 人脸处理器节点（`set_face_net_recognition`）输出直接并列连接两个身份 IF（`if_identity_is_liu`、`if_identity_is_fu`）。
3. 执行器只允许挂在 IF 的 `true` 分支。
4. 每个身份 IF 的 `true` 分支必须并列连接：`HAND` + `TTS`，且 `TTS -> SPEAKER`。
5. 不允许增加与场景无关的赋值型 set 节点（如随机数、底盘、ASSIGN）。

## 6. 严格约束
1. `notes.sub` 仅允许使用本规范定义的键名。
2. 不允许新增、删除、重命名或改写 `notes` 一级字段。
3. 处理器必须是 `n8n-nodes-base.set`。
4. 执行器必须是 `n8n-nodes-base.code`。
5. `notes` 内容必须字符串归一化：除 `sub` 内数值字段外，统一使用字符串，不使用 `null`。
