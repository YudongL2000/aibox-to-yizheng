import 'package:aitesseract/utils/environment/environment_utils.dart';

 HXPrint(Object? object) {
  if (EnvironmentUtils.instance.isInDebugMode) {
    print(object);
  }

}