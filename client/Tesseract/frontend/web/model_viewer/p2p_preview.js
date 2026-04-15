/*
 * [INPUT]: 依赖 ZLMRTCClient.js 提供的 WebRTC p2p 播放能力，以及父窗口 postMessage 传入的 session/stream 状态。
 * [OUTPUT]: 对外提供 camera p2p preview 静态桥，负责 streamUrl 配置、显式 connect/disconnect、连接状态回传、停止/重连与错误诊断。
 * [POS]: web/model_viewer 的 camera 预览桥，被 Flutter 左侧 preview pane 以 iframe 方式嵌入。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const PREVIEW_SOURCE = 'digital-twin-camera-preview';
const PREVIEW_CHANNEL = new URL(window.location.href).searchParams.get('channel') || 'camera-preview';
const video = document.getElementById('video');
const statusEl = document.getElementById('status');
const streamEl = document.getElementById('stream-url');
let player = null;
let currentSessionId = new URL(window.location.href).searchParams.get('sessionId') || PREVIEW_CHANNEL;

function normalizeMessage(raw) {
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return normalizeMessage(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw;
  }
  return null;
}

function setStatus(message) {
  statusEl.textContent = message;
}

function postStatus(type, message, extra = {}) {
  if (!window.parent || window.parent === window) return;
  window.parent.postMessage(
    JSON.stringify({
      source: PREVIEW_SOURCE,
      channel: PREVIEW_CHANNEL,
      sessionId: currentSessionId,
      type,
      message,
      ...extra,
    }),
    '*'
  );
}

function stopPreview(message = '已停止', { notify = true } = {}) {
  if (player) {
    try {
      player.close();
    } catch (error) {
      console.warn('preview close failed', error);
    }
    player = null;
  }
  video.srcObject = null;
  video.removeAttribute('src');
  video.load();
  setStatus(message);
  if (notify) {
    postStatus('preview-state', message, { state: 'stopped' });
  }
}

function startPreview(config) {
  const streamUrl = (config.streamUrl || '').trim();
  currentSessionId = config.sessionId || currentSessionId;
  streamEl.textContent = streamUrl || '等待 streamUrl';
  stopPreview('准备连接', { notify: false });

  if (!streamUrl) {
    setStatus('等待 streamUrl');
    postStatus('preview-error', 'streamUrl 为空');
    return;
  }

  if (!window.ZLMRTCClient) {
    const message = '未找到 ZLMRTCClient.js';
    setStatus(message);
    postStatus('preview-error', message);
    return;
  }

  setStatus('正在连接 P2P 预览');
  postStatus('preview-state', '正在连接 P2P 预览', { state: 'connecting' });

  try {
    player = new ZLMRTCClient.Endpoint({
      element: video,
      debug: false,
      zlmsdpUrl: streamUrl,
      simulcast: false,
      useCamera: false,
      audioEnable: config.audioEnable !== false,
      videoEnable: config.videoEnable !== false,
      recvOnly: config.recvOnly !== false,
    });

    player.on(ZLMRTCClient.Events.WEBRTC_ON_REMOTE_STREAMS, () => {
      setStatus('P2P 预览已连接');
      postStatus('preview-ready', 'P2P 预览已连接', { state: 'connected' });
    });

    player.on(ZLMRTCClient.Events.WEBRTC_OFFER_ANWSER_EXCHANGE_FAILED, (event) => {
      const message = `信令交换失败: ${JSON.stringify(event)}`;
      setStatus(message);
      postStatus('preview-error', message);
    });

    player.on(ZLMRTCClient.Events.WEBRTC_ICE_CANDIDATE_ERROR, () => {
      const message = 'ICE 连接失败';
      setStatus(message);
      postStatus('preview-error', message);
    });

    player.on(ZLMRTCClient.Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, (state) => {
      const message = `连接状态: ${state}`;
      setStatus(message);
      postStatus('preview-state', message, { state });
    });
  } catch (error) {
    const message = `启动异常: ${error?.message || error}`;
    setStatus(message);
    postStatus('preview-error', message);
  }
}

function handleConfigure(raw) {
  const config = normalizeMessage(raw);
  if (!config) return;
  currentSessionId = config.sessionId || currentSessionId;
  if (typeof config.streamUrl === 'string') {
    streamEl.textContent = config.streamUrl || '等待 streamUrl';
  }
  if (config.command === 'connect') {
    startPreview(config);
    return;
  }
  if (typeof config.command === 'string') {
    if (config.command === 'stop') {
      stopPreview('已停止');
      return;
    }
  }
  postStatus('preview-state', '配置已接收', { state: 'configured' });
}

window.addEventListener('message', (event) => {
  const data = normalizeMessage(event.data);
  if (!data || data.source !== 'flutter-digital-twin-preview') return;
  if (data.sessionId && data.sessionId !== currentSessionId) return;
  if (data.type === 'configure') {
    handleConfigure(data);
  } else if (data.type === 'stop') {
    stopPreview('已停止');
  } else if (data.type === 'refresh') {
    startPreview({
      sessionId: currentSessionId,
      streamUrl: streamEl.textContent,
      audioEnable: true,
      videoEnable: true,
      recvOnly: true,
    });
  }
});

const initialStreamUrl = new URL(window.location.href).searchParams.get('streamUrl') || '';
streamEl.textContent = initialStreamUrl || '等待 streamUrl';
setStatus(initialStreamUrl ? '点击连接开始预览' : '等待 streamUrl');
postStatus('preview-state', initialStreamUrl ? '点击连接开始预览' : '等待 streamUrl', {
  state: 'idle',
});
