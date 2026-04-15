/// 登录模型
class LoginModel {
  final Map<String, dynamic>? mainMenuItems;
  final Map<String, dynamic>? userInfo; // 用户信息
  
  LoginModel({this.mainMenuItems, this.userInfo});
  
  Map<String, dynamic> toJson() {
    return {
      'mainMenuItems': mainMenuItems,
      'userInfo': userInfo,
    };
  }
  
  factory LoginModel.fromJson(Map<String, dynamic> json) {
    return LoginModel(
      mainMenuItems: json['mainMenuItems'],
      userInfo: json['userInfo'],
    );
  }
}
