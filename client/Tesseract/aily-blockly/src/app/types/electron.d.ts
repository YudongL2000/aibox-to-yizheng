/**
 * [INPUT]: 依赖 preload 暴露到 renderer 的 electronAPI 结构。
 * [OUTPUT]: 对外扩展 Window.electronAPI 类型声明，覆盖 preload 暴露的 Tesseract/n8n/结构化日志桥，避免 Angular 侧访问预注入桥时漂成 any 黑洞。
 * [POS]: app/types 的 Electron 全局声明边界，被 renderer 中所有 window.electronAPI 消费者共享。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

type TesseractDialogueMode = 'teaching' | 'dialogue';

type TesseractTeachingContext = {
  originalPrompt?: string;
  prefilledGoal?: string;
  sourceSessionId?: string;
} | null;

declare global {
  interface Window {
    electronAPI: {
      SerialPort: {
        list: () => Promise<any[]>;
        create: (options: any) => any;
      };
      safeStorage: {
        isEncryptionAvailable: () => boolean;
        encryptString: (plainText: string) => Buffer;
        decryptString: (encrypted: Buffer) => string;
      };
      ipcRenderer: any;
      path: any;
      platform: any;
      terminal: any;
      iWindow: any;
      subWindow: any;
      builder: any;
      uploader: any;
      fs: any;
      ble: any;
      wifi: any;
      dialog: any;
      other: any;
      env: {
        set: (payload: { key: string; value: string }) => Promise<any>;
        get: (key: string) => Promise<string>;
      };
      npm: any;
      cmd: any;
      updater: any;
      mcp: any;
      tesseract: {
        start: (payload?: any) => Promise<any>;
        stop: () => Promise<any>;
        status: () => Promise<any>;
        hardwareStatus: (payload?: any) => Promise<any>;
        hardwareUpload: (payload?: any) => Promise<any>;
        hardwareStop: (payload?: any) => Promise<any>;
        hardwareCommand: (payload?: any) => Promise<any>;
        hardwareMicrophoneOpen: (payload?: any) => Promise<any>;
        hardwareMicrophoneClose: (payload?: any) => Promise<any>;
        hardwareSpeakerPlay: (payload?: any) => Promise<any>;
        chat: (payload: {
          message: string;
          sessionId?: string;
          interactionMode?: TesseractDialogueMode;
          teachingContext?: TesseractTeachingContext;
          clarificationContext?: { category: string } | null;
        }) => Promise<any>;
        validateHardware: (payload: {
          sessionId: string;
          event: any;
          interactionMode?: TesseractDialogueMode;
          teachingContext?: TesseractTeachingContext;
        }) => Promise<any>;
        startDeploy: (payload: {
          sessionId: string;
          interactionMode?: TesseractDialogueMode;
          teachingContext?: TesseractTeachingContext;
        }) => Promise<any>;
        confirmWorkflow: (payload?: any) => Promise<any>;
        createWorkflow: (payload?: any) => Promise<any>;
        startConfig: (payload?: any) => Promise<any>;
        confirmNode: (payload?: any) => Promise<any>;
        uploadFaceImage: (payload?: {
          profile: string;
          fileName: string;
          contentBase64: string;
        }) => Promise<any>;
        listSkills: (payload?: any) => Promise<any>;
        saveSkill: (payload?: any) => Promise<any>;
        deleteSkill: (payload?: any) => Promise<any>;
        getConfigState: (payload?: any) => Promise<any>;
        deployWorkflow: (payload?: any) => Promise<any>;
      };
      digitalTwin: {
        hide: () => Promise<void>;
        show: () => Promise<void>;
        setScene: (payload: any) => Promise<any>;
        getScene: () => Promise<any>;
        onSceneUpdated: (callback: (scene: unknown) => void) => (() => void);
        setPreviewState: (payload: any) => Promise<any>;
        getPreviewState: () => Promise<any>;
        onPreviewStateUpdated: (callback: (previewState: unknown) => void) => (() => void);
      };
      n8n: any;
      log: {
        emit: (payload: {
          level?: 'debug' | 'info' | 'warn' | 'error';
          module?: string;
          source?: string;
          message: string;
          context?: any;
        }) => void;
        error: (message: string, error?: any, meta?: any) => Promise<any>;
        warn: (message: string, meta?: any) => Promise<any>;
        info: (message: string, meta?: any) => Promise<any>;
        debug: (message: string, meta?: any) => void;
        getStatus: () => Promise<any>;
        openArchiveDirectory: () => Promise<string>;
      };
      versions: () => any;
    };
  }
}

export {};
