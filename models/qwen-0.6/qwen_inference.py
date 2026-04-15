#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Qwen-0.6 模型聊天脚本
用于与部署在服务器上的 Qwen-0.6 模型进行交互式对话
"""

import json
import subprocess
from typing import List, Dict, Optional


class QwenChatClient:
    """Qwen 聊天客户端类"""
    
    def __init__(self, 
                 api_url: str = "http://115.190.193.254:10800/v1/chat/completions",
                 model: str = "qwen3-0.6b",
                 system_prompt: str = "简短回答所有问题"):
        """
        初始化聊天客户端
        Args:
            api_url: API 服务器地址
            model: 模型名称
            system_prompt: 系统提示词
        """
        self.api_url = api_url
        self.model = model
        self.system_prompt = system_prompt
        self.messages: List[Dict[str, str]] = []
        
        # 初始化系统消息
        if system_prompt:
            self.messages.append({
                "role": "system",
                "content": system_prompt
            })
    
    def chat(self, user_message: str) -> Optional[str]:
        """
        发送用户消息并获取模型回复
        
        Args:
            user_message: 用户输入的消息
            
        Returns:
            模型的回复内容，如果出错则返回 None
        """
        # 添加用户消息到历史记录
        self.messages.append({
            "role": "user",
            "content": user_message
        })
        
        # 构建请求数据
        request_data = {
            "model": self.model,
            "messages": self.messages,
            "chat_template_kwargs": {
                "enable_thinking": False
            }
        }
        
        try:
            # 将请求数据转换为 JSON 字符串
            json_data = json.dumps(request_data, ensure_ascii=False)
            
            print("posted request:", self.api_url)
            print("posted request data:", request_data)
            
            # 构建 curl 命令
            # 使用 --connect-timeout 10 和 --max-time 60 设置超时
            curl_cmd = [
                "curl",
                "-X", "POST",
                self.api_url,
                "-H", "Content-Type: application/json",
                "-d", json_data,
                "-s",  # 静默模式，不显示进度
                "-S",  # 显示错误信息
                "-w", "\nHTTP_CODE:%{http_code}\n"  # 输出 HTTP 状态码
            ]
            print("curl command:", curl_cmd)
            # 执行 curl 命令
            result = subprocess.run(
                curl_cmd,
                capture_output=True,
                text=True,
                timeout=65  # Python 层面的超时保护（比 curl 的 max-time 稍长）
            )
            
            # 检查 curl 执行是否成功
            if result.returncode != 0:
                print(f"curl 命令执行失败 (返回码: {result.returncode})")
                if result.stderr:
                    print(f"错误信息: {result.stderr}")
                # 移除刚才添加的用户消息（因为请求失败）
                if self.messages and self.messages[-1]["role"] == "user":
                    self.messages.pop()
                return None
            
            # 解析响应
            output = result.stdout.strip()
            
            # 分离 HTTP 状态码和响应体
            if "HTTP_CODE:" in output:
                parts = output.rsplit("HTTP_CODE:", 1)
                response_body = parts[0].strip()
                http_code = parts[1].strip() if len(parts) > 1 else "200"
            else:
                response_body = output
                http_code = "200"
            
            # 检查 HTTP 状态码
            if http_code != "200":
                print(f"HTTP 错误: 状态码 {http_code}")
                print(f"响应内容: {response_body[:200]}")
                # 移除刚才添加的用户消息（因为请求失败）
                if self.messages and self.messages[-1]["role"] == "user":
                    self.messages.pop()
                return None
            
            # 解析 JSON 响应
            try:
                result_json = json.loads(response_body)
            except json.JSONDecodeError as e:
                print(f"JSON 解析错误: {e}")
                print(f"响应内容: {response_body[:200]}")
                # 移除刚才添加的用户消息（因为请求失败）
                if self.messages and self.messages[-1]["role"] == "user":
                    self.messages.pop()
                return None
            
            print("response:", result_json)
            print("--------------------------------")
            
            # 提取助手回复
            if "choices" in result_json and len(result_json["choices"]) > 0:
                assistant_message = result_json["choices"][0]["message"]["content"]
                
                # 添加助手回复到历史记录
                self.messages.append({
                    "role": "assistant",
                    "content": assistant_message
                })
                
                return assistant_message
            else:
                print(f"错误: 响应格式异常 - {result_json}")
                return None
                
        except subprocess.TimeoutExpired:
            print("请求超时错误: 服务器响应时间过长（超过60秒）")
            print("这可能是正常的，模型生成可能需要较长时间")
            # 移除刚才添加的用户消息（因为请求失败）
            if self.messages and self.messages[-1]["role"] == "user":
                self.messages.pop()
            return None
        except FileNotFoundError:
            print("错误: 未找到 curl 命令")
            print("请确保系统已安装 curl")
            # 移除刚才添加的用户消息（因为请求失败）
            if self.messages and self.messages[-1]["role"] == "user":
                self.messages.pop()
            return None
        except json.JSONDecodeError as e:
            print(f"JSON 解析错误: {e}")
            # 移除刚才添加的用户消息（因为请求失败）
            if self.messages and self.messages[-1]["role"] == "user":
                self.messages.pop()
            return None
        except Exception as e:
            print(f"未知错误: {type(e).__name__}: {e}")
            # 移除刚才添加的用户消息（因为请求失败）
            if self.messages and self.messages[-1]["role"] == "user":
                self.messages.pop()
            return None
    
    def reset_conversation(self):
        """重置对话历史，保留系统提示词"""
        self.messages = []
        if self.system_prompt:
            self.messages.append({
                "role": "system",
                "content": self.system_prompt
            })
    
    def set_system_prompt(self, new_prompt: str):
        """
        设置新的系统提示词并重置对话
        
        Args:
            new_prompt: 新的系统提示词
        """
        self.system_prompt = new_prompt
        self.reset_conversation()
    
    def test_connection(self) -> bool:
        """
        测试服务器连接是否正常
        
        Returns:
            bool: 连接成功返回 True，失败返回 False
        """
        test_data = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "简短回答所有问题"},
                {"role": "user", "content": "你好"}
            ],
            "chat_template_kwargs": {
                "enable_thinking": "false"
            }
        }
        
        try:
            print(f"正在测试连接到 {self.api_url}...")
            
            # 将请求数据转换为 JSON 字符串
            json_data = json.dumps(test_data, ensure_ascii=False)
            
            # 构建 curl 命令
            curl_cmd = [
                "curl",
                "-X", "POST",
                self.api_url,
                "-H", "Content-Type: application/json",
                "-d", json_data,
                "--connect-timeout", "10",
                "--max-time", "30",
                "-s",
                "-S",
                "-w", "\nHTTP_CODE:%{http_code}\n"
            ]
            
            # 执行 curl 命令
            result = subprocess.run(
                curl_cmd,
                capture_output=True,
                text=True,
                timeout=35
            )
            
            if result.returncode != 0:
                print(f"✗ 连接测试失败: curl 返回码 {result.returncode}")
                if result.stderr:
                    print(f"错误信息: {result.stderr}")
                return False
            
            # 解析响应
            output = result.stdout.strip()
            if "HTTP_CODE:" in output:
                parts = output.rsplit("HTTP_CODE:", 1)
                response_body = parts[0].strip()
                http_code = parts[1].strip() if len(parts) > 1 else "200"
            else:
                response_body = output
                http_code = "200"
            
            if http_code != "200":
                print(f"✗ 连接测试失败: HTTP 状态码 {http_code}")
                return False
            
            # 解析 JSON
            try:
                result_json = json.loads(response_body)
                if "choices" in result_json and len(result_json["choices"]) > 0:
                    print("✓ 连接测试成功！")
                    return True
                else:
                    print("✗ 连接测试失败: 响应格式异常")
                    return False
            except json.JSONDecodeError as e:
                print(f"✗ 连接测试失败: JSON 解析错误 - {e}")
                return False
                
        except subprocess.TimeoutExpired:
            print("✗ 连接测试失败: 请求超时")
            return False
        except FileNotFoundError:
            print("✗ 连接测试失败: 未找到 curl 命令")
            return False
        except Exception as e:
            print(f"✗ 连接测试失败: {type(e).__name__}: {e}")
            return False


def main():
    """主函数：交互式聊天循环"""
    print("=" * 60)
    print("Qwen-0.6 模型聊天客户端")
    print("=" * 60)
    print("\n提示:")
    print("  - 输入消息后按回车发送")
    print("  - 输入 'quit' 或 'exit' 退出")
    print("  - 输入 'reset' 重置对话历史")
    print("  - 输入 'system <提示词>' 更改系统提示词")
    print("  - 输入 'test' 测试服务器连接")
    print("=" * 60)
    print()
    
    # 创建聊天客户端
    client = QwenChatClient()
    
    # 交互式循环
    while True:
        try:
            # 获取用户输入
            user_input = input("你: ").strip()
            
            # 检查退出命令
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("\n再见！")
                break
            
            # 检查重置命令
            if user_input.lower() == 'reset':
                client.reset_conversation()
                print("对话历史已重置\n")
                continue
            
            # 检查系统提示词更改命令
            if user_input.lower().startswith('system '):
                new_prompt = user_input[7:].strip()
                if new_prompt:
                    client.set_system_prompt(new_prompt)
                    print(f"系统提示词已更新为: {new_prompt}\n")
                else:
                    print("错误: 系统提示词不能为空\n")
                continue
            
            # 检查连接测试命令
            if user_input.lower() == 'test':
                client.test_connection()
                print()
                continue
            
            # 检查空输入
            if not user_input:
                continue
            
            # 发送消息并获取回复
            print("思考中...", end="", flush=True)
            print("user input:", user_input)
            reply = client.chat(user_input)
            print("\r" + " " * 20 + "\r", end="")  # 清除"思考中..."
            
            if reply:
                print(f"助手: {reply}\n")
            else:
                print("错误: 未能获取回复，请检查网络连接或服务器状态\n")
                
        except KeyboardInterrupt:
            print("\n\n程序被中断，再见！")
            break
        except EOFError:
            print("\n\n再见！")
            break


if __name__ == "__main__":
    main()

