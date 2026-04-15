/**
 * [INPUT]: 依赖 Vite、React 插件与本地 Agent Backend 目标地址
 * [OUTPUT]: 对外提供 agent-ui 的开发服务器与代理配置
 * [POS]: agent-ui 模块的开发入口配置，负责把 5173 同源流量代理到后端
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_AGENT_PROXY_TARGET || env.VITE_AGENT_API_URL || 'http://127.0.0.1:3006';
  const backendWsTarget = backendTarget.replace(/^http/i, 'ws');

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/ws': {
          target: backendWsTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
