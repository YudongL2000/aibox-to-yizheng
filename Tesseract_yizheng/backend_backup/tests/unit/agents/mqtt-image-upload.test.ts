/**
 * [INPUT]: 依赖 AgentService 的 publishImageViaMqtt 与 MqttHardwareRuntime 的 publishRecImg
 * [OUTPUT]: 验证 MQTT rec_img 发布路径的正确性：base64 剥离、format 推导、无硬件时的错误
 * [POS]: backend/tests/unit/agents 的 021 功能测试，被 npm test 运行
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentService } from '../../../src/agent-server/agent-service';

// ── 最小化 AgentService 构造所需依赖 ──
function makeMinimalAgentService(hardwareRuntime?: { publishRecImg: ReturnType<typeof vi.fn> }) {
  const service = Object.create(AgentService.prototype) as AgentService;
  (service as any).hardwareRuntime = hardwareRuntime ?? null;
  return service;
}

describe('AgentService.publishImageViaMqtt (021-mqtt-image-upload)', () => {
  let publishRecImg: ReturnType<typeof vi.fn>;
  let service: AgentService;

  beforeEach(() => {
    publishRecImg = vi.fn().mockResolvedValue(undefined);
    service = makeMinimalAgentService({ publishRecImg });
  });

  it('should strip data-URL prefix before sending', async () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';
    await service.publishImageViaMqtt({ profile: 'alice', fileName: 'photo.jpg', contentBase64: dataUrl });
    expect(publishRecImg).toHaveBeenCalledWith(
      expect.objectContaining({ dataBase64: '/9j/4AAQSkZJRgABAQ==' })
    );
  });

  it('should derive format "jpeg" from .jpg extension', async () => {
    await service.publishImageViaMqtt({ profile: 'alice', fileName: 'photo.jpg', contentBase64: 'data:image/jpeg;base64,abc' });
    expect(publishRecImg).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'jpeg' })
    );
  });

  it('should derive format "png" from .png extension', async () => {
    await service.publishImageViaMqtt({ profile: 'bob', fileName: 'avatar.png', contentBase64: 'data:image/png;base64,abc' });
    expect(publishRecImg).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'png' })
    );
  });

  it('should forward image width and height when provided', async () => {
    await service.publishImageViaMqtt({
      profile: 'alice',
      fileName: 'photo.jpg',
      contentBase64: 'data:image/jpeg;base64,abc',
      width: 1920,
      height: 1080,
    });
    expect(publishRecImg).toHaveBeenCalledWith(
      expect.objectContaining({ width: 1920, height: 1080 })
    );
  });

  it('should return { success: true, profile, imageId } on success', async () => {
    const result = await service.publishImageViaMqtt({ profile: 'alice', fileName: 'photo.jpg', contentBase64: 'data:image/jpeg;base64,abc' });
    expect(result.success).toBe(true);
    expect(result.profile).toBe('alice');
    expect(result.imageId).toMatch(/^alice_[a-f0-9]{6}$/);
  });

  it('should throw when no hardwareRuntime is available', async () => {
    const offline = makeMinimalAgentService(undefined);
    await expect(offline.publishImageViaMqtt({ profile: 'x', fileName: 'x.jpg', contentBase64: 'abc' }))
      .rejects.toThrow('设备未连接');
  });
});
