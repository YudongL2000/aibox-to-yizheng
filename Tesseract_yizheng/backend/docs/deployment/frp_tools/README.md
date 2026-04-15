# FRP Configuration for HD_HUMAN_V4 WebApp

## 访问信息
- 外网访问地址: http://124.70.111.183:8080
- SSH访问: ssh -p 6000 root@124.70.111.183
- 本地地址: http://127.0.0.1:5173
- n8n 外网访问: http://124.70.111.183:5678
- n8n 本地访问: http://127.0.0.1:5678

## 配置文件位置
- FRP客户端配置: frp_tools/frpc.toml
- FRP客户端可执行文件: frp_tools/frpc

## 启动命令
```bash
# 启动FRP客户端
./frp_tools/frpc -c frp_tools/frpc.toml

# 后台运行
nohup ./frp_tools/frpc -c frp_tools/frpc.toml > frp_tools/frpc.log 2>&1 &
```

## n8n 映射配置
外网访问 n8n UI 或创建工作流链接时，建议使用下面的环境变量：
```bash
# 前端 iframe 使用外网地址
VITE_N8N_IFRAME_URL=http://124.70.111.183:5678/home/workflows

# 后端返回的 workflowUrl 使用外网地址
N8N_PUBLIC_URL=http://124.70.111.183:5678

# 后端 API 仍然可指向本地 n8n
N8N_API_URL=http://127.0.0.1:5678/api/v1
```

## 服务状态检查
```bash
# 检查FRP进程
ps aux | grep frpc

# 检查连接日志
tail -f frp_tools/frpc.log
```
