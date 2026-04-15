import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:aitesseract/module/device/model/digital_twin_scene_envelope.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses preview sessions and top controls from scene envelope', () {
    final envelope = DigitalTwinSceneEnvelope.tryParse(<String, dynamic>{
      'type': 'tesseract-digital-twin-scene',
      'revision': 12,
      'renderHardwareModels': false,
      'scene': <String, dynamic>{
        'display_mode': 'multi_scene',
        'base_model_id': 'model_5',
        'interfaces': <Map<String, dynamic>>[
          <String, dynamic>{
            'id': 'port_7',
            'label': '接口7 · 底部',
            'kind': 'bottom',
            'position': <double>[0, -1.72, 0],
            'rotation': <double>[90, 0, 0],
          },
        ],
        'models': <Map<String, dynamic>>[
          <String, dynamic>{
            'id': 'model_5',
            'url': '/assets/assets/models/base.glb',
            'device_id': 'device-001',
          },
          <String, dynamic>{
            'id': 'camera-preview',
            'url': '/assets/assets/models/camera.glb',
            'device_id': 'camera-preview',
          },
        ],
      },
      'preview_sessions': <Map<String, dynamic>>[
        <String, dynamic>{
          'sessionId': 'mic-preview',
          'kind': 'microphone',
          'label': '内置麦克风',
          'amplitude': 0.62,
          'renderInScene': false,
          'modelId': 'mic-preview',
        },
        <String, dynamic>{
          'sessionId': 'camera-preview',
          'kind': 'camera',
          'label': 'Camera P2P',
          'streamUrl': 'https://example.invalid/p2p',
          'renderInScene': false,
          'modelId': 'camera-preview',
        },
      ],
      'top_controls': <Map<String, dynamic>>[
        <String, dynamic>{
          'id': 'builtin-mic',
          'kind': 'microphone',
          'label': 'MIC',
          'active': true,
          'enabled': true,
        },
        <String, dynamic>{
          'id': 'builtin-speaker',
          'kind': 'speaker',
          'label': 'SPK',
          'active': true,
          'enabled': true,
        },
      ],
    });

    expect(envelope, isNotNull);
    expect(envelope!.revision, 12);
    expect(envelope.previewSessions, hasLength(2));
    expect(envelope.topControls, hasLength(2));
    expect(envelope.previewSessions.first.isMicrophone, isTrue);
    expect(envelope.topControls.last.isSpeakerControl, isTrue);
  });

  test('sceneForRendering hides preview hardware models when disabled', () {
    final envelope = DigitalTwinSceneEnvelope(
      scene: DigitalTwinSceneConfig.fromJson(<String, dynamic>{
        'display_mode': 'multi_scene',
        'base_model_id': 'model_5',
        'models': <Map<String, dynamic>>[
          <String, dynamic>{
            'id': 'model_5',
            'url': '/assets/assets/models/base.glb',
          },
          <String, dynamic>{
            'id': 'camera-preview',
            'url': '/assets/assets/models/camera.glb',
          },
        ],
      }),
      previewSessions: <DigitalTwinPreviewSessionState>[
        const DigitalTwinPreviewSessionState(
          sessionId: 'camera-preview',
          kind: 'camera',
          label: 'Camera P2P',
          modelId: 'camera-preview',
          streamUrl: 'https://example.invalid/p2p',
          renderInScene: false,
        ),
      ],
      renderHardwareModels: false,
    );

    final visibleScene = envelope.sceneForRendering();

    expect(visibleScene.models, hasLength(1));
    expect(visibleScene.models.single.id, 'model_5');
  });
}
