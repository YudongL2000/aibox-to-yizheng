/**
 * [INPUT]: 依赖 Electron BrowserWindow/ipcMain/app、renderer-path 与 renderer 传入的子窗口参数。
 * [OUTPUT]: 对外提供 registerWindowHandlers/terminateAilyProcess，并统一维护子窗口集合、初始化数据注入与数字孪生场景广播。
 * [POS]: electron 主进程的窗口编排层，位于 main.js 与 renderer 之间，是“开窗”和“跨窗口消息分发”的唯一出口。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const { ipcMain, BrowserWindow, app } = require("electron");
const { exec, execSync } = require('child_process');
const path = require('path');
const { buildDevServerUrl, resolveRendererIndexPath } = require("./renderer-path");

function terminateAilyProcess() {
    const platform = process.platform;
    let checkCommand;
    let killCommand;
    const processName = platform === 'win32' ? 'aily blockly.exe' : 'aily blockly';

    if (platform === 'win32') {
        checkCommand = `tasklist /FI "IMAGENAME eq ${processName}" /FO CSV`;
        killCommand = `taskkill /F /IM "${processName}"`;
    } else {
        checkCommand = `pgrep -f "${processName}"`;
        killCommand = `pkill -f "${processName}"`;
    }

    try {
        let count = 0;
        try {
            const stdout = execSync(checkCommand, { encoding: 'utf8' });
            if (platform === 'win32') {
                const matches = stdout.match(new RegExp(processName.replace('.', '\\.'), 'gi'));
                count = matches ? matches.length : 0;
            } else {
                count = stdout.trim().split('\n').length;
            }
        } catch (e) {
            if (platform !== 'win32' && e.status === 1) {
                count = 0;
            } else {
                console.warn('Error checking process count:', e.message);
            }
        }

        console.log(`Current aily-blockly process count: ${count}`);

        if (count > 1) {
            console.log('Multiple instances detected. Skipping forced termination.');
            return;
        }

        exec(killCommand, (error, stdout, stderr) => {
            if (error) {
                const notFound =
                    (platform === 'win32' && stderr && stderr.includes('not found')) ||
                    (platform !== 'win32' && error.code === 1);
                if (notFound) {
                    console.log('No aily-blockly process found to terminate.');
                    return;
                }
                console.error(`Error killing aily-blockly process: ${error.message}`);
                return;
            }
            if (stdout) {
                console.log(`aily-blockly process terminated: ${stdout}`);
            }
        });
    } catch (commandError) {
        console.warn('Error attempting to kill aily-blockly process:', commandError.message);
    }
}

function registerWindowHandlers(mainWindow) {
    // 添加一个映射来存储已打开的窗口
    const openWindows = new Map();
    let latestDigitalTwinEnvelope = null;
    let digitalTwinSceneRevision = 0;
    let latestDigitalTwinPreviewStateEnvelope = null;
    let digitalTwinPreviewStateRevision = 0;

    function summarizeDigitalTwinScene(scene) {
        const models = Array.isArray(scene?.models) ? scene.models : [];
        return {
            baseModelId: scene?.base_model_id || scene?.baseModelId || null,
            modelCount: models.length,
            modelIds: models
                .map((item) => item?.id)
                .filter(Boolean)
                .slice(0, 8),
        };
    }

    function buildDigitalTwinEnvelope(payload = {}) {
      digitalTwinSceneRevision += 1;
      const scene = Object.prototype.hasOwnProperty.call(payload, 'scene')
          ? payload.scene
          : null;
        return {
            revision: digitalTwinSceneRevision,
            updatedAt: new Date().toISOString(),
            sessionId: payload.sessionId || null,
            projectPath: payload.projectPath || null,
            sourcePhase: payload.sourcePhase || 'configuring',
            responseType: payload.responseType || null,
            summary: summarizeDigitalTwinScene(scene),
            scene,
            previewState: Object.prototype.hasOwnProperty.call(payload, 'previewState')
                ? payload.previewState
                : null,
            previewSession: Object.prototype.hasOwnProperty.call(payload, 'previewSession')
                ? payload.previewSession
                : null,
            controlState: Object.prototype.hasOwnProperty.call(payload, 'controlState')
                ? payload.controlState
                : null,
        };
    }

    function summarizeDigitalTwinPreviewState(previewState) {
        const controls = previewState?.controls && typeof previewState.controls === 'object'
            ? previewState.controls
            : {};
        const session = previewState?.session && typeof previewState.session === 'object'
            ? previewState.session
            : null;
        return {
            sessionId: previewState?.sessionId || session?.sessionId || null,
            controlKeys: Object.keys(controls).slice(0, 8),
            modelId: previewState?.modelId || previewState?.targetModelId || null,
            state: previewState?.state || previewState?.status || null,
            hasPreview: Boolean(previewState?.preview || previewState?.session || previewState?.controls),
        };
    }

    function buildDigitalTwinPreviewStateEnvelope(payload = {}) {
        digitalTwinPreviewStateRevision += 1;
        const previewState = Object.prototype.hasOwnProperty.call(payload, 'previewState')
            ? payload.previewState
            : payload;
        return {
            revision: digitalTwinPreviewStateRevision,
            updatedAt: new Date().toISOString(),
            sessionId: payload.sessionId || previewState?.sessionId || null,
            projectPath: payload.projectPath || null,
            sourcePhase: payload.sourcePhase || 'previewing',
            responseType: payload.responseType || payload.type || null,
            summary: summarizeDigitalTwinPreviewState(previewState),
            previewState,
            scene: Object.prototype.hasOwnProperty.call(payload, 'scene') ? payload.scene : null,
            session: Object.prototype.hasOwnProperty.call(payload, 'session') ? payload.session : null,
            control: Object.prototype.hasOwnProperty.call(payload, 'control') ? payload.control : null,
        };
    }

    function resolveOpenWindow(entry) {
        if (!entry) {
            return null;
        }
        return entry.window || entry;
    }

    function forEachOpenWindow(callback) {
        openWindows.forEach((entry, key) => {
            callback(resolveOpenWindow(entry), key, entry);
        });
    }

    function broadcastDigitalTwinScene(envelope) {
        const targets = [];
        forEachOpenWindow((subWindow, windowUrl, entry) => {
            try {
                if (subWindow && !subWindow.isDestroyed() && subWindow.webContents && !subWindow.webContents.isDestroyed()) {
                    targets.push({
                        path: windowUrl,
                        role: entry?.windowRole || '',
                    });
                    subWindow.webContents.send('digital-twin-scene-updated', envelope);
                }
            } catch (error) {
                console.error('Error broadcasting digital twin scene:', error.message);
            }
        });
        console.info('[DigitalTwin][WindowBridge] broadcast scene envelope', {
            revision: envelope?.revision || 0,
            summary: envelope?.summary || null,
            targetCount: targets.length,
            targets,
        });
    }

    function broadcastDigitalTwinPreviewState(envelope) {
        const targets = [];
        forEachOpenWindow((subWindow, windowUrl, entry) => {
            try {
                if (subWindow && !subWindow.isDestroyed() && subWindow.webContents && !subWindow.webContents.isDestroyed()) {
                    targets.push({
                        path: windowUrl,
                        role: entry?.windowRole || '',
                    });
                    subWindow.webContents.send('digital-twin-preview-state-updated', envelope);
                }
            } catch (error) {
                console.error('Error broadcasting digital twin preview state:', error.message);
            }
        });
        console.info('[DigitalTwin][WindowBridge] broadcast preview-state envelope', {
            revision: envelope?.revision || 0,
            summary: envelope?.summary || null,
            targetCount: targets.length,
            targets,
        });
    }

    mainWindow.on('focus', () => {
        try {
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
                mainWindow.webContents.send('window-focus');
            }

            forEachOpenWindow((subWindow, _windowUrl, entry) => {
                try {
                    if (!entry?.keepAboveMain) {
                        return;
                    }
                    if (subWindow && !subWindow.isDestroyed() && typeof subWindow.moveTop === 'function') {
                        subWindow.moveTop();
                    }
                } catch (error) {
                    console.error('Error lifting keepAboveMain window:', error.message);
                }
            });

        } catch (error) {
            console.error('Error sending window-focus:', error.message);
        }
    });

    mainWindow.on('blur', () => {
        // 检查窗口是否已销毁以及 webContents 是否有效
        try {
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
                mainWindow.webContents.send('window-blur');
            }

        } catch (error) {
            console.error('Error sending window-blur:', error.message);
        }
    });

    mainWindow.on('enter-full-screen', () => {
        try {
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
                mainWindow.webContents.send('window-full-screen-changed', true);
            }
        } catch (error) {
            console.error('Error sending window-full-screen-changed:', error.message);
        }
    });

    mainWindow.on('leave-full-screen', () => {
        try {
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
                mainWindow.webContents.send('window-full-screen-changed', false);
            }
        } catch (error) {
            console.error('Error sending window-full-screen-changed:', error.message);
        }
    });

    // 为主窗口注册最大化/还原状态监听
    mainWindow.on('maximize', () => {
        try {
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
                mainWindow.webContents.send('window-maximize-changed', true);
            }
        } catch (error) {
            console.error('Error sending window-maximize-changed:', error.message);
        }
    });

    mainWindow.on('unmaximize', () => {
        try {
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
                mainWindow.webContents.send('window-maximize-changed', false);
            }
        } catch (error) {
            console.error('Error sending window-maximize-changed:', error.message);
        }
    });


    ipcMain.on("window-open", (event, data) => {
        const windowUrl = data.path;

        // 检查是否已存在该URL的窗口
        if (openWindows.has(windowUrl)) {
            const existingWindow = resolveOpenWindow(openWindows.get(windowUrl));
            // 确保窗口仍然有效
            if (existingWindow && !existingWindow.isDestroyed()) {
                // 激活已存在的窗口
                existingWindow.show();
                if (typeof existingWindow.moveTop === 'function') {
                    existingWindow.moveTop();
                }
                existingWindow.focus();
                return;
            } else {
                // 如果窗口已被销毁，从映射中移除
                openWindows.delete(windowUrl);
            }
        }

        const keepAboveMain = data.keepAboveMain === true && data.windowRole !== 'digital-twin';
        const parentWindow = data.windowRole === 'digital-twin' || keepAboveMain ? mainWindow : undefined;

        // 创建新窗口
        const subWindow = new BrowserWindow({
            parent: parentWindow,
            frame: false,
            show: false,
            autoHideMenuBar: true,
            transparent: true,
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
            alwaysOnTop: data.alwaysOnTop ? data.alwaysOnTop : false,
            width: data.width ? data.width : 800,
            height: data.height ? data.height : 600,
            webPreferences: {
                nodeIntegration: true,
                webSecurity: false,
                webviewTag: true,
                preload: path.join(__dirname, "preload.js"),
            },
        });

        // 将新窗口添加到映射
        openWindows.set(windowUrl, {
            window: subWindow,
            keepAboveMain,
            windowRole: data.windowRole || '',
        });

        subWindow.once('ready-to-show', () => {
            try {
                subWindow.show();
                if (keepAboveMain && typeof subWindow.moveTop === 'function') {
                    subWindow.moveTop();
                }
                subWindow.focus();
            } catch (error) {
                console.error('Error showing sub window:', error.message);
            }
        });

        // 为子窗口注册全屏状态监听
        subWindow.on('enter-full-screen', () => {
            try {
                if (subWindow && subWindow.webContents) {
                    subWindow.webContents.send('window-full-screen-changed', true);
                }
            } catch (error) {
                console.error('Error sending sub-window-full-screen-changed:', error.message);
            }
        });

        subWindow.on('leave-full-screen', () => {
            try {
                if (subWindow && subWindow.webContents) {
                    subWindow.webContents.send('window-full-screen-changed', false);
                }
            } catch (error) {
                console.error('Error sending sub-window-full-screen-changed:', error.message);
            }
        });

        // 为子窗口注册最大化/还原状态监听
        subWindow.on('maximize', () => {
            try {
                if (subWindow && subWindow.webContents) {
                    subWindow.webContents.send('window-maximize-changed', true);
                }
            } catch (error) {
                console.error('Error sending window-maximize-changed:', error.message);
            }
        });

        subWindow.on('unmaximize', () => {
            try {
                if (subWindow && subWindow.webContents) {
                    subWindow.webContents.send('window-maximize-changed', false);
                }
            } catch (error) {
                console.error('Error sending window-maximize-changed:', error.message);
            }
        });

        // 当窗口关闭时，从映射中移除
        subWindow.on('closed', () => {
            openWindows.delete(windowUrl);
        });

        // 页面加载完成后，将 data/url/title 发送给子窗口
        if (data.data || data.url || data.title || data.windowRole === 'digital-twin') {
            subWindow.webContents.on('did-finish-load', () => {
                subWindow.webContents.send('window-init-data', {
                    url: data.url,
                    title: data.title,
                    data: data.data,
                });
                if (data.windowRole === 'digital-twin' && latestDigitalTwinEnvelope) {
                    console.info('[DigitalTwin][WindowBridge] seed scene envelope to freshly loaded child', {
                        revision: latestDigitalTwinEnvelope?.revision || 0,
                        path: windowUrl,
                        summary: latestDigitalTwinEnvelope?.summary || null,
                    });
                    subWindow.webContents.send('digital-twin-scene-updated', latestDigitalTwinEnvelope);
                }
                if (data.windowRole === 'digital-twin' && latestDigitalTwinPreviewStateEnvelope) {
                    console.info('[DigitalTwin][WindowBridge] seed preview-state envelope to freshly loaded child', {
                        revision: latestDigitalTwinPreviewStateEnvelope?.revision || 0,
                        path: windowUrl,
                        summary: latestDigitalTwinPreviewStateEnvelope?.summary || null,
                    });
                    subWindow.webContents.send('digital-twin-preview-state-updated', latestDigitalTwinPreviewStateEnvelope);
                }
            });
        }

        if (process.env.DEV === 'true' || process.env.DEV === true) {
            subWindow.loadURL(buildDevServerUrl(`#/${data.path}`));
            // subWindow.webContents.openDevTools();
        } else {
            subWindow.loadFile(resolveRendererIndexPath(__dirname), { hash: `#/${data.path}` });
            // subWindow.webContents.openDevTools();
        }
    });

    ipcMain.handle("digital-twin-scene-set-current", async (_event, payload = {}) => {
        latestDigitalTwinEnvelope = buildDigitalTwinEnvelope(payload);
        console.info('[DigitalTwin][WindowBridge] set current scene envelope', latestDigitalTwinEnvelope);
        broadcastDigitalTwinScene(latestDigitalTwinEnvelope);
        if (!latestDigitalTwinEnvelope?.summary?.modelCount) {
            console.warn('[DigitalTwin][WindowBridge] current envelope resolved to base-only scene', latestDigitalTwinEnvelope);
        }
        return {
            success: true,
            hasScene: latestDigitalTwinEnvelope?.scene !== null,
            revision: latestDigitalTwinEnvelope?.revision || 0,
        };
    });

    ipcMain.handle("digital-twin-scene-get-current", async () => {
        console.info('[DigitalTwin][WindowBridge] get current scene envelope', latestDigitalTwinEnvelope);
        return latestDigitalTwinEnvelope;
    });

    ipcMain.handle("digital-twin-preview-state-set-current", async (_event, payload = {}) => {
        latestDigitalTwinPreviewStateEnvelope = buildDigitalTwinPreviewStateEnvelope(payload);
        console.info('[DigitalTwin][WindowBridge] set current preview-state envelope', latestDigitalTwinPreviewStateEnvelope);
        broadcastDigitalTwinPreviewState(latestDigitalTwinPreviewStateEnvelope);
        return {
            success: true,
            revision: latestDigitalTwinPreviewStateEnvelope?.revision || 0,
        };
    });

    ipcMain.handle("digital-twin-preview-state-get-current", async () => {
        console.info('[DigitalTwin][WindowBridge] get current preview-state envelope', latestDigitalTwinPreviewStateEnvelope);
        return latestDigitalTwinPreviewStateEnvelope;
    });

    ipcMain.on("window-minimize", (event) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (senderWindow) {
            senderWindow.minimize();
        }
    });

    ipcMain.on("window-maximize", (event) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (senderWindow && !senderWindow.isMaximized()) {
            senderWindow.maximize();
        }
    });

    ipcMain.on("window-close", (event) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        // 检查是否是主窗口，如果是主窗口，关闭整个应用程序
        if (senderWindow === mainWindow) {
            app.quit();
            // Attempt to terminate any residual helper processes on exit.
            terminateAilyProcess();
        } else {
            senderWindow.close();
        }
    });

    // Mac 平台下处理系统关闭按钮的关闭检查
    if (process.platform === 'darwin') {
        mainWindow.on('close', (event) => {
            event.preventDefault();
            mainWindow.webContents.send('window-close-request');
        });

        // 监听渲染进程返回的关闭确认结果
        ipcMain.on('window-close-confirmed', (event) => {
            const senderWindow = BrowserWindow.fromWebContents(event.sender);
            if (senderWindow === mainWindow) {
                mainWindow.removeAllListeners('close');
                mainWindow.close();
                app.quit();
                terminateAilyProcess();
            }
        });
    }

    // 修改为同步处理程序
    ipcMain.on("window-is-maximized", (event) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        const isMaximized = senderWindow ? senderWindow.isMaximized() : false;
        event.returnValue = isMaximized;
    });

    // 添加 unmaximize 处理程序
    ipcMain.on("window-unmaximize", (event) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (senderWindow && senderWindow.isMaximized()) {
            senderWindow.unmaximize();
        }
    });

    // 监听获取全屏状态的请求
    ipcMain.handle('window-is-full-screen', (event) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        return senderWindow.isFullScreen();
    });

    // 检查窗口是否获得焦点（同步）
    ipcMain.on("window-is-focused", (event) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        const isFocused = senderWindow ? senderWindow.isFocused() : false;
        event.returnValue = isFocused;
    });

    ipcMain.on("window-go-main", (event, data) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        mainWindow.webContents.send("window-go-main", data.replace('/', ''));
        senderWindow.close();
    });

    ipcMain.on("window-alwaysOnTop", (event, alwaysOnTop) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        senderWindow.setAlwaysOnTop(alwaysOnTop);
    });

    ipcMain.handle("window-send", (event, data) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (data.to == 'main') {
            // 创建唯一消息ID
            const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            // 创建Promise等待响应
            return new Promise((resolve) => {
                // 设置一次性监听器接收响应
                const responseListener = (event, response) => {
                    if (response.messageId === messageId) {
                        // 收到对应ID的响应，移除监听器并返回结果
                        ipcMain.removeListener('main-window-response', responseListener);
                        // console.log('window-send response', response);
                        resolve(response.data || "success");
                    }
                };
                // 注册监听器
                ipcMain.on('main-window-response', responseListener);
                // 发送消息到main窗口，带上messageId
                mainWindow.webContents.send("window-receive", {
                    form: senderWindow.id,
                    data: data.data,
                    messageId: messageId
                });
                // 自定义超时或默认9秒超时
                setTimeout(() => {
                    ipcMain.removeListener('main-window-response', responseListener);
                    resolve("timeout");
                }, data?.timeout || 9000);
            });
        }
        return true;
    });

    // 用于sub窗口改变main窗口状态显示
    ipcMain.on('state-update', (event, data) => {
        console.log('state-update: ', data);
        mainWindow.webContents.send('state-update', data);
    });

    // 连线图数据更新通知 - 从主窗口转发给所有子窗口
    ipcMain.on('connection-graph-updated', (event, payload) => {
        console.log('[IPC] connection-graph-updated, 转发给', openWindows.size, '个子窗口');
        forEachOpenWindow((subWindow, windowUrl) => {
            try {
                if (subWindow && !subWindow.isDestroyed() && subWindow.webContents && !subWindow.webContents.isDestroyed()) {
                    subWindow.webContents.send('connection-graph-updated', payload);
                }
            } catch (error) {
                console.error('[IPC] 转发 connection-graph-updated 失败:', error.message);
            }
        });
    });

    // 子窗口请求主窗口保存连线图数据
    ipcMain.on('save-connection-graph', (event, data) => {
        console.log('[IPC] save-connection-graph, 转发给主窗口');
        mainWindow.webContents.send('save-connection-graph', data);
    });

    // =====================================================
    // 连线图自动生成 - IPC 中继
    // =====================================================

    // 主窗口 → 子窗口：生成进度事件广播
    ipcMain.on('schematic-generation-progress', (event, data) => {
        forEachOpenWindow((subWindow, windowUrl) => {
            try {
                if (subWindow && !subWindow.isDestroyed() && subWindow.webContents && !subWindow.webContents.isDestroyed()) {
                    subWindow.webContents.send('schematic-generation-progress', data);
                }
            } catch (error) {
                console.error('[IPC] 转发 schematic-generation-progress 失败:', error.message);
            }
        });
    });

    // 子窗口 → 主窗口：重新生成请求
    ipcMain.on('schematic-regenerate-request', (event) => {
        console.log('[IPC] schematic-regenerate-request, 转发给主窗口');
        mainWindow.webContents.send('schematic-regenerate-request');
    });

    // 子窗口 → 主窗口：同步到代码请求
    ipcMain.on('schematic-sync-to-code-request', (event) => {
        console.log('[IPC] schematic-sync-to-code-request, 转发给主窗口');
        mainWindow.webContents.send('schematic-sync-to-code-request');
    });
}


module.exports = {
    registerWindowHandlers,
};
