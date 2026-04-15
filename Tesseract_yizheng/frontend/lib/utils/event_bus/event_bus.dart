import 'package:event_bus/event_bus.dart';
import 'package:aitesseract/utils/enum_utils/enum_utils.dart';

// 创建EventBus
EventBus eventBus = EventBus();

// event 监听
class EventFn {
  EventType? eventType;
  ActionType? actionType;
  dynamic data;
  EventFn(this.eventType, {this.actionType, this.data});
}
