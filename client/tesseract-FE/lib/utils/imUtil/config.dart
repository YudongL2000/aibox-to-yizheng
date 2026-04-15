import 'package:aitesseract/utils/environment/environment_utils.dart';

class ImConfig {
  static int imAppid = (EnvironmentUtils.currentEnvironment == 4 ||
          EnvironmentUtils.currentEnvironment == 3)
      ? 1400132017
      : 1400090454;
}
