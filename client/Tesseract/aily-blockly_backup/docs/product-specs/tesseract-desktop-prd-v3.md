# Tesseract → aily-blockly 精准整合方案

**文档版本:** v3.0
**创建日期:** 2026-03-03
**目标:** 将 Tesseract 框架精准嵌入 aily-blockly，实现硬件版 Cursor

---

## 执行概要

基于用户明确的 4 点核心思路，本方案将 Tesseract 的 n8n Agent 能力无缝整合到 aily-blockly 桌面应用中，同时保留并增强现有的硬件开发生态。

### 核心思路

1. **Tesseract 框架嵌入：** 将 backend Agent 系统嵌入 aily-blockly Electron 主进程
2. **工作区替换：** 用 n8n 工作流实例替换 Blockly 可视化编程工作区
3. **侧边栏重构：** 移除引脚图/电路连接，添加 3D 模型查看器
4. **AI 对话适配：** 复用 aily-chat UI 组件，适配 Tesseract Agent 输出格式

---

## 架构变更对比

### 改造前：aily-blockly 原始架构

```
┌─────────────────────────────────────────┐
│         aily-blockly Desktop            │
├─────────────────────────────────────────┤
│  主工作区                                │
│  ┌───────────────────────────────────┐  │
│  │   Blockly 可视化编程工作区         │  │
│  │   - 拖拽块编程                     │  │
│  │   - 代码生成                       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  侧边栏                                  │
│  ┌───────────────────────────────────┐  │
│  │   - 引脚图查看器                   │  │
│  │   - 电路连接工具                   │  │
│  │   - 组件库                         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  底部工具栏                              │
│  ┌───────────────────────────────────┐  │
│  │   - 编译                           │  │
│  │   - 烧录                           │  │
│  │   - 串口监视器                     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 改造后：Tesseract 整合架构

```
┌─────────────────────────────────────────┐
│    aily-blockly + Tesseract Desktop     │
├─────────────────────────────────────────┤
│  主工作区                                │
│  ┌───────────────────────────────────┐  │
│  │   n8n 工作流编辑器 (iframe)        │  │
│  │   - 节点拖拽                       │  │
│  │   - 工作流连线                     │  │
│  │   - 实时预览                       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  侧边栏（重构）                          │
│  ┌───────────────────────────────────┐  │
│  │   - 3D 模型查看器 ⭐ NEW           │  │
│  │   - 硬件组件库                     │  │
│  │   - 工作流模板                     │  │
│  └───────────────────────────────────┘  │
│                                         │
│  AI 对话面板（增强）                     │
│  ┌───────────────────────────────────┐  │
│  │   aily-chat + Tesseract Agent      │  │
│  │   - 工作流蓝图卡片 ⭐ NEW          │  │
│  │   - 组件推荐卡片 ⭐ NEW            │  │
│  │   - 下一步按钮 ⭐ NEW              │  │
│  │   - 配置引导面板 ⭐ NEW            │  │
│  └───────────────────────────────────┘  │
│                                         │
│  底部工具栏（保留）                      │
│  ┌───────────────────────────────────┐  │
│  │   - 部署工作流                     │  │
│  │   - 硬件下发                       │  │
│  │   - 串口监视器                     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

Electron 主进程（后台服务）
┌─────────────────────────────────────────┐
│  Tesseract Agent 服务 ⭐ NEW             │
│  ├─ IntakeAgent (意图解析)               │
│  ├─ ComponentSelector (组件选择)         │
│  ├─ WorkflowArchitect (工作流生成)       │
│  └─ ConfigAgent (配置引导)               │
│                                         │
│  n8n 实例 ⭐ NEW                         │
│  ├─ n8n 服务器 (child_process)          │
│  └─ API 接口                            │
│                                         │
│  MCP 服务器（增强）                      │
│  ├─ 原有 MCP 工具                       │
│  └─ Tesseract MCP 工具 ⭐ NEW           │
└─────────────────────────────────────────┘
```

---

## 核心改造点详解

### 改造点 1：Tesseract Agent 框架嵌入

#### 目标
将 Tesseract backend 的核心 Agent 逻辑嵌入到 aily-blockly 的 Electron 主进程中。

#### 实施方案

**步骤 1.1：提取 Tesseract Agent 核心模块**

源文件：
```
backend/src/agents/
├── intake-agent.ts          # 意图解析
├── component-selector.ts    # 组件选择
├── workflow-architect.ts    # 工作流生成
└── config-agent.ts          # 配置引导
```

目标位置：
```
aily-blockly/electron/services/tesseract/
├── intake-agent.ts
├── component-selector.ts
├── workflow-architect.ts
└── config-agent.ts
```

**步骤 1.2：创建 Agent 服务管理器**

文件：`aily-blockly/electron/services/tesseract/agent-manager.ts`

```typescript
import { IntakeAgent } from './intake-agent';
import { ComponentSelector } from './component-selector';
import { WorkflowArchitect } from './workflow-architect';
import { ConfigAgent } from './config-agent';

export class TesseractAgentManager {
  private intakeAgent: IntakeAgent;
  private componentSelector: ComponentSelector;
  private workflowArchitect: WorkflowArchitect;
  private configAgent: ConfigAgent;

  constructor() {
    this.intakeAgent = new IntakeAgent();
    this.componentSelector = new ComponentSelector();
    this.workflowArchitect = new WorkflowArchitect();
    this.configAgent = new ConfigAgent();
  }

  async processUserRequest(userInput: string, context: any) {
    // 1. 意图解析
    const intent = await this.intakeAgent.parse(userInput, context);

    // 2. 组件选择
    const components = await this.componentSelector.select(intent);

    // 3. 工作流生成
    const workflow = await this.workflowArchitect.generate(components);

    return {
      intent,
      components,
      workflow
    };
  }

  async guideConfiguration(workflowId: string) {
    return await this.configAgent.guide(workflowId);
  }
}
```

**步骤 1.3：创建 IPC 通信接口**

文件：`aily-blockly/electron/ipc/tesseract-handlers.ts`

```typescript
import { ipcMain } from 'electron';
import { TesseractAgentManager } from '../services/tesseract/agent-manager';

const agentManager = new TesseractAgentManager();

export function registerTesseractHandlers() {
  // 处理用户需求
  ipcMain.handle('tesseract:process-request', async (event, userInput, context) => {
    return await agentManager.processUserRequest(userInput, context);
  });

  // 配置引导
  ipcMain.handle('tesseract:guide-config', async (event, workflowId) => {
    return await agentManager.guideConfiguration(workflowId);
  });

  // 获取工作流状态
  ipcMain.handle('tesseract:get-workflow-status', async (event, workflowId) => {
    // 实现逻辑
  });
}
```

#### 验收标准
- [ ] Agent 服务在 Electron 主进程中成功启动
- [ ] 前端可通过 IPC 调用 Agent 功能
- [ ] Agent 响应时间 < 3 秒
- [ ] 单元测试覆盖率 > 70%

---

### 改造点 2：n8n 工作流实例替换 Blockly 工作区

#### 目标
将 `blockly-editor` 组件替换为 `n8n-workflow-editor` 组件，嵌入 n8n 工作流编辑器。

#### 实施方案

**步骤 2.1：在 Electron 中启动 n8n 实例**

文件：`aily-blockly/electron/services/n8n-instance.ts`

```typescript
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

export class N8nInstance {
  private process: ChildProcess | null = null;
  private port: number = 5678;
  private apiUrl: string;

  constructor(port: number = 5678) {
    this.port = port;
    this.apiUrl = `http://localhost:${port}`;
  }

  async start() {
    // 启动 n8n 进程
    this.process = spawn('npx', ['n8n', 'start'], {
      env: {
        ...process.env,
        N8N_PORT: this.port.toString(),
        N8N_PROTOCOL: 'http',
        N8N_HOST: 'localhost',
        N8N_DISABLE_UI: 'false'
      }
    });

    this.process.stdout?.on('data', (data) => {
      console.log(`n8n: ${data}`);
    });

    this.process.stderr?.on('data', (data) => {
      console.error(`n8n error: ${data}`);
    });

    // 等待 n8n 启动
    await this.waitForReady();
  }

  async stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  private async waitForReady() {
    // 轮询检查 n8n 是否就绪
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${this.apiUrl}/healthz`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // 继续等待
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('n8n failed to start');
  }

  getApiUrl() {
    return this.apiUrl;
  }

  getEditorUrl() {
    return `${this.apiUrl}/workflow`;
  }
}
```

**步骤 2.2：创建 n8n 工作流编辑器组件**

文件：`aily-blockly/src/app/editors/n8n-workflow-editor/n8n-workflow-editor.component.ts`

```typescript
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-n8n-workflow-editor',
  template: `
    <div class="n8n-editor-container">
      <div class="toolbar">
        <button (click)="saveWorkflow()">保存工作流</button>
        <button (click)="deployWorkflow()">部署到硬件</button>
        <button (click)="openInNewWindow()">在新窗口打开</button>
      </div>

      <iframe
        #n8nFrame
        [src]="n8nUrl"
        class="n8n-iframe"
        frameborder="0">
      </iframe>
    </div>
  `,
  styles: [`
    .n8n-editor-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .toolbar {
      height: 48px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .n8n-iframe {
      flex: 1;
      width: 100%;
      border: none;
    }
  `]
})
export class N8nWorkflowEditorComponent implements OnInit, OnDestroy {
  @ViewChild('n8nFrame') n8nFrame!: ElementRef<HTMLIFrameElement>;

  n8nUrl: SafeResourceUrl;
  private currentWorkflowId: string | null = null;

  constructor(
    private electronService: ElectronService,
    private sanitizer: DomSanitizer
  ) {
    // 从 Electron 获取 n8n URL
    const url = this.electronService.ipcRenderer.sendSync('n8n:get-editor-url');
    this.n8nUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit() {
    // 监听 iframe 消息
    window.addEventListener('message', this.handleIframeMessage.bind(this));
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.handleIframeMessage.bind(this));
  }

  private handleIframeMessage(event: MessageEvent) {
    if (event.origin !== 'http://localhost:5678') return;

    // 处理来自 n8n 的消息
    const { type, data } = event.data;

    switch (type) {
      case 'workflow-saved':
        this.currentWorkflowId = data.workflowId;
        break;
      case 'workflow-changed':
        // 工作流变更
        break;
    }
  }

  async saveWorkflow() {
    // 通过 IPC 保存工作流
    await this.electronService.ipcRenderer.invoke('n8n:save-workflow', this.currentWorkflowId);
  }

  async deployWorkflow() {
    // 部署工作流到硬件
    await this.electronService.ipcRenderer.invoke('tesseract:deploy-workflow', this.currentWorkflowId);
  }

  openInNewWindow() {
    window.open(this.n8nUrl.toString(), '_blank');
  }
}
```

#### 验收标准
- [ ] n8n 实例随 Electron 启动
- [ ] n8n 编辑器正确显示在 iframe 中
- [ ] 工作流可以保存和加载
- [ ] 工作流可以部署到硬件
- [ ] iframe 通信正常

---

### 改造点 3：侧边栏重构 - 添加 3D 模型查看器

#### 目标
移除引脚图和电路连接工具，添加 3D 模型查看器，集成 Tesseract frontend 的 3D 渲染能力。

#### 实施方案

**步骤 3.1：移除旧组件**

删除或禁用以下目录：
```
aily-blockly/src/app/editors/blockly-editor/components/
├── pinmap-viewer/          # 删除
└── circuit-connector/      # 删除
```

**步骤 3.2：创建 3D 模型查看器组件**

文件：`aily-blockly/src/app/editors/n8n-workflow-editor/components/model-3d-viewer/model-3d-viewer.component.ts`

```typescript
import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

@Component({
  selector: 'app-model-3d-viewer',
  template: `
    <div class="model-viewer-container">
      <div class="toolbar">
        <button (click)="resetCamera()">重置视角</button>
        <button (click)="toggleAnimation()">{{ isAnimating ? '暂停' : '播放' }}</button>
        <select (change)="loadModel($event.target.value)">
          <option value="">选择硬件模型</option>
          <option value="arduino_uno">Arduino UNO</option>
          <option value="esp32">ESP32</option>
          <option value="custom">自定义硬件</option>
        </select>
      </div>

      <canvas #canvas class="model-canvas"></canvas>

      <div class="info-panel">
        <h3>{{ modelName }}</h3>
        <p>{{ modelDescription }}</p>
      </div>
    </div>
  `,
  styles: [`
    .model-viewer-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #1a1a1a;
    }

    .toolbar {
      height: 48px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 16px;
      background: #2a2a2a;
    }

    .model-canvas {
      flex: 1;
      width: 100%;
    }

    .info-panel {
      padding: 16px;
      background: #2a2a2a;
      color: white;
    }
  `]
})
export class Model3dViewerComponent implements OnInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() modelPath?: string;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private model?: THREE.Object3D;
  private animationId?: number;

  modelName: string = '';
  modelDescription: string = '';
  isAnimating: boolean = true;

  ngOnInit() {
    this.initThreeJS();
    if (this.modelPath) {
      this.loadModel(this.modelPath);
    }
  }

  private initThreeJS() {
    const canvas = this.canvasRef.nativeElement;

    // 场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // 相机
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // 控制器
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;

    // 光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    // 开始渲染循环
    this.animate();
  }

  loadModel(modelPath: string) {
    const loader = new GLTFLoader();

    // 移除旧模型
    if (this.model) {
      this.scene.remove(this.model);
    }

    // 加载新模型
    loader.load(
      `/assets/models/${modelPath}.glb`,
      (gltf) => {
        this.model = gltf.scene;
        this.scene.add(this.model);

        // 更新模型信息
        this.updateModelInfo(modelPath);

        // 调整相机位置
        this.fitCameraToModel();
      },
      undefined,
      (error) => {
        console.error('模型加载失败:', error);
      }
    );
  }

  private updateModelInfo(modelPath: string) {
    const modelInfo: { [key: string]: { name: string; description: string } } = {
      'arduino_uno': {
        name: 'Arduino UNO R3',
        description: '基于 ATmega328P 的开源电子原型平台'
      },
      'esp32': {
        name: 'ESP32 开发板',
        description: '支持 WiFi 和蓝牙的物联网开发板'
      }
    };

    const info = modelInfo[modelPath] || { name: '未知模型', description: '' };
    this.modelName = info.name;
    this.modelDescription = info.description;
  }

  private fitCameraToModel() {
    if (!this.model) return;

    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5; // 留一些边距

    this.camera.position.set(center.x, center.y, center.z + cameraZ);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (this.isAnimating && this.model) {
      this.model.rotation.y += 0.005;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resetCamera() {
    this.fitCameraToModel();
  }

  toggleAnimation() {
    this.isAnimating = !this.isAnimating;
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
  }
}
```

#### 验收标准
- [ ] 引脚图和电路连接组件已移除
- [ ] 3D 模型查看器正确显示
- [ ] 可以加载不同的硬件模型
- [ ] 3D 模型可以旋转、缩放、平移
- [ ] 模型信息正确显示

---

### 改造点 4：AI 对话 UI 适配

#### 目标
复用 aily-chat 的对话 UI 组件系统，适配 Tesseract Agent 的输出格式，添加专用组件（工作流蓝图卡片、组件推荐卡片、下一步按钮、配置引导面板）。

#### 实施方案

**步骤 4.1：创建工作流蓝图卡片组件**

文件：`aily-blockly/src/app/tools/aily-chat/components/workflow-blueprint-card/workflow-blueprint-card.component.ts`

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface WorkflowBlueprint {
  id: string;
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    type: string;
    name: string;
    description: string;
  }>;
  connections: Array<{
    from: string;
    to: string;
  }>;
}

@Component({
  selector: 'app-workflow-blueprint-card',
  template: `
    <div class="blueprint-card">
      <div class="card-header">
        <h3>{{ blueprint.name }}</h3>
        <span class="node-count">{{ blueprint.nodes.length }} 个节点</span>
      </div>

      <div class="card-body">
        <p class="description">{{ blueprint.description }}</p>

        <div class="nodes-preview">
          <div class="node-item" *ngFor="let node of blueprint.nodes">
            <div class="node-icon">
              <i [class]="getNodeIcon(node.type)"></i>
            </div>
            <div class="node-info">
              <span class="node-name">{{ node.name }}</span>
              <span class="node-type">{{ node.type }}</span>
            </div>
          </div>
        </div>

        <div class="mermaid-diagram">
          <app-aily-mermaid-viewer [code]="getMermaidCode()"></app-aily-mermaid-viewer>
        </div>
      </div>

      <div class="card-actions">
        <button class="btn-secondary" (click)="onModify()">
          <i class="icon-edit"></i> 修改蓝图
        </button>
        <button class="btn-primary" (click)="onConfirm()">
          <i class="icon-check"></i> 确认生成
        </button>
      </div>
    </div>
  `,
  styles: [`
    .blueprint-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      background: white;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .card-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .node-count {
      color: #666;
      font-size: 14px;
    }

    .description {
      color: #333;
      margin-bottom: 16px;
    }

    .nodes-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .node-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .node-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .node-info {
      display: flex;
      flex-direction: column;
    }

    .node-name {
      font-size: 14px;
      font-weight: 500;
    }

    .node-type {
      font-size: 12px;
      color: #666;
    }

    .mermaid-diagram {
      margin: 16px 0;
      padding: 16px;
      background: #f9f9f9;
      border-radius: 4px;
    }

    .card-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .btn-secondary, .btn-primary {
      padding: 8px 16px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn-primary {
      background: #1890ff;
      color: white;
    }
  `]
})
export class WorkflowBlueprintCardComponent {
  @Input() blueprint!: WorkflowBlueprint;
  @Output() modify = new EventEmitter<WorkflowBlueprint>();
  @Output() confirm = new EventEmitter<WorkflowBlueprint>();

  getNodeIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'gpio': 'icon-pin',
      'sensor': 'icon-sensor',
      'actuator': 'icon-motor',
      'communication': 'icon-wifi',
      'logic': 'icon-code'
    };
    return iconMap[type] || 'icon-node';
  }

  getMermaidCode(): string {
    let code = 'graph LR\n';
    this.blueprint.nodes.forEach(node => {
      code += `  ${node.id}[${node.name}]\n`;
    });
    this.blueprint.connections.forEach(conn => {
      code += `  ${conn.from} --> ${conn.to}\n`;
    });
    return code;
  }

  onModify() {
    this.modify.emit(this.blueprint);
  }

  onConfirm() {
    this.confirm.emit(this.blueprint);
  }
}
```

**步骤 4.2：创建组件推荐卡片**

文件：`aily-blockly/src/app/tools/aily-chat/components/component-recommendation-card/component-recommendation-card.component.ts`

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface ComponentRecommendation {
  id: string;
  name: string;
  type: string;
  description: string;
  reason: string;
  confidence: number;
  parameters?: { [key: string]: any };
}

@Component({
  selector: 'app-component-recommendation-card',
  template: `
    <div class="recommendation-card">
      <div class="card-header">
        <div class="component-info">
          <i [class]="getComponentIcon()"></i>
          <div>
            <h4>{{ component.name }}</h4>
            <span class="component-type">{{ component.type }}</span>
          </div>
        </div>
        <div class="confidence-badge" [class.high]="component.confidence > 0.8">
          {{ (component.confidence * 100).toFixed(0) }}% 匹配
        </div>
      </div>

      <div class="card-body">
        <p class="description">{{ component.description }}</p>
        <div class="reason">
          <strong>推荐理由：</strong>
          <p>{{ component.reason }}</p>
        </div>

        <div class="parameters" *ngIf="component.parameters">
          <strong>建议参数：</strong>
          <div class="param-list">
            <div class="param-item" *ngFor="let param of getParameters()">
              <span class="param-name">{{ param.key }}:</span>
              <span class="param-value">{{ param.value }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card-actions">
        <button class="btn-secondary" (click)="onReject()">
          不使用
        </button>
        <button class="btn-primary" (click)="onAccept()">
          <i class="icon-plus"></i> 添加到工作流
        </button>
      </div>
    </div>
  `,
  styles: [`
    .recommendation-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
      background: white;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .component-info {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .component-info i {
      font-size: 32px;
      color: #1890ff;
    }

    .component-info h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .component-type {
      font-size: 12px;
      color: #666;
    }

    .confidence-badge {
      padding: 4px 12px;
      border-radius: 12px;
      background: #f0f0f0;
      color: #666;
      font-size: 12px;
      font-weight: 500;
    }

    .confidence-badge.high {
      background: #e6f7ff;
      color: #1890ff;
    }

    .description {
      color: #333;
      margin-bottom: 12px;
    }

    .reason {
      background: #f9f9f9;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .reason strong {
      display: block;
      margin-bottom: 4px;
    }

    .reason p {
      margin: 0;
      color: #666;
    }

    .parameters {
      margin-bottom: 12px;
    }

    .parameters strong {
      display: block;
      margin-bottom: 8px;
    }

    .param-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .param-item {
      display: flex;
      gap: 8px;
      font-size: 14px;
    }

    .param-name {
      font-weight: 500;
      color: #333;
    }

    .param-value {
      color: #666;
    }

    .card-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .btn-secondary, .btn-primary {
      padding: 8px 16px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn-primary {
      background: #1890ff;
      color: white;
    }
  `]
})
export class ComponentRecommendationCardComponent {
  @Input() component!: ComponentRecommendation;
  @Output() accept = new EventEmitter<ComponentRecommendation>();
  @Output() reject = new EventEmitter<ComponentRecommendation>();

  getComponentIcon(): string {
    const iconMap: { [key: string]: string } = {
      'gpio': 'icon-pin',
      'sensor': 'icon-sensor',
      'actuator': 'icon-motor',
      'communication': 'icon-wifi',
      'logic': 'icon-code'
    };
    return iconMap[this.component.type] || 'icon-component';
  }

  getParameters(): Array<{ key: string; value: any }> {
    if (!this.component.parameters) return [];
    return Object.entries(this.component.parameters).map(([key, value]) => ({
      key,
      value
    }));
  }

  onAccept() {
    this.accept.emit(this.component);
  }

  onReject() {
    this.reject.emit(this.component);
  }
}
```

**步骤 4.3：创建下一步推荐按钮组件**

文件：`aily-blockly/src/app/tools/aily-chat/components/next-step-button/next-step-button.component.ts`

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface NextStepAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: string;
}

@Component({
  selector: 'app-next-step-button',
  template: `
    <div class="next-steps-container">
      <h4>建议下一步操作：</h4>
      <div class="steps-grid">
        <button
          class="step-button"
          *ngFor="let step of steps"
          (click)="onStepClick(step)">
          <i [class]="step.icon"></i>
          <div class="step-content">
            <span class="step-label">{{ step.label }}</span>
            <span class="step-description">{{ step.description }}</span>
          </div>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .next-steps-container {
      margin: 16px 0;
      padding: 16px;
      background: #f9f9f9;
      border-radius: 8px;
    }

    .next-steps-container h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .steps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 8px;
    }

    .step-button {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }

    .step-button:hover {
      border-color: #1890ff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
    }

    .step-button i {
      font-size: 24px;
      color: #1890ff;
    }

    .step-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .step-label {
      font-size: 14px;
      font-weight: 500;
      color: #333;
    }

    .step-description {
      font-size: 12px;
      color: #666;
    }
  `]
})
export class NextStepButtonComponent {
  @Input() steps: NextStepAction[] = [];
  @Output() stepClick = new EventEmitter<NextStepAction>();

  onStepClick(step: NextStepAction) {
    this.stepClick.emit(step);
  }
}
```

**步骤 4.4：集成到 aily-chat 组件**

文件：`aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts`

在现有的 aily-chat 组件中添加 Tesseract Agent 支持：

```typescript
// 添加导入
import { WorkflowBlueprintCardComponent } from './components/workflow-blueprint-card/workflow-blueprint-card.component';
import { ComponentRecommendationCardComponent } from './components/component-recommendation-card/component-recommendation-card.component';
import { NextStepButtonComponent } from './components/next-step-button/next-step-button.component';

// 在组件类中添加方法
async sendToTesseractAgent(message: string) {
  // 通过 IPC 调用 Tesseract Agent
  const result = await this.electronService.ipcRenderer.invoke(
    'tesseract:process-request',
    message,
    this.getCurrentContext()
  );

  // 处理 Agent 返回的结果
  this.handleTesseractResponse(result);
}

private handleTesseractResponse(result: any) {
  const { intent, components, workflow } = result;

  // 显示工作流蓝图
  if (workflow) {
    this.showWorkflowBlueprint(workflow);
  }

  // 显示组件推荐
  if (components && components.length > 0) {
    this.showComponentRecommendations(components);
  }

  // 显示下一步建议
  this.showNextSteps(intent);
}
```

#### 验收标准
- [ ] 工作流蓝图卡片正确显示
- [ ] 组件推荐卡片正确显示
- [ ] 下一步按钮正确显示
- [ ] 用户可以确认或修改蓝图
- [ ] 用户可以接受或拒绝组件推荐
- [ ] 点击下一步按钮触发相应操作

---

## 分阶段执行计划

### 阶段 1：基础设施准备（1 周）

**目标：** 搭建 Tesseract Agent 和 n8n 实例的基础环境

#### 任务清单
- [ ] 1.1 提取 Tesseract Agent 核心模块到 aily-blockly
- [ ] 1.2 创建 Agent 服务管理器
- [ ] 1.3 创建 IPC 通信接口
- [ ] 1.4 在 Electron 主进程中注册 Agent 服务
- [ ] 1.5 创建 n8n 实例管理服务
- [ ] 1.6 配置 n8n 启动参数
- [ ] 1.7 编写单元测试

#### 关键文件
```
aily-blockly/electron/
├── services/
│   ├── tesseract/
│   │   ├── agent-manager.ts
│   │   ├── intake-agent.ts
│   │   ├── component-selector.ts
│   │   ├── workflow-architect.ts
│   │   └── config-agent.ts
│   └── n8n-instance.ts
└── ipc/
    └── tesseract-handlers.ts
```

#### 验收标准
- [ ] Agent 服务成功启动
- [ ] n8n 实例成功启动
- [ ] IPC 通信正常
- [ ] 单元测试通过率 > 80%

---

### 阶段 2：工作区替换（2 周）

**目标：** 用 n8n 工作流编辑器替换 Blockly 工作区

#### 任务清单
- [ ] 2.1 创建 n8n-workflow-editor 组件
- [ ] 2.2 实现 iframe 嵌入 n8n 编辑器
- [ ] 2.3 实现 iframe 与主应用的消息通信
- [ ] 2.4 更新路由配置
- [ ] 2.5 更新主窗口导航
- [ ] 2.6 实现工作流保存/加载功能
- [ ] 2.7 实现工作流部署功能

#### 关键文件
```
aily-blockly/src/app/editors/
└── n8n-workflow-editor/
    ├── n8n-workflow-editor.component.ts
    ├── n8n-workflow-editor.component.html
    ├── n8n-workflow-editor.component.scss
    └── services/
        └── n8n-api.service.ts
```

#### 验收标准
- [ ] n8n 编辑器正确显示
- [ ] 可以创建和编辑工作流
- [ ] 工作流可以保存到本地
- [ ] 工作流可以部署到 n8n 实例
- [ ] iframe 通信稳定

---

### 阶段 3：侧边栏重构（1-2 周）

**目标：** 移除旧组件，添加 3D 模型查看器

#### 任务清单
- [ ] 3.1 移除 pinmap-viewer 组件
- [ ] 3.2 移除 circuit-connector 组件
- [ ] 3.3 安装 Three.js 依赖
- [ ] 3.4 创建 model-3d-viewer 组件
- [ ] 3.5 实现 3D 模型加载功能
- [ ] 3.6 实现相机控制（旋转、缩放、平移）
- [ ] 3.7 准备硬件 3D 模型资源（.glb 格式）
- [ ] 3.8 集成到侧边栏

#### 关键文件
```
aily-blockly/src/app/editors/n8n-workflow-editor/
└── components/
    └── model-3d-viewer/
        ├── model-3d-viewer.component.ts
        ├── model-3d-viewer.component.html
        └── model-3d-viewer.component.scss

aily-blockly/public/assets/models/
├── arduino_uno.glb
├── esp32.glb
└── custom.glb
```

#### 验收标准
- [ ] 旧组件已完全移除
- [ ] 3D 模型查看器正确显示
- [ ] 可以加载多种硬件模型
- [ ] 3D 交互流畅（60 FPS）
- [ ] 模型信息正确显示

---

### 阶段 4：AI 对话 UI 适配（2 周）

**目标：** 创建 Tesseract Agent 专用 UI 组件

#### 任务清单
- [ ] 4.1 创建 workflow-blueprint-card 组件
- [ ] 4.2 创建 component-recommendation-card 组件
- [ ] 4.3 创建 next-step-button 组件
- [ ] 4.4 创建 config-guide-panel 组件
- [ ] 4.5 集成 Mermaid 图表渲染
- [ ] 4.6 适配 Tesseract Agent 输出格式
- [ ] 4.7 实现组件交互逻辑
- [ ] 4.8 集成到 aily-chat 组件

#### 关键文件
```
aily-blockly/src/app/tools/aily-chat/components/
├── workflow-blueprint-card/
│   ├── workflow-blueprint-card.component.ts
│   ├── workflow-blueprint-card.component.html
│   └── workflow-blueprint-card.component.scss
├── component-recommendation-card/
│   ├── component-recommendation-card.component.ts
│   ├── component-recommendation-card.component.html
│   └── component-recommendation-card.component.scss
├── next-step-button/
│   ├── next-step-button.component.ts
│   ├── next-step-button.component.html
│   └── next-step-button.component.scss
└── config-guide-panel/
    ├── config-guide-panel.component.ts
    ├── config-guide-panel.component.html
    └── config-guide-panel.component.scss
```

#### 验收标准
- [ ] 所有专用组件正确显示
- [ ] 组件样式符合设计规范
- [ ] 用户交互流畅
- [ ] Tesseract Agent 输出正确渲染
- [ ] Mermaid 图表正确显示

---

### 阶段 5：端到端集成测试（1 周）

**目标：** 验证完整用户历程

#### 测试场景

**场景 1：自然语言生成工作流**
1. 用户在 aily-chat 中输入需求："我想做一个温度监控系统"
2. Tesseract Agent 解析意图
3. 显示工作流蓝图卡片
4. 用户确认蓝图
5. 生成 n8n 工作流
6. 工作流显示在 n8n 编辑器中

**场景 2：组件推荐与配置**
1. Agent 推荐温度传感器组件
2. 显示组件推荐卡片
3. 用户接受推荐
4. 组件添加到工作流
5. Agent 引导配置参数
6. 显示配置引导面板

**场景 3：3D 模型查看**
1. 用户选择硬件型号（Arduino UNO）
2. 侧边栏加载 3D 模型
3. 用户旋转、缩放模型
4. 查看硬件信息

**场景 4：工作流部署**
1. 用户完成工作流配置
2. 点击"部署到硬件"
3. 工作流通过 n8n API 部署
4. 配置下发到硬件
5. 串口监视器显示硬件反馈

#### 验收标准
- [ ] 所有测试场景通过
- [ ] 用户体验流畅
- [ ] 无明显性能问题
- [ ] 错误处理完善

---

### 阶段 6：优化与发布（1 周）

**目标：** 性能优化和文档完善

#### 任务清单
- [ ] 6.1 性能优化（Agent 响应、3D 渲染、iframe 通信）
- [ ] 6.2 UI/UX 优化
- [ ] 6.3 错误处理增强
- [ ] 6.4 编写用户文档
- [ ] 6.5 编写开发者文档
- [ ] 6.6 准备发布包
- [ ] 6.7 内部测试与反馈收集

#### 验收标准
- [ ] Agent 响应时间 < 3 秒
- [ ] 3D 渲染帧率 > 60 FPS
- [ ] 应用启动时间 < 10 秒
- [ ] 文档完整清晰
- [ ] 发布包可正常安装

---

## UI 组件复用映射表

| aily-chat 现有组件 | Tesseract 新增组件 | 复用方式 |
|-------------------|-------------------|---------|
| DialogComponent | WorkflowBlueprintCard | 继承对话框样式 |
| XDialogComponent | ComponentRecommendationCard | 继承弹窗样式 |
| AilyMermaidViewer | 工作流蓝图图表 | 直接复用 |
| AilyStateViewer | 工作流状态查看 | 直接复用 |
| AilyBlocklyViewer | （移除） | 不再使用 |
| AilyBoardViewer | Model3dViewer | 替换为 3D 查看器 |

---

## 技术实施细节

### 1. Electron 主进程架构

```typescript
// electron/main.ts
import { app, BrowserWindow } from 'electron';
import { registerTesseractHandlers } from './ipc/tesseract-handlers';
import { N8nInstance } from './services/n8n-instance';

let mainWindow: BrowserWindow;
let n8nInstance: N8nInstance;

app.whenReady().then(async () => {
  // 启动 n8n 实例
  n8nInstance = new N8nInstance(5678);
  await n8nInstance.start();

  // 注册 Tesseract IPC 处理器
  registerTesseractHandlers();

  // 创建主窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL('http://localhost:4200');
});

app.on('before-quit', async () => {
  // 停止 n8n 实例
  await n8nInstance.stop();
});
```

### 2. IPC 通信协议

```typescript
// 前端调用
const result = await window.electronAPI.tesseract.processRequest(userInput, context);

// Preload 脚本
contextBridge.exposeInMainWorld('electronAPI', {
  tesseract: {
    processRequest: (input, context) =>
      ipcRenderer.invoke('tesseract:process-request', input, context),
    guideConfig: (workflowId) =>
      ipcRenderer.invoke('tesseract:guide-config', workflowId),
    deployWorkflow: (workflowId) =>
      ipcRenderer.invoke('tesseract:deploy-workflow', workflowId)
  },
  n8n: {
    getEditorUrl: () =>
      ipcRenderer.sendSync('n8n:get-editor-url'),
    saveWorkflow: (workflowId) =>
      ipcRenderer.invoke('n8n:save-workflow', workflowId)
  }
});
```

### 3. n8n 工作流数据格式

```typescript
interface N8nWorkflow {
  id: string;
  name: string;
  nodes: Array<{
    id: string;
    type: string;
    name: string;
    position: [number, number];
    parameters: { [key: string]: any };
  }>;
  connections: {
    [nodeId: string]: {
      main: Array<Array<{ node: string; type: string; index: number }>>;
    };
  };
  settings: {
    executionOrder: 'v1';
  };
}
```

### 4. Tesseract Agent 输出格式

```typescript
interface TesseractAgentResponse {
  intent: {
    type: string;
    confidence: number;
    entities: Array<{ type: string; value: string }>;
  };
  components: Array<{
    id: string;
    name: string;
    type: string;
    confidence: number;
    reason: string;
    parameters: { [key: string]: any };
  }>;
  workflow: {
    id: string;
    name: string;
    description: string;
    nodes: Array<{ id: string; type: string; name: string }>;
    connections: Array<{ from: string; to: string }>;
  };
  nextSteps: Array<{
    id: string;
    label: string;
    description: string;
    action: string;
  }>;
}
```

---

## 风险与缓解策略

### 风险 1：n8n 实例性能开销
**描述：** 在 Electron 中运行 n8n 可能导致内存和 CPU 占用过高

**缓解策略：**
- 使用 n8n 的轻量级模式
- 限制同时运行的工作流数量
- 实现工作流缓存机制
- 提供"在浏览器中打开"选项

### 风险 2：3D 模型渲染性能
**描述：** Three.js 渲染可能在低端设备上卡顿

**缓解策略：**
- 优化 3D 模型（减少面数）
- 使用 LOD（细节层次）技术
- 提供"简化模式"选项
- 限制同时渲染的模型数量

### 风险 3：Agent 响应延迟
**描述：** Tesseract Agent 处理复杂需求时响应慢

**缓解策略：**
- 实现流式响应
- 显示处理进度
- 使用 Worker Threads 隔离计算
- 缓存常见需求的结果

### 风险 4：用户学习曲线
**描述：** 从 Blockly 切换到 n8n 可能增加学习成本

**缓解策略：**
- 提供详细的新手引导
- 保留 Blockly 作为"简单模式"（可选）
- 提供丰富的工作流模板
- 制作视频教程

---

## 成功指标

### 技术指标
- [ ] Agent 集成成功率 > 95%
- [ ] n8n 实例启动成功率 > 98%
- [ ] 3D 模型加载成功率 > 99%
- [ ] 单元测试覆盖率 > 70%
- [ ] 端到端测试通过率 100%

### 性能指标
- [ ] Agent 响应时间 < 3 秒
- [ ] 工作流生成时间 < 5 秒
- [ ] 3D 渲染帧率 > 60 FPS
- [ ] 应用启动时间 < 10 秒
- [ ] 内存占用 < 800MB

### 用户体验指标
- [ ] 需求理解准确率 > 90%
- [ ] 工作流生成成功率 > 85%
- [ ] 用户满意度 > 4.0/5.0
- [ ] 任务完成率 > 80%

---

## 附录

### A. 依赖包清单

```json
{
  "dependencies": {
    "three": "^0.160.0",
    "n8n": "^1.x",
    "@types/three": "^0.160.0"
  }
}
```

### B. 环境变量配置

```bash
# Electron 环境
N8N_PORT=5678
N8N_PROTOCOL=http
N8N_HOST=localhost
AGENT_PORT=3005
MCP_PORT=3006

# Tesseract Agent
OPENAI_API_KEY=your_key
AGENT_MODE=embedded
```

### C. 文件结构总览

```
aily-blockly/
├── electron/
│   ├── services/
│   │   ├── tesseract/          # Tesseract Agent 服务
│   │   └── n8n-instance.ts     # n8n 实例管理
│   └── ipc/
│       └── tesseract-handlers.ts
├── src/app/
│   ├── editors/
│   │   └── n8n-workflow-editor/  # n8n 工作流编辑器
│   │       └── components/
│   │           └── model-3d-viewer/  # 3D 模型查看器
│   └── tools/
│       └── aily-chat/
│           └── components/
│               ├── workflow-blueprint-card/
│               ├── component-recommendation-card/
│               ├── next-step-button/
│               └── config-guide-panel/
└── public/assets/
    └── models/                 # 3D 模型资源
```

---

## 维护说明

本文档应在以下情况更新：
1. 完成任何阶段任务后
2. 发现新的技术风险
3. 架构决策变更
4. 用户反馈收集后

**文档所有者：** Tesseract 开发团队
**审核周期：** 每周
**版本控制：** Git + 变更日志