import 'package:aitesseract/module/login/model/login_model.dart';

class User {
  User._privateConstructor();

  static final User _instance = User._privateConstructor();

  static User get instance {
    return _instance;
  }

  bool isEdit = true;

  LoginModel? loginModel;
  static bool isInit = false;
}
