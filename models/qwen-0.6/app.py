#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Qwen-0.6 模型 Web 聊天应用
Flask 后端服务器
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from qwen_inference import QwenChatClient
import threading

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 为每个会话创建独立的聊天客户端
# 使用字典存储不同会话的客户端（可以通过 session_id 区分）
clients = {}
clients_lock = threading.Lock()


def get_client(session_id: str = "default") -> QwenChatClient:
    """
    获取或创建指定会话的聊天客户端
    
    Args:
        session_id: 会话 ID
        
    Returns:
        QwenChatClient 实例
    """
    with clients_lock:
        if session_id not in clients:
            clients[session_id] = QwenChatClient()
        return clients[session_id]


@app.route('/')
def index():
    """主页"""
    return render_template('index.html')


@app.route('/api/chat', methods=['POST'])
def chat():
    """
    聊天 API 端点
    
    请求体:
        {
            "message": "用户消息",
            "session_id": "会话ID（可选，默认为default）"
        }
    
    返回:
        {
            "success": true/false,
            "reply": "助手回复",
            "error": "错误信息（如果有）"
        }
    """
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        session_id = data.get('session_id', 'default')
        
        if not message:
            return jsonify({
                "success": False,
                "error": "消息不能为空"
            }), 400
        
        # 获取客户端并发送消息
        client = get_client(session_id)
        reply = client.chat(message)
        
        if reply:
            return jsonify({
                "success": True,
                "reply": reply
            })
        else:
            return jsonify({
                "success": False,
                "error": "未能获取回复，请检查网络连接或服务器状态"
            }), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"服务器错误: {str(e)}"
        }), 500


@app.route('/api/reset', methods=['POST'])
def reset():
    """
    重置对话历史 API 端点
    
    请求体:
        {
            "session_id": "会话ID（可选，默认为default）"
        }
    """
    try:
        # 尝试获取 JSON 数据，如果没有则使用空字典
        try:
            data = request.get_json() or {}
        except Exception:
            data = {}
        
        session_id = data.get('session_id', 'default')
        
        client = get_client(session_id)
        client.reset_conversation()
        
        return jsonify({
            "success": True,
            "message": "对话历史已重置"
        })
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"重置对话错误: {error_detail}")
        return jsonify({
            "success": False,
            "error": f"服务器错误: {str(e)}"
        }), 500


@app.route('/api/system_prompt', methods=['GET', 'POST'])
def system_prompt():
    """
    获取或设置系统提示词 API 端点
    
    GET: 获取当前系统提示词
    POST: 设置新的系统提示词
    
    请求体（POST）:
        {
            "prompt": "新的系统提示词",
            "session_id": "会话ID（可选，默认为default）"
        }
    """
    try:
        # GET 请求：获取当前系统提示词
        if request.method == 'GET':
            # GET 请求从查询参数获取 session_id（如果有）
            session_id = request.args.get('session_id', 'default')
            client = get_client(session_id)
            # 获取当前系统提示词
            return jsonify({
                "success": True,
                "prompt": client.system_prompt or ""
            })
        else:
            # POST 请求：设置新的系统提示词
            try:
                data = request.get_json() or {}
            except Exception:
                data = {}
            
            session_id = data.get('session_id', 'default')
            client = get_client(session_id)
            
            new_prompt = data.get('prompt', '').strip()
            if not new_prompt:
                return jsonify({
                    "success": False,
                    "error": "系统提示词不能为空"
                }), 400
            
            client.set_system_prompt(new_prompt)
            return jsonify({
                "success": True,
                "message": "系统提示词已更新",
                "prompt": new_prompt
            })
            
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"系统提示词操作错误: {error_detail}")
        return jsonify({
            "success": False,
            "error": f"服务器错误: {str(e)}"
        }), 500


@app.route('/api/test', methods=['POST'])
def test_connection():
    """
    测试服务器连接 API 端点
    """
    try:
        # 创建一个临时客户端进行测试
        test_client = QwenChatClient()
        success = test_client.test_connection()
        
        return jsonify({
            "success": success,
            "message": "连接测试成功" if success else "连接测试失败"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"测试失败: {str(e)}"
        }), 500


if __name__ == '__main__':
    print("=" * 60)
    print("Qwen-0.6 Web 聊天应用")
    print("=" * 60)
    print("访问 http://localhost:8080 使用 Web 界面")
    print("按 Ctrl+C 停止服务器")
    print("=" * 60)
    # 禁用 use_reloader 以避免 watchdog 版本兼容性问题
    app.run(debug=True, host='0.0.0.0', port=8080, use_reloader=False)

