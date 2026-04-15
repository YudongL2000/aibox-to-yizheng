import 'package:flutter/material.dart';
import 'package:aitesseract/utils/enum_utils/enum_utils.dart';

class HXNotification extends Notification {
  final HXNotificationType type;
  final Map? notificationParams;
  HXNotification({required this.type,this.notificationParams});
}