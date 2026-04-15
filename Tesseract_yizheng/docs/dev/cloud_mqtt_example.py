#!/usr/bin/env python3
# [Input] Consume upstream contracts defined by `docs/dev/.folder.md`[Pos].
# [Output] Provide cloud mqtt example capability to downstream modules.
# [Pos] module node in docs/dev
# [Sync] If this file changes, update this header and `docs/dev/.folder.md`.

"""
[INPUT]: 依赖 json/time/threading/uuid 与 paho.mqtt.client 的 MQTT 连接能力，依赖 datetime 输出可读时间戳
[OUTPUT]: 对外提供 create_* 消息工厂、CloudMqttClient 调试客户端、main 交互式调试入口
[POS]: 项目根目录的 MQTT 云端调试脚本，负责向 AI Box 下发指令并对端侧状态流与命令回包做可读化收敛
[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md

云端 MQTT 控制示例
用于向端侧 AI Box 发送控制指令并接收状态反馈

依赖安装: pip install paho-mqtt

使用方法:
    python cloud_mqtt_example.py

Author: AI Box Cloud
Date: 2026-03-25
"""

from __future__ import annotations

import json
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Callable

import paho.mqtt.client as mqtt


# ============================================================
# MQTT 配置
# ============================================================
MQTT_BROKER = "115.190.193.254"  # MQTT Broker 地址
MQTT_PORT = 17801  # MQTT 端口
DEVICE_ID = "aibox001"  # 端侧设备 ID
MQTT_KEEPALIVE = 60

# 主题定义
TOPIC_CLOUD2EDGE = f"qsf/{DEVICE_ID}/cloud2edge"  # 云端 -> 端侧
TOPIC_EDGE2CLOUD = f"qsf/{DEVICE_ID}/edge2cloud"  # 端侧 -> 云端

# 调试行为
COMMAND_TIMEOUT_SECONDS = 3.0
STATUS_TIMEOUT_SECONDS = 2.0
DEFAULT_WORKFLOW_JSON = "game_0203.json"
HAND_GESTURE_DEVICE_TYPE = "hand"
HAND_GESTURE_DEVICE_STATUS = "activing"


# ============================================================
# 消息格式定义
# ============================================================

def now_str() -> str:
    """返回统一的日志时间格式。"""
    return f"[{datetime.now()}]"


def attach_request_id(message: dict[str, Any], request_id: str | None = None) -> dict[str, Any]:
    """为消息补充 request_id，便于调试端做本地关联。"""
    final_message = dict(message)
    final_message["request_id"] = request_id or str(uuid.uuid4())
    return final_message


def create_workflow_message(
    workflow: Any,
    request_id: str | None = None,
) -> dict[str, Any]:
    """
    创建工作流消息。

    Args:
        workflow: 工作流定义，可以是简化步骤列表，也可以是完整 JSON 对象
        request_id: 调试侧生成的请求 ID

    Returns:
        消息字典
    """
    return attach_request_id(
        {
            "msg_type": "workflow",
            "msg_content": [workflow],
        },
        request_id,
    )


def create_workflow_stop_message(request_id: str | None = None) -> dict[str, Any]:
    """创建停止全部工作流消息。"""
    return attach_request_id(
        {
            "msg_type": "workflow_stop",
            "msg_content": [{}],
        },
        request_id,
    )


def create_cmd_message(
    device_type: str,
    cmd: str,
    request_id: str | None = None,
    **kwargs: Any,
) -> dict[str, Any]:
    """
    创建控制指令消息。

    Args:
        device_type: 设备类型 (camera/audio/hand 等)
        cmd: 控制命令 (start/stop/play/rock 等)
        request_id: 调试侧生成的请求 ID
        **kwargs: 额外参数 (如 path 用于播放音频)

    Returns:
        消息字典
    """
    content = {
        "device_type": device_type,
        "cmd": cmd,
    }
    content.update(kwargs)

    return attach_request_id(
        {
            "msg_type": "cmd",
            "msg_content": [content],
        },
        request_id,
    )


def create_hand_gesture_message(cmd: str, request_id: str | None = None) -> dict[str, Any]:
    """创建机械手手势控制消息。"""
    return create_cmd_message(
        HAND_GESTURE_DEVICE_TYPE,
        cmd,
        request_id=request_id,
        device_status=HAND_GESTURE_DEVICE_STATUS,
    )


def create_status_query(request_id: str | None = None) -> dict[str, Any]:
    """创建状态查询消息。"""
    return attach_request_id(
        {
            "msg_type": "status",
            "msg_content": [{}],
        },
        request_id,
    )


def create_batch_cmd_message(
    commands: list[dict[str, Any]],
    request_id: str | None = None,
) -> dict[str, Any]:
    """
    创建批量控制指令。

    Args:
        commands: 命令列表 [{"device_type": "xxx", "cmd": "xxx"}, ...]
        request_id: 调试侧生成的请求 ID

    Returns:
        消息字典
    """
    return attach_request_id(
        {
            "msg_type": "cmd",
            "msg_content": commands,
        },
        request_id,
    )


def load_json_file(json_path: str) -> Any:
    """读取并解析 JSON 文件。"""
    file_path = Path(json_path).expanduser()
    if not file_path.is_file():
        raise FileNotFoundError(f"JSON 文件不存在: {file_path}")

    with file_path.open("r", encoding="utf-8") as file:
        return json.load(file)


@dataclass(slots=True)
class ReceivedMessage:
    """保存收到的 MQTT 消息，便于等待与关联。"""

    topic: str
    payload: dict[str, Any]
    raw_payload: str
    received_at: float


class CloudMqttClient:
    """云端 MQTT 调试客户端。"""

    def __init__(self, broker: str, port: int, device_id: str):
        self.broker = broker
        self.port = port
        self.device_id = device_id
        self.topic_send = f"qsf/{device_id}/cloud2edge"
        self.topic_recv = f"qsf/{device_id}/edge2cloud"

        self.connected_event = threading.Event()
        self.message_condition = threading.Condition()
        self.received_messages: list[ReceivedMessage] = []

        self.last_status_payload: dict[str, Any] | None = None
        self.missing_request_id_warned = False

        self.client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=f"cloud_controller_{device_id}_{int(time.time())}",
        )
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_publish = self._on_publish
        self.client.reconnect_delay_set(min_delay=1, max_delay=5)

    # ================== MQTT 生命周期 ==================

    def connect(self):
        """连接到 MQTT Broker。"""
        self.connected_event.clear()
        self.client.connect(self.broker, self.port, MQTT_KEEPALIVE)
        self.client.loop_start()

        if not self.connected_event.wait(timeout=5):
            raise TimeoutError("等待 MQTT 连接超时")

    def disconnect(self):
        """断开连接。"""
        self.client.loop_stop()
        self.client.disconnect()

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        """连接成功回调。"""
        rc = getattr(reason_code, "value", reason_code)
        if rc == 0:
            print(f"{now_str()} ✓ 已连接到 MQTT Broker: {self.broker}:{self.port}")
            client.subscribe(self.topic_recv, qos=1)
            print(f"{now_str()} ✓ 已订阅主题: {self.topic_recv}")
            self.connected_event.set()
            return

        print(f"{now_str()} ✗ 连接失败, 错误码: {reason_code}")

    def _on_message(self, client, userdata, msg):
        """收到消息回调。"""
        raw_payload = msg.payload.decode("utf-8", errors="replace")

        try:
            payload = json.loads(raw_payload)
        except json.JSONDecodeError:
            print(f"{now_str()} ✗ JSON 解析失败: {raw_payload}")
            return

        message = ReceivedMessage(
            topic=msg.topic,
            payload=payload,
            raw_payload=raw_payload,
            received_at=time.monotonic(),
        )

        with self.message_condition:
            self.received_messages.append(message)
            self.message_condition.notify_all()

        msg_type = payload.get("msg_type", "unknown")
        if msg_type.endswith("_response") and "request_id" not in payload and not self.missing_request_id_warned:
            print(f"{now_str()} ! 当前协议回包未回显 request_id，调试器将按时间窗与命令名做启发式关联")
            self.missing_request_id_warned = True

        if msg_type == "status_response":
            self._handle_status_response(message)
        elif msg_type == "cmd_response":
            self._print_cmd_response(message)
        else:
            self._print_raw_message(message)

    def _on_publish(self, client, userdata, mid, reason_code, properties):
        """发布成功回调。"""
        print(f"{now_str()} ▶ 消息已发送 (mid={mid})")

    # ================== 消息打印与归并 ==================

    def _handle_status_response(self, message: ReceivedMessage):
        """持续打印每一条状态心跳。"""
        self.last_status_payload = message.payload
        self._print_status_response(message)

    def _print_status_response(self, message: ReceivedMessage):
        """打印设备状态响应。"""
        payload = message.payload
        devices = payload.get("devices", [])

        print(f"\n{now_str()} ◀ 收到端侧状态:")
        print(f"  主题: {message.topic}")

        timestamp = payload.get("timestamp")
        if timestamp is not None:
            print(f"  端侧时间戳: {timestamp}")

        print(f"  设备数量: {len(devices)}")
        for dev in devices:
            extras = []
            if dev.get("device_port"):
                extras.append(f"port={dev['device_port']}")
            if dev.get("vid_pid"):
                extras.append(f"vid_pid={dev['vid_pid']}")

            suffix = ""
            if extras:
                suffix = " | " + " | ".join(extras)

            print(
                f"    - {dev.get('device_type', 'unknown')}: "
                f"{dev.get('device_status', 'unknown')} "
                f"({dev.get('device_name', 'unknown')}) @ "
                f"{dev.get('device_path', 'unknown')}{suffix}"
            )

    def _print_cmd_response(self, message: ReceivedMessage):
        """打印命令执行结果。"""
        payload = message.payload
        result = payload.get("result", -1)
        status = "成功" if result == 0 else f"失败({result})"

        print(f"\n{now_str()} ◀ 收到命令回包:")
        print(f"  主题: {message.topic}")

        timestamp = payload.get("timestamp")
        if timestamp is not None:
            print(f"  端侧时间戳: {timestamp}")

        print(f"  设备: {payload.get('device_type', 'unknown')}")
        print(f"  命令: {payload.get('cmd', 'unknown')}")
        print(f"  结果: {status}")
        print(f"  消息: {payload.get('message', 'N/A')}")

    def _print_raw_message(self, message: ReceivedMessage):
        """打印无法归类的消息。"""
        payload = message.payload
        print(f"\n{now_str()} ◀ 收到端侧消息:")
        print(f"  主题: {message.topic}")
        print(f"  类型: {payload.get('msg_type', 'unknown')}")
        print(f"  原始数据: {json.dumps(payload, ensure_ascii=False, indent=2)}")

    # ================== 等待与关联 ==================

    def _message_cursor(self) -> int:
        """记录当前消息游标，便于只等待后续新消息。"""
        with self.message_condition:
            return len(self.received_messages)

    def _wait_for_message(
        self,
        start_index: int,
        matcher: Callable[[ReceivedMessage], bool],
        timeout: float,
    ) -> ReceivedMessage | None:
        """等待满足条件的消息。"""
        deadline = time.monotonic() + timeout
        cursor = start_index

        with self.message_condition:
            while True:
                for index in range(cursor, len(self.received_messages)):
                    message = self.received_messages[index]
                    if matcher(message):
                        return message

                cursor = len(self.received_messages)
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return None

                self.message_condition.wait(timeout=remaining)

    def _send(self, message: dict[str, Any]) -> tuple[str, float]:
        """发送消息。"""
        request_id = str(message.get("request_id") or "")
        payload = json.dumps(message, ensure_ascii=False)

        print(f"\n{now_str()} ▶ 发送到 {self.topic_send}:")
        print(f"  {payload}")

        publish_result = self.client.publish(self.topic_send, payload, qos=1)
        publish_result.wait_for_publish(timeout=2)
        return request_id, time.monotonic()

    def _print_match_result(self, response: ReceivedMessage, request_id: str, hint: str):
        """打印回包是如何与本次请求关联上的。"""
        response_request_id = response.payload.get("request_id")
        if response_request_id == request_id:
            print(f"{now_str()} ✓ 已按 request_id 关联到本次{hint}回包")
            return

        print(f"{now_str()} ! 本次{hint}回包未带 request_id，已按时间窗与命令名做启发式关联")

    def _send_cmd_and_wait(
        self,
        device_type: str,
        cmd: str,
        response_device_type: str | None = None,
        request_label: str | None = None,
        **kwargs: Any,
    ) -> dict[str, Any] | None:
        """发送单设备命令并等待回包。"""
        request_id = str(uuid.uuid4())
        start_index = self._message_cursor()
        message = create_cmd_message(device_type, cmd, request_id=request_id, **kwargs)
        _, sent_at = self._send(message)

        response = self._wait_for_message(
            start_index=start_index,
            timeout=COMMAND_TIMEOUT_SECONDS,
            matcher=lambda item: self._is_matching_cmd_response(
                item,
                sent_at,
                request_id,
                response_device_type if response_device_type is not None else device_type,
                cmd,
            ),
        )

        if response is None:
            label = request_label or f"{device_type or 'cmd'}.{cmd}"
            print(f"{now_str()} ! {label} 在 {COMMAND_TIMEOUT_SECONDS:.1f}s 内未等到匹配回包")
            return None

        self._print_match_result(response, request_id, "命令")
        return response.payload

    def _send_hand_gesture_and_wait(self, cmd: str) -> dict[str, Any] | None:
        """按机械手新协议发送手势控制。"""
        request_id = str(uuid.uuid4())
        start_index = self._message_cursor()
        message = create_hand_gesture_message(cmd, request_id=request_id)
        _, sent_at = self._send(message)

        response = self._wait_for_message(
            start_index=start_index,
            timeout=COMMAND_TIMEOUT_SECONDS,
            matcher=lambda item: self._is_matching_cmd_response(item, sent_at, request_id, None, cmd),
        )

        if response is None:
            print(f"{now_str()} ! hand.{cmd} 在 {COMMAND_TIMEOUT_SECONDS:.1f}s 内未等到匹配回包")
            return None

        self._print_match_result(response, request_id, "命令")
        return response.payload

    @staticmethod
    def _is_matching_cmd_response(
        message: ReceivedMessage,
        sent_at: float,
        request_id: str,
        device_type: str | None,
        cmd: str,
    ) -> bool:
        """优先按 request_id 关联，不行就退化为时间窗 + 命令名。"""
        payload = message.payload
        if payload.get("msg_type") != "cmd_response":
            return False

        if payload.get("request_id") == request_id:
            return True

        if device_type is not None and payload.get("device_type") != device_type:
            return False

        return (
            message.received_at >= sent_at
            and payload.get("cmd") == cmd
        )

    def query_status(self) -> dict[str, Any] | None:
        """查询所有设备状态，并强制展开下一条状态快照。"""
        request_id = str(uuid.uuid4())
        start_index = self._message_cursor()
        message = create_status_query(request_id=request_id)
        _, sent_at = self._send(message)

        response = self._wait_for_message(
            start_index=start_index,
            timeout=STATUS_TIMEOUT_SECONDS,
            matcher=lambda item: self._is_matching_status_response(item, sent_at, request_id),
        )

        if response is None:
            print(f"{now_str()} ! status 在 {STATUS_TIMEOUT_SECONDS:.1f}s 内未等到新状态快照")
            return None

        self._print_match_result(response, request_id, "状态查询")
        return response.payload

    @staticmethod
    def _is_matching_status_response(
        message: ReceivedMessage,
        sent_at: float,
        request_id: str,
    ) -> bool:
        """状态查询只能退化到时间窗匹配，因为当前端侧未回显 request_id。"""
        payload = message.payload
        if payload.get("msg_type") != "status_response":
            return False

        if payload.get("request_id") == request_id:
            return True

        return message.received_at >= sent_at

    def print_cached_status(self):
        """打印最近一次缓存到的状态快照。"""
        if not self.last_status_payload:
            print(f"{now_str()} ! 目前还没有收到任何状态快照")
            return

        self._print_status_response(
            ReceivedMessage(
                topic=self.topic_recv,
                payload=self.last_status_payload,
                raw_payload=json.dumps(self.last_status_payload, ensure_ascii=False),
                received_at=time.monotonic(),
            )
        )

    # ================== 设备控制封装 ==================

    def camera_start(self):
        """打开摄像头。"""
        return self._send_cmd_and_wait("camera", "start")

    def camera_stop(self):
        """关闭摄像头。"""
        return self._send_cmd_and_wait("camera", "stop")

    def audio_start(self):
        """打开麦克风。"""
        return self._send_cmd_and_wait("audio", "start")

    def audio_stop(self):
        """关闭麦克风。"""
        return self._send_cmd_and_wait("audio", "stop")

    def audio_play(self, mp3_path: str):
        """播放 MP3 文件。"""
        return self._send_cmd_and_wait("speaker", "play", path=mp3_path)

    def hand_rock(self):
        """手势: 摇滚。"""
        return self._send_hand_gesture_and_wait("rock")

    def hand_paper(self):
        """手势: 布。"""
        return self._send_hand_gesture_and_wait("paper")

    def hand_scissors(self):
        """手势: 剪刀。"""
        return self._send_hand_gesture_and_wait("scissors")

    def hand_mid_finger(self):
        """手势: 中指。"""
        return self._send_hand_gesture_and_wait("mid_finger")

    def hand_def(self):
        """手势: 默认姿态。"""
        return self._send_hand_gesture_and_wait("def")

    def hand_wave(self):
        """手势: 挥手。"""
        return self._send_hand_gesture_and_wait("wave")

    def send_batch(self, commands: list[dict[str, Any]]):
        """
        批量发送控制指令。

        示例:
            client.send_batch([
                {"device_type": "camera", "cmd": "start"},
                {"device_type": "audio", "cmd": "start"}
            ])
        """
        message = create_batch_cmd_message(commands)
        self._send(message)
        print(f"{now_str()} ! 批量命令已下发，后续回包会按收到顺序持续打印")

    def send_workflow(self, workflow: Any, source_path: str | None = None):
        """
        下发工作流。

        示例:
            client.send_workflow([
                {"device_type": "camera", "cmd": "start"},
                {"device_type": "audio", "cmd": "start"}
            ])
        """
        message = create_workflow_message(workflow)
        self._send(message)
        summary = self._describe_workflow(workflow, source_path)
        print(f"{now_str()} ! workflow 已下发，若端侧连续执行，回包会逐条打印")
        print(f"{now_str()} · {summary}")

    def send_workflow_file(self, json_path: str = DEFAULT_WORKFLOW_JSON):
        """从 JSON 文件读取完整工作流并下发。"""
        workflow = load_json_file(json_path)
        self.send_workflow(workflow, source_path=json_path)

    def send_workflow_stop(self):
        """停止全部工作流。"""
        message = create_workflow_stop_message()
        self._send(message)
        print(f"{now_str()} ! workflow_stop 已下发，端侧应停止当前全部工作流")

    @staticmethod
    def _describe_workflow(workflow: Any, source_path: str | None = None) -> str:
        """生成工作流摘要，减少调试时的盲发。"""
        parts = []
        if source_path:
            parts.append(f"来源文件: {source_path}")

        if isinstance(workflow, dict):
            name = workflow.get("name")
            nodes = workflow.get("nodes")
            if name:
                parts.append(f"名称: {name}")
            if isinstance(nodes, list):
                parts.append(f"节点数: {len(nodes)}")
        elif isinstance(workflow, list):
            parts.append(f"步骤数: {len(workflow)}")
        else:
            parts.append(f"工作流类型: {type(workflow).__name__}")

        return " | ".join(parts) if parts else "已下发 workflow"


# ============================================================
# 主程序
# ============================================================

def print_menu():
    """打印交互式菜单。"""
    print("\n可用命令:")
    print("  1. camera_start   - 打开摄像头")
    print("  2. camera_stop    - 关闭摄像头")
    print("  3. audio_start    - 打开麦克风")
    print("  4. audio_stop     - 关闭麦克风")
    print("  5. audio_play     - 播放 MP3")
    print("  6. hand_rock      - 手势摇滚")
    print("  7. hand_paper     - 手势布")
    print("  8. hand_scissors  - 手势剪刀")
    print("  9. hand_wave      - 手势挥手")
    print("  hand_mid_finger   - 手势中指")
    print("  hand_def          - 恢复默认姿态")
    print("  10. status        - 主动查询设备状态")
    print("  11. latest        - 打印最近一次缓存状态")
    print("  12. batch         - 批量控制示例")
    print(f"  13. workflow      - 下发 {DEFAULT_WORKFLOW_JSON}")
    print("  14. workflow_stop - 停止全部工作流")
    print("  h. help           - 重新显示帮助")
    print("  q. quit           - 退出")
    print("-" * 60)


def main():
    print("=" * 60)
    print("  云端 MQTT 控制调试器")
    print("=" * 60)

    client = CloudMqttClient(MQTT_BROKER, MQTT_PORT, DEVICE_ID)

    try:
        client.connect()
        print_menu()

        while True:
            cmd = input("\n请输入命令编号或名称: ").strip().lower()

            if cmd in {"1", "camera_start"}:
                client.camera_start()
            elif cmd in {"2", "camera_stop"}:
                client.camera_stop()
            elif cmd in {"3", "audio_start"}:
                client.audio_start()
            elif cmd in {"4", "audio_stop"}:
                client.audio_stop()
            elif cmd in {"5", "audio_play"}:
                path = input("请输入 MP3 文件路径: ").strip()
                client.audio_play(path)
            elif cmd in {"6", "hand_rock", "rock"}:
                client.hand_rock()
            elif cmd in {"7", "hand_paper", "paper"}:
                client.hand_paper()
            elif cmd in {"8", "hand_scissors", "scissors"}:
                client.hand_scissors()
            elif cmd in {"9", "hand_wave", "wave"}:
                client.hand_wave()
            elif cmd in {"mid", "hand_mid_finger", "mid_finger"}:
                client.hand_mid_finger()
            elif cmd in {"def", "hand_def"}:
                client.hand_def()
            elif cmd in {"10", "status"}:
                client.query_status()
            elif cmd in {"11", "latest"}:
                client.print_cached_status()
            elif cmd in {"12", "batch"}:
                client.send_batch(
                    [
                        {"device_type": "camera", "cmd": "start"},
                        {"device_type": "audio", "cmd": "start"},
                    ]
                )
            elif cmd in {"13", "workflow"}:
                client.send_workflow_file(DEFAULT_WORKFLOW_JSON)
            elif cmd in {"14", "workflow_stop"}:
                client.send_workflow_stop()
            elif cmd in {"h", "help"}:
                print_menu()
            elif cmd in {"q", "quit"}:
                break
            else:
                print("未知命令，输入 h 查看帮助")

    except KeyboardInterrupt:
        print("\n用户中断")
    finally:
        client.disconnect()
        print("已断开连接")


if __name__ == "__main__":
    main()
