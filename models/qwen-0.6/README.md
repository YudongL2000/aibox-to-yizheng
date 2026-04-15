# Qwen-0.6 模型聊天客户端

这是一个用于与部署在服务器上的 Qwen-0.6 模型进行交互式对话的 Python 脚本，提供命令行和 Web 两种使用方式。

## 功能特性

- ✅ **Web 界面**: 现代化的浏览器聊天界面
- ✅ **命令行界面**: 交互式命令行聊天
- ✅ **自动维护对话历史记录**
- ✅ **支持自定义系统提示词**（Web 界面可直接修改）
- ✅ **支持重置对话历史**
- ✅ **完善的错误处理和超时控制**
- ✅ **简洁易用的 API 接口**

## 环境要求

- Python 3.6+
- curl 命令（系统自带）
- Flask（用于 Web 界面）

## 安装依赖

### 命令行模式
命令行模式只需要系统安装 curl，无需额外依赖。

### Web 界面模式
```bash
pip install -r requirements.txt
```

或者手动安装：
```bash
pip install Flask flask-cors
```

## 使用方法

### 方式一：Web 界面（推荐）

1. **启动 Web 服务器**：
```bash
python app.py
```

2. **打开浏览器访问**：
```
http://localhost:5000
```

3. **使用 Web 界面**：
   - 在左侧边栏可以修改系统提示词
   - 在聊天区域输入消息并发送
   - 点击"重置对话"按钮清空历史
   - 点击"加载当前提示词"查看当前设置

**Web 界面特点**：
- 🎨 现代化的 UI 设计
- 💬 实时聊天体验
- ⚙️ 可视化系统提示词设置
- 📱 响应式设计，支持移动端

### 方式二：命令行界面

直接运行脚本开始聊天：

```bash
python qwen_inference.py
```

### 交互命令

在聊天过程中，你可以使用以下命令：

- **正常聊天**: 直接输入消息并按回车发送
- **退出程序**: 输入 `quit`、`exit` 或 `q`
- **重置对话**: 输入 `reset` 清空对话历史（保留系统提示词）
- **更改系统提示词**: 输入 `system <新的提示词>` 来更改系统提示词

### 示例对话

```
你: 你好，请介绍一下你自己。
助手: 你好！我是 Qwen，一个 AI 助手...

你: reset
对话历史已重置

你: system 你是一个专业的编程助手
系统提示词已更新为: 你是一个专业的编程助手

你: quit
再见！
```

## API 接口说明

### QwenChatClient 类

主要的聊天客户端类，提供了与 Qwen 模型交互的接口。

#### 初始化参数

```python
client = QwenChatClient(
    api_url="http://115.190.193.254:10800/v1/chat/completions",  # API 地址
    model="qwen3-0.6b",  # 模型名称
    system_prompt="简短回答所有问题"  # 系统提示词
)
```

#### 主要方法

##### `chat(user_message: str) -> Optional[str]`

发送用户消息并获取模型回复。

**参数:**
- `user_message` (str): 用户输入的消息

**返回值:**
- `str`: 模型的回复内容
- `None`: 如果请求失败则返回 None

**示例:**
```python
client = QwenChatClient()
reply = client.chat("你好")
print(reply)
```

##### `reset_conversation()`

重置对话历史，但保留系统提示词。

**示例:**
```python
client.reset_conversation()
```

##### `set_system_prompt(new_prompt: str)`

设置新的系统提示词并重置对话历史。

**参数:**
- `new_prompt` (str): 新的系统提示词

**示例:**
```python
client.set_system_prompt("你是一个专业的翻译助手")
```

## 代码示例

### 在代码中使用

```python
from qwen_inference import QwenChatClient

# 创建客户端
client = QwenChatClient(
    system_prompt="你是一个友好的助手"
)

# 发送消息
reply = client.chat("你好，介绍一下你自己")
print(reply)

# 继续对话
reply = client.chat("1+1等于多少？")
print(reply)

# 重置对话
client.reset_conversation()
```

### 自定义 API 地址

```python
client = QwenChatClient(
    api_url="http://your-server:port/v1/chat/completions",
    model="qwen3-0.6b",
    system_prompt="你的自定义提示词"
)
```

## Web API 接口

Web 服务器提供以下 REST API 接口：

### POST `/api/chat`
发送聊天消息

**请求体**:
```json
{
    "message": "用户消息",
    "session_id": "会话ID（可选）"
}
```

**响应**:
```json
{
    "success": true,
    "reply": "助手回复"
}
```

### POST `/api/reset`
重置对话历史

**响应**:
```json
{
    "success": true,
    "message": "对话历史已重置"
}
```

### GET `/api/system_prompt`
获取当前系统提示词

**响应**:
```json
{
    "success": true,
    "prompt": "当前系统提示词"
}
```

### POST `/api/system_prompt`
设置系统提示词

**请求体**:
```json
{
    "prompt": "新的系统提示词",
    "session_id": "会话ID（可选）"
}
```

**响应**:
```json
{
    "success": true,
    "message": "系统提示词已更新",
    "prompt": "新的系统提示词"
}
```

## 服务器配置

脚本默认连接到以下服务器：
- **地址**: `http://115.190.193.254:10800`
- **模型**: `qwen3-0.6b`
- **API 端点**: `/v1/chat/completions`

如需修改服务器地址，可以在代码中修改 `QwenChatClient` 的初始化参数，或直接编辑脚本中的默认值。

**Web 服务器配置**：
- **默认地址**: `http://localhost:5000`
- **默认端口**: `5000`
- 可在 `app.py` 中修改 `app.run()` 的参数来更改端口和主机

## 错误处理

脚本包含完善的错误处理机制：

- **网络错误**: 自动捕获并显示错误信息
- **超时控制**: 请求超时时间为 30 秒
- **JSON 解析错误**: 自动处理响应格式异常
- **请求失败**: 自动回滚消息历史，避免状态不一致

## 注意事项

1. 确保服务器正常运行且网络连接正常
2. 对话历史会保存在内存中，程序退出后会自动清空
3. 系统提示词会影响模型的回复风格，请根据需求调整
4. 如果遇到连接问题，请检查服务器地址和端口是否正确

## 许可证

本项目仅供学习和研究使用。


