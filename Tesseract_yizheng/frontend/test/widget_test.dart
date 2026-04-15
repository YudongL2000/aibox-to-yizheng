/*
 * [INPUT]: 依赖 flutter_test 的断言能力，依赖响应模型、登录模型与数字孪生协议/解算器。
 * [OUTPUT]: 对外提供 BaseResponse、LoginModel、DeviceEventPayload、DigitalTwinSceneConfig、DigitalTwinMountResolver 的纯逻辑回归测试，覆盖接口锚点、组件安装锚点与接口-组件残差三层语义。
 * [POS]: test 的轻量烟雾测试，避免把 Web-only 入口拉进 Dart VM。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:aitesseract/module/device/model/device_event_model.dart';
import 'package:aitesseract/module/device/model/digital_twin_mount_resolver.dart';
import 'package:aitesseract/module/login/model/login_model.dart';
import 'package:aitesseract/server/api/agent_chat_api.dart';
import 'package:aitesseract/server/api/models/base_response.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('BaseResponse', () {
    test('parses nested login payload', () {
      final response = BaseResponse<LoginModel>.fromJson(
        {
          'code': 200,
          'msg': 'ok',
          'data': {
            'mainMenuItems': {'home': true},
            'userInfo': {'name': 'sam'},
          },
        },
        (json) => LoginModel.fromJson(json as Map<String, dynamic>),
      );

      expect(response.isSuccess, isTrue);
      expect(response.message, 'ok');
      expect(response.data?.mainMenuItems?['home'], isTrue);
      expect(response.data?.userInfo?['name'], 'sam');
    });

    test('supports alternate paging field names', () {
      final page = PageResponse<LoginModel>.fromJson(
        {
          'records': [
            {
              'mainMenuItems': {'workspace': true},
              'userInfo': {'id': 7},
            },
          ],
          'totalCount': 1,
          'currentPage': 3,
          'size': 20,
        },
        LoginModel.fromJson,
      );

      expect(page.total, 1);
      expect(page.current, 3);
      expect(page.pageSize, 20);
      expect(page.list.single.userInfo?['id'], 7);
    });
  });

  group('DeviceEventPayload', () {
    test('parses current mqtt device payload', () {
      final payload = DeviceEventPayload.fromJson({
        'session_id': 'optional-session-id',
        'target_id': 'optional-target-id',
        'timestamp': '2025-03-04T10:00:00Z',
        'device_info': [
          {
            'port_id': 'USB1',
            'status': 'plug_in',
            'device_id': 'car-001',
            'device_type': 'car',
            'notes': {'car_status': 'on'},
          },
          {
            'port_id': 'USB2',
            'status': 'plug_out',
            'device_id': 'screen-001',
            'device_type': 'screen',
            'notes': {},
          },
        ],
        'action': [],
      });

      expect(payload.deviceInfo, hasLength(2));
      expect(payload.deviceInfo.first.deviceId, 'car-001');
      expect(payload.deviceInfo.first.isPlugIn, isTrue);
      expect(payload.deviceInfo.last.deviceType, 'screen');
      expect(payload.deviceInfo.last.isPlugOut, isTrue);
    });
  });

  group('DigitalTwinSceneConfig', () {
    test('parses multi scene config', () {
      final scene = DigitalTwinSceneConfig.fromJson({
        'display_mode': 'multi_scene',
        'base_model_id': 'model_5',
        'interfaces': [
          {
            'id': 'port_1',
            'label': '接口1 · 侧面A',
            'kind': 'side',
            'position': [0, 0, 1.62],
            'rotation': [0, 0, 0],
          },
        ],
        'models': [
          {
            'id': 'model_1',
            'url': '/assets/assets/models/car.glb',
            'interface_id': 'port_1',
            'position': [-2, 0, 2],
            'rotation': [0, 45, 90],
            'scale': [0.72, 0.72, 0.72],
            'mount_position_offset': [0.1, 0.0, -0.2],
            'mount_rotation_offset': [0, 90, 0],
            'device_id': 'car-001',
          },
          {
            'id': 'model_2',
            'url': '/assets/assets/models/screen.glb',
            'position': [0, 0, 2],
            'device_id': 'screen-001',
          },
        ],
      });

      expect(scene.isMultiScene, isTrue);
      expect(scene.baseModelId, 'model_5');
      expect(scene.interfaces, hasLength(1));
      expect(scene.interfaces.first.id, 'port_1');
      expect(scene.models, hasLength(2));
      expect(scene.models.first.interfaceId, 'port_1');
      expect(scene.models.first.deviceId, 'car-001');
      expect(scene.models.first.position, [-2.0, 0.0, 2.0]);
      expect(scene.models.first.rotation, [0.0, 45.0, 90.0]);
      expect(scene.models.first.scale, [0.72, 0.72, 0.72]);
      expect(scene.models.first.mountPositionOffset, [0.1, 0.0, -0.2]);
      expect(scene.models.first.mountRotationOffset, [0.0, 90.0, 0.0]);
      expect(scene.models.last.rotation, [0.0, 0.0, 0.0]);
      expect(scene.models.last.scale, [1.0, 1.0, 1.0]);
      expect(scene.models.last.mountPositionOffset, [0.0, 0.0, 0.0]);
      expect(scene.models.last.mountRotationOffset, [0.0, 0.0, 0.0]);
      expect(scene.models.last.url, '/assets/assets/models/screen.glb');
    });

    test('updates selected model transform by id', () {
      final scene = DigitalTwinSceneConfig.fromJson({
        'display_mode': 'multi_scene',
        'models': [
          {
            'id': 'model_1',
            'url': '/assets/assets/models/car.glb',
            'position': [-2, 0, 2],
            'rotation': [0, 0, 0],
            'device_id': 'car-001',
          },
          {
            'id': 'model_2',
            'url': '/assets/assets/models/screen.glb',
            'position': [0, 0, 2],
            'rotation': [0, 0, 0],
            'device_id': 'screen-001',
          },
        ],
      });

      final updated = scene.updateModel(
        'model_2',
        interfaceId: 'port_7',
        position: <double>[1.5, -2, 3],
        rotation: <double>[10, 20, 30],
        scale: <double>[0.8, 0.8, 0.8],
        mountPositionOffset: <double>[0.2, 0.0, -0.1],
        mountRotationOffset: <double>[0, 90, 0],
      );

      expect(updated.findModelById('model_2'), isNotNull);
      expect(updated.findModelById('model_2')!.interfaceId, 'port_7');
      expect(updated.findModelById('model_2')!.position, [1.5, -2.0, 3.0]);
      expect(updated.findModelById('model_2')!.rotation, [10.0, 20.0, 30.0]);
      expect(updated.findModelById('model_2')!.scale, [0.8, 0.8, 0.8]);
      expect(updated.findModelById('model_2')!.mountPositionOffset, [
        0.2,
        0.0,
        -0.1,
      ]);
      expect(updated.findModelById('model_2')!.mountRotationOffset, [
        0.0,
        90.0,
        0.0,
      ]);
      expect(updated.findModelById('model_1')!.position, [-2.0, 0.0, 2.0]);
    });

    test('applies interface defaults to scene without interfaces', () {
      final scene = DigitalTwinSceneConfig.fromJson({
        'display_mode': 'multi_scene',
        'models': [
          {
            'id': 'model_2',
            'url': '/assets/assets/models/screen.glb',
            'position': [0, 0, 0],
            'device_id': 'screen-001',
          },
        ],
      });
      final defaults = DigitalTwinSceneConfig.fromJson({
        'display_mode': 'multi_scene',
        'base_model_id': 'model_5',
        'interfaces': [
          {
            'id': 'port_7',
            'label': '接口7',
            'kind': 'bottom',
            'position': [0, -1.72, 0],
            'rotation': [90, 0, 0],
          },
        ],
      });

      final updated = scene.applyInterfaceDefaults(defaults);

      expect(updated.baseModelId, 'model_5');
      expect(updated.interfaces, hasLength(1));
      expect(updated.interfaces.single.id, 'port_7');
      expect(updated.models.single.id, 'model_2');
    });

    test('allows asset interface defaults to replace fallback interfaces', () {
      final fallback = DigitalTwinSceneConfig.fromJson({
        'display_mode': 'multi_scene',
        'base_model_id': 'model_5',
        'interfaces': [
          {
            'id': 'port_1',
            'label': '旧接口',
            'kind': 'side',
            'position': [0, 0, 1],
            'rotation': [0, 0, 0],
          },
        ],
      });
      final assetDefaults = DigitalTwinSceneConfig.fromJson({
        'display_mode': 'multi_scene',
        'base_model_id': 'model_8',
        'interfaces': [
          {
            'id': 'port_4',
            'label': '新接口',
            'kind': 'side',
            'position': [0, 0, -2],
            'rotation': [0, 180, 0],
          },
        ],
      });

      final updated = fallback.applyInterfaceDefaults(
        assetDefaults,
        replaceInterfaces: true,
        replaceBaseModelId: true,
      );

      expect(updated.baseModelId, 'model_8');
      expect(updated.interfaces, hasLength(1));
      expect(updated.interfaces.single.id, 'port_4');
      expect(updated.interfaces.single.label, '新接口');
    });

    test('extracts scene config from workflow meta wrapper', () {
      final scene = DigitalTwinSceneConfig.tryParse({
        'digital_twin_scene': {
          'display_mode': 'multi_scene',
          'models': [
            {
              'id': 'model_1',
              'url': '/assets/assets/models/car.glb',
              'position': [-2, 0, 2],
              'device_id': 'car-001',
            },
          ],
        },
      });

      expect(scene, isNotNull);
      expect(scene!.isMultiScene, isTrue);
      expect(scene.models.single.deviceId, 'car-001');
    });

    test('parses component mount profile overrides from env', () {
      final overrides = DigitalTwinSceneConfig.parseMountCompensationEnv(
        '{"model_2":{"position":[0.1,0.0,-0.2],"rotation":[0,90,0],"scale":[0.8,0.8,0.8]}}',
      );

      expect(overrides, hasLength(1));
      expect(overrides['model_2'], isNotNull);
      expect(overrides['model_2']!.position, [0.1, 0.0, -0.2]);
      expect(overrides['model_2']!.rotation, [0.0, 90.0, 0.0]);
      expect(overrides['model_2']!.scale, [0.8, 0.8, 0.8]);
    });

    test('parses file mount profile config wrapper', () {
      final overrides = DigitalTwinSceneConfig.parseMountCompensationConfig(
        '''
        {
          "mount_compensation": {
            "model_3": {
              "position": [0.0, 0.2, -0.1],
              "rotation": [90, 0, 0],
              "scale": [0.6, 0.6, 0.6]
            }
          }
        }
        ''',
      );

      expect(overrides, hasLength(1));
      expect(overrides['model_3'], isNotNull);
      expect(overrides['model_3']!.position, [0.0, 0.2, -0.1]);
      expect(overrides['model_3']!.rotation, [90.0, 0.0, 0.0]);
      expect(overrides['model_3']!.scale, [0.6, 0.6, 0.6]);
    });

    test('merges file and env mount profiles with env priority', () {
      final merged = DigitalTwinSceneConfig.mergeMountCompensationOverrides(
        base: <String, DigitalTwinMountCompensationOverride>{
          'model_2': const DigitalTwinMountCompensationOverride(
            position: <double>[0.1, 0.0, -0.2],
            rotation: <double>[0, 45, 0],
            scale: <double>[0.5, 0.5, 0.5],
          ),
        },
        override: <String, DigitalTwinMountCompensationOverride>{
          'model_2': const DigitalTwinMountCompensationOverride(
            position: <double>[0.4, 0.0, 0.0],
            rotation: <double>[0, 90, 0],
            scale: <double>[0.8, 0.8, 0.8],
          ),
          'model_3': const DigitalTwinMountCompensationOverride(
            position: <double>[0.0, 0.2, 0.0],
            rotation: <double>[0, 0, 180],
            scale: <double>[0.6, 0.6, 0.6],
          ),
        },
      );

      expect(merged, hasLength(2));
      expect(merged['model_2']!.position, [0.4, 0.0, 0.0]);
      expect(merged['model_2']!.rotation, [0.0, 90.0, 0.0]);
      expect(merged['model_2']!.scale, [0.8, 0.8, 0.8]);
      expect(merged['model_3']!.position, [0.0, 0.2, 0.0]);
      expect(merged['model_3']!.scale, [0.6, 0.6, 0.6]);
    });

    test('applies component mount profiles to scene models', () {
      final scene = DigitalTwinSceneConfig.fromJson({
        'display_mode': 'multi_scene',
        'models': [
          {
            'id': 'model_2',
            'url': '/assets/assets/models/screen.glb',
            'position': [0, 0, 2],
            'device_id': 'screen-001',
          },
        ],
      });

      final updated = scene.applyMountCompensationOverrides(
        <String, DigitalTwinMountCompensationOverride>{
          'model_2': const DigitalTwinMountCompensationOverride(
            position: <double>[0.1, 0.0, -0.2],
            rotation: <double>[0, 90, 0],
            scale: <double>[0.8, 0.8, 0.8],
          ),
        },
      );

      expect(updated.models.single.mountPositionOffset, [0.1, 0.0, -0.2]);
      expect(updated.models.single.mountRotationOffset, [0.0, 90.0, 0.0]);
      expect(updated.models.single.scale, [0.8, 0.8, 0.8]);
    });

    test('parses port component override config wrapper', () {
      final overrides = DigitalTwinSceneConfig.parsePortComponentOverrideConfig(
        '''
        {
          "port_component_overrides": {
          "port_4": {
            "model_1": {
              "position": [0.0, 0.2, -0.1],
              "rotation": [0, 0, 90]
            }
          }
          }
        }
        ''',
      );

      final override = overrides.lookup('port_4', 'model_1');
      expect(override.position, [0.0, 0.2, -0.1]);
      expect(override.rotation, [0.0, 0.0, 90.0]);
      expect(overrides.lookup('port_7', 'model_1').isIdentity, isTrue);
    });
  });

  group('ResponseData', () {
    test('parses backend digital twin scene aliases', () {
      final response = ResponseData.fromJson({
        'type': 'hot_plugging',
        'message': '请插上摄像头',
        'digital_twin_scene': {
          'display_mode': 'multi_scene',
          'base_model_id': 'model_5',
          'models': [
            {
              'id': 'model_5',
              'url': '/assets/assets/models/base.glb',
            },
          ],
        },
      });

      expect(response.type, ResponseType.hotPlugging);
      expect(response.digitalTwinScene, isNotNull);
      expect(response.digitalTwinScene?['base_model_id'], 'model_5');
    });
  });

  group('DigitalTwinMountResolver', () {
    test(
        'rotates mount profile and residual in interface local space before applying',
        () {
      final resolvedLocal = DigitalTwinMountResolver.composeLocalPosition(
        anchorPosition: const <double>[0, -1.72, 0],
        anchorRotation: const <double>[90, 0, 0],
        mountProfilePosition: const <double>[0, 0.52, -1.23],
        portResidualPosition: const <double>[0, 0, 0],
      );

      expect(resolvedLocal[0], closeTo(0.0, 0.001));
      expect(resolvedLocal[1], closeTo(-0.49, 0.001));
      expect(resolvedLocal[2], closeTo(0.52, 0.001));
    });

    test('resolves interface placement using base scale and mount offsets', () {
      final scene = DigitalTwinSceneConfig.fromJson({
        'display_mode': 'multi_scene',
        'base_model_id': 'model_5',
        'interfaces': [
          {
            'id': 'port_1',
            'label': '接口1',
            'kind': 'side',
            'position': [1, 0, 0.5],
            'rotation': [0, 0, 0],
          },
        ],
        'models': [
          {
            'id': 'model_5',
            'url': '/assets/assets/models/base.glb',
            'position': [10, 0, 0],
            'rotation': [0, 0, 0],
            'scale': [2, 2, 2],
            'device_id': 'device-001',
          },
          {
            'id': 'model_2',
            'url': '/assets/assets/models/screen.glb',
            'interface_id': 'port_1',
            'position': [0, 0, 0],
            'rotation': [0, 0, 0],
            'scale': [1, 1, 1],
            'mount_position_offset': [0, 0, 0.5],
            'mount_rotation_offset': [0, 90, 0],
            'device_id': 'screen-001',
          },
        ],
      });
      final bootstrapScene = DigitalTwinSceneConfig.fromJson({
        'display_mode': 'multi_scene',
        'base_model_id': 'model_5',
        'interfaces': [
          {
            'id': 'port_1',
            'label': '接口1',
            'kind': 'side',
            'position': [1, 0, 0.5],
            'rotation': [0, 90, 0],
          },
        ],
        'models': [
          {
            'id': 'model_5',
            'url': '/assets/assets/models/base.glb',
            'position': [10, 0, 0],
            'rotation': [0, 0, 0],
            'scale': [1, 1, 1],
            'device_id': 'device-001',
          },
          {
            'id': 'model_2',
            'url': '/assets/assets/models/screen.glb',
            'interface_id': 'port_1',
            'position': [0, 0, 0],
            'rotation': [0, 0, 0],
            'scale': [1, 1, 1],
            'mount_position_offset': [0, 0, 0.5],
            'mount_rotation_offset': [0, 90, 0],
            'device_id': 'screen-001',
          },
        ],
      });

      final resolved = DigitalTwinMountResolver.resolveScene(
        scene: scene,
        bootstrapScene: bootstrapScene,
      );
      final mounted = resolved.findModelById('model_2')!;

      expect(mounted.position[0], closeTo(12.0, 0.001));
      expect(mounted.position[1], closeTo(0.0, 0.001));
      expect(mounted.position[2], closeTo(2.0, 0.001));
      expect(mounted.rotation[1], closeTo(90.0, 0.001));
    });

    test('applies residual only to the matched port and model pair', () {
      final scene = DigitalTwinSceneConfig.fromJson({
        'display_mode': 'multi_scene',
        'base_model_id': 'model_5',
        'interfaces': [
          {
            'id': 'port_1',
            'label': '接口1',
            'kind': 'side',
            'position': [1, 0, 0],
            'rotation': [0, 0, 0],
          },
          {
            'id': 'port_2',
            'label': '接口2',
            'kind': 'side',
            'position': [2, 0, 0],
            'rotation': [0, 0, 0],
          },
        ],
        'models': [
          {
            'id': 'model_5',
            'url': '/assets/assets/models/base.glb',
            'position': [0, 0, 0],
            'rotation': [0, 0, 0],
            'scale': [1, 1, 1],
            'device_id': 'device-001',
          },
          {
            'id': 'model_1',
            'url': '/assets/assets/models/car.glb',
            'interface_id': 'port_1',
            'position': [0, 0, 0],
            'rotation': [0, 0, 0],
            'mount_position_offset': [0, 0, 0],
            'mount_rotation_offset': [0, 0, 0],
            'device_id': 'car-001',
          },
        ],
      });

      final overrides = DigitalTwinPortComponentOverrideTable.fromJson({
        'port_1': {
          'model_1': {
            'position': [0, 0, 1],
            'rotation': [0, 90, 0],
          },
          'model_2': {
            'position': [99, 99, 99],
            'rotation': [0, 0, 0],
          },
        },
        'port_2': {
          'model_1': {
            'position': [88, 88, 88],
            'rotation': [0, 180, 0],
          },
        },
      });

      final resolved = DigitalTwinMountResolver.resolveScene(
        scene: scene,
        bootstrapScene: scene,
        portComponentOverrides: overrides,
      );
      final mounted = resolved.findModelById('model_1')!;

      expect(mounted.position, [1.0, 0.0, 1.0]);
      expect(mounted.rotation[1], closeTo(90.0, 0.001));
    });

    test('keeps scene unchanged when base model is missing', () {
      final scene = DigitalTwinSceneConfig.fromJson({
        'display_mode': 'multi_scene',
        'base_model_id': 'model_5',
        'interfaces': [
          {
            'id': 'port_1',
            'label': '接口1',
            'kind': 'side',
            'position': [1, 0, 0],
            'rotation': [0, 0, 0],
          },
        ],
        'models': [
          {
            'id': 'model_2',
            'url': '/assets/assets/models/screen.glb',
            'interface_id': 'port_1',
            'position': [1, 2, 3],
            'rotation': [0, 0, 0],
            'device_id': 'screen-001',
          },
        ],
      });

      final resolved = DigitalTwinMountResolver.resolveScene(
        scene: scene,
        bootstrapScene: scene,
      );

      expect(resolved.models.single.position, [1.0, 2.0, 3.0]);
      expect(resolved.models.single.rotation, [0.0, 0.0, 0.0]);
    });
  });

  group('DigitalTwinConfigExport', () {
    test('exports mount profiles and port residuals as config payloads', () {
      final scene = DigitalTwinSceneConfig.fromJson({
        'display_mode': 'multi_scene',
        'base_model_id': 'model_5',
        'models': [
          {
            'id': 'model_5',
            'url': '/assets/assets/models/base.glb',
            'position': [0, 0, 0],
            'rotation': [0, 0, 0],
            'scale': [2.4, 2.4, 2.4],
            'device_id': 'device-001',
          },
          {
            'id': 'model_1',
            'url': '/assets/assets/models/car.glb',
            'interface_id': 'port_1',
            'position': [0, 0, 0],
            'rotation': [0, 0, 0],
            'scale': [0.72, 0.72, 0.72],
            'mount_position_offset': [0.1, 0.0, -0.2],
            'mount_rotation_offset': [0, 90, 0],
            'device_id': 'car-001',
          },
        ],
      });

      final portOverrides = DigitalTwinPortComponentOverrideTable.fromJson({
        'port_1': {
          'model_1': {
            'position': [0.0, 0.2, -0.1],
            'rotation': [0, 0, 15],
          },
        },
      });

      final mountProfiles = scene.exportMountProfilesMap();
      final portResiduals = portOverrides.toConfigMap();

      expect(mountProfiles.keys, ['model_1']);
      expect(mountProfiles['model_1']['position'], [0.1, 0.0, -0.2]);
      expect(mountProfiles['model_1']['rotation'], [0.0, 90.0, 0.0]);
      expect(mountProfiles['model_1']['scale'], [0.72, 0.72, 0.72]);

      expect(
        portResiduals,
        {
          'port_component_overrides': {
            'port_1': {
              'model_1': {
                'position': [0.0, 0.2, -0.1],
                'rotation': [0.0, 0.0, 15.0],
              },
            },
          },
        },
      );
    });
  });
}
