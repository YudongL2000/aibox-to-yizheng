import 'dart:async';

import 'package:aitesseract/module/device/model/device_action_model.dart';
import 'package:aitesseract/server/api/dialogue_mode_models.dart';
import 'package:aitesseract/server/hardware_bridge/hardware_bridge_models.dart';
import 'package:aitesseract/server/hardware_bridge/hardware_bridge_service.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeHardwareBridgeSource implements HardwareBridgeSource {
  final DialogueModeHardwareSource kind;
  final bool connectResult;
  final StreamController<HardwareBridgeEvent> _eventController =
      StreamController<HardwareBridgeEvent>.broadcast();
  bool _connected = false;
  String? _lastError;
  DeviceActionPayload? lastPublishedPayload;

  _FakeHardwareBridgeSource({
    required this.kind,
    required this.connectResult,
  });

  @override
  DialogueModeHardwareSource get source => kind;

  @override
  Stream<HardwareBridgeEvent> get events => _eventController.stream;

  @override
  bool get isConnected => _connected;

  @override
  String? get lastError => _lastError;

  @override
  Future<bool> connect() async {
    _connected = connectResult;
    _lastError = connectResult ? null : 'connect failed';
    return connectResult;
  }

  @override
  Future<void> disconnect() async {
    _connected = false;
  }

  @override
  Future<bool> publishAction(DeviceActionPayload payload) async {
    lastPublishedPayload = payload;
    return connectResult;
  }

  void emit(HardwareBridgeEvent event) {
    _eventController.add(event);
  }

  Future<void> dispose() async {
    await _eventController.close();
  }
}

void main() {
  test('DialogueModeEnvelope parses nested dialogueMode envelope', () {
    final envelope = DialogueModeEnvelope.tryParse(<String, dynamic>{
      'dialogueMode': <String, dynamic>{
        'branch': 'hardware_guidance',
        'phase': 'ready_to_deploy',
        'skill': <String, dynamic>{
          'skillId': 'skill_rps',
          'displayName': '石头剪刀布',
          'matchStatus': 'matched',
          'confidence': 0.97,
          'gameplayGuide': '你先出拳，我会识别后马上回应。',
          'requiredHardware': <Map<String, dynamic>>[
            <String, dynamic>{
              'componentId': 'camera',
              'displayName': '摄像头',
              'requiredCapability': 'vision',
              'acceptablePorts': <String>['port_7'],
              'requiredModelIds': <String>['cam-001'],
              'isOptional': false,
            },
          ],
          'initialPhysicalCue': <String, dynamic>{
            'action': 'hand_stretch',
            'autoTrigger': true,
            'targetComponentId': 'mechanical_hand',
          },
        },
        'hardware': <String, dynamic>{
          'source': 'mqtt_proxy',
          'connectedComponents': <Map<String, dynamic>>[
            <String, dynamic>{
              'componentId': 'camera',
              'deviceId': 'cam-001',
              'modelId': 'cam-001',
              'displayName': '摄像头',
              'portId': 'port_7',
              'status': 'ready',
            },
          ],
          'missingRequirements': <Map<String, dynamic>>[],
          'validationStatus': 'success',
          'lastEventType': 'snapshot',
          'lastEventAt': '2026-04-01T10:30:00.000Z',
        },
        'uiActions': <Map<String, dynamic>>[
          <String, dynamic>{
            'id': 'start_deploy',
            'label': '开始部署',
            'kind': 'primary',
            'enabled': true,
          },
        ],
        'physicalCue': <String, dynamic>{
          'action': 'hand_stretch',
          'autoTrigger': true,
          'targetComponentId': 'mechanical_hand',
        },
        'deploymentPrompt': <String, dynamic>{
          'visible': true,
          'status': 'visible',
          'message': '点击开始部署即可进入交互',
        },
      },
    });

    expect(envelope, isNotNull);
    expect(envelope!.branch, DialogueModeBranch.hardwareGuidance);
    expect(envelope.phase, DialogueModePhase.readyToDeploy);
    expect(envelope.skill?.skillId, 'skill_rps');
    expect(envelope.hardware.validationStatus,
        DialogueModeHardwareValidationStatus.success);
    expect(envelope.uiActions, hasLength(1));
    expect(envelope.deploymentPrompt?.visible, isTrue);
  });

  test('HardwareBridgeEvent normalizes mqtt snapshot payload', () {
    final event = HardwareBridgeEvent.fromMqttPayload(
      '''
      {
        "session_id": "sess_1",
        "target_id": "0",
        "timestamp": "2026-04-01T10:30:00.000Z",
        "device_info": [
          {
            "port_id": "port_2",
            "status": "plug_in",
            "device_id": "hand-001",
            "device_type": "mechanical_hand",
            "notes": {
              "display_name": "机械手",
              "component_id": "mechanical_hand",
              "model_id": "claw-v1"
            }
          },
          {
            "port_id": "port_7",
            "status": "plug_in",
            "device_id": "cam-001",
            "device_type": "camera",
            "notes": {
              "display_name": "摄像头",
              "component_id": "camera",
              "model_id": "cam-001"
            }
          }
        ]
      }
      ''',
    );

    expect(event.source, DialogueModeHardwareSource.mqttProxy);
    expect(event.eventType, DialogueModeHardwareEventType.snapshot);
    expect(event.connectedComponents, hasLength(2));
    expect(event.connectedComponents.first.componentId, 'mechanical_hand');
    expect(event.connectedComponents.first.displayName, '机械手');
  });

  test('HardwareBridgeEvent validation json keeps full connectedComponents and port ids', () {
    final event = HardwareBridgeEvent.fromMqttPayload(
      '''
      {
        "timestamp": "2026-04-01T10:30:00.000Z",
        "device_info": [
          {
            "port_id": "port_2",
            "status": "plug_in",
            "device_id": "hand-001",
            "device_type": "mechanical_hand",
            "notes": {
              "display_name": "机械手",
              "component_id": "mechanical_hand",
              "model_id": "claw-v1"
            }
          },
          {
            "port_id": "port_7",
            "status": "plug_in",
            "device_id": "cam-001",
            "device_type": "camera",
            "notes": {
              "display_name": "摄像头",
              "component_id": "camera",
              "model_id": "cam-001"
            }
          }
        ]
      }
      ''',
    );

    final payload = event.toValidationJson();
    final components =
        payload['connectedComponents'] as List<Map<String, dynamic>>;

    expect(components, hasLength(2));
    expect(components.first['portId'], 'port_2');
    expect(components.last['portId'], 'port_7');
  });

  test('HardwareBridgeService prefers first working source and forwards state',
      () async {
    final miniclaw = _FakeHardwareBridgeSource(
      kind: DialogueModeHardwareSource.miniclawWs,
      connectResult: false,
    );
    final mqtt = _FakeHardwareBridgeSource(
      kind: DialogueModeHardwareSource.mqttProxy,
      connectResult: true,
    );
    final service = HardwareBridgeService(
      sources: <HardwareBridgeSource>[miniclaw, mqtt],
    );

    addTearDown(() async {
      service.dispose();
      await miniclaw.dispose();
      await mqtt.dispose();
    });

    final connected = await service.connect();
    expect(connected, isTrue);
    expect(service.activeSource?.source, DialogueModeHardwareSource.mqttProxy);

    final event = HardwareBridgeEvent(
      source: DialogueModeHardwareSource.mqttProxy,
      eventType: DialogueModeHardwareEventType.deviceInserted,
      timestamp: DateTime.parse('2026-04-01T10:30:00.000Z'),
      component: const HardwareBridgeComponent(
        componentId: 'mechanical_hand',
        deviceId: 'hand-001',
        modelId: 'claw-v1',
        displayName: '机械手',
        portId: 'port_2',
        status: DialogueModeHardwareComponentStatus.connected,
      ),
      connectedComponents: const <HardwareBridgeComponent>[
        HardwareBridgeComponent(
          componentId: 'mechanical_hand',
          deviceId: 'hand-001',
          modelId: 'claw-v1',
          displayName: '机械手',
          portId: 'port_2',
          status: DialogueModeHardwareComponentStatus.connected,
        ),
      ],
      raw: const <String, dynamic>{'device_id': 'hand-001'},
    );

    final eventExpectation = expectLater(
      service.events,
      emits(
        isA<HardwareBridgeEvent>()
            .having((value) => value.eventType, 'eventType',
                DialogueModeHardwareEventType.deviceInserted)
            .having(
              (value) => value.component?.componentId,
              'componentId',
              'mechanical_hand',
            ),
      ),
    );

    mqtt.emit(event);
    await eventExpectation;

    expect(service.state.connectedComponents, hasLength(1));
    expect(service.state.connectedComponents.single.componentId,
        'mechanical_hand');
    expect(service.state.lastEvent?.eventType,
        DialogueModeHardwareEventType.deviceInserted);
  });

  test('HardwareBridgeService dispatches physical cue to connected component',
      () async {
    final mqtt = _FakeHardwareBridgeSource(
      kind: DialogueModeHardwareSource.mqttProxy,
      connectResult: true,
    );
    final service = HardwareBridgeService(
      sources: <HardwareBridgeSource>[mqtt],
    );

    addTearDown(() async {
      service.dispose();
      await mqtt.dispose();
    });

    await service.connect();
    mqtt.emit(
      HardwareBridgeEvent(
        source: DialogueModeHardwareSource.mqttProxy,
        eventType: DialogueModeHardwareEventType.deviceInserted,
        timestamp: DateTime.parse('2026-04-01T10:30:00.000Z'),
        component: const HardwareBridgeComponent(
          componentId: 'mechanical_hand',
          deviceId: 'hand-001',
          modelId: 'claw-v1',
          displayName: '机械手',
          portId: 'port_2',
          status: DialogueModeHardwareComponentStatus.connected,
        ),
        connectedComponents: const <HardwareBridgeComponent>[
          HardwareBridgeComponent(
            componentId: 'mechanical_hand',
            deviceId: 'hand-001',
            modelId: 'claw-v1',
            displayName: '机械手',
            portId: 'port_2',
            status: DialogueModeHardwareComponentStatus.connected,
          ),
        ],
        raw: const <String, dynamic>{},
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 1));

    final dispatched = await service.dispatchPhysicalCue(
      const DialogueModePhysicalCue(
        action: DialogueModePhysicalAction.handStretch,
        autoTrigger: true,
        targetComponentId: 'mechanical_hand',
      ),
      sessionId: 'sess_dialogue',
    );

    expect(dispatched, isTrue);
    expect(mqtt.lastPublishedPayload, isNotNull);
    expect(mqtt.lastPublishedPayload!.sessionId, 'sess_dialogue');
    expect(mqtt.lastPublishedPayload!.action.single.portId, 'port_2');
    expect(
      mqtt.lastPublishedPayload!.action.single.commands?['action'],
      'hand_stretch',
    );
  });
}
