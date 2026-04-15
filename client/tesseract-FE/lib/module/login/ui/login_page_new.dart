/*
 * [INPUT]: 依赖 HomeMainPage 的主页面跳转、LoginApi 的账号登录能力、HXCache 的会话缓存。
 * [OUTPUT]: 对外提供 LoginPageNew 组件，负责收集用户名密码并完成登录后跳转。
 * [POS]: login/ui 的 Web 风格登录入口，承接用户凭据输入，不再内置固定账号密码。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:aitesseract/module/home/home_main_page.dart';
import 'package:aitesseract/module/login/model/login_model.dart';
import 'package:aitesseract/server/api/login_api.dart';
import 'package:aitesseract/utils/cache/cache_manager.dart';
import 'package:flutter/material.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';

/// 登录页面
class LoginPageNew extends StatefulWidget {
  const LoginPageNew({super.key});

  @override
  State<LoginPageNew> createState() => _LoginPageNewState();
}

class _LoginPageNewState extends State<LoginPageNew> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final FocusNode _usernameFocusNode = FocusNode();
  final FocusNode _passwordFocusNode = FocusNode();
  bool _obscurePassword = true;
  bool _isLoading = false;
  final LoginApi _loginApi = LoginApi();


  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _usernameFocusNode.dispose();
    _passwordFocusNode.dispose();
    super.dispose();
  }

  /// 处理登录
  Future<void> _handleLogin() async {
    if (_isLoading) return;

    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();
    if (username.isEmpty || password.isEmpty) {
      EasyLoading.showError('请输入用户名和密码');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      EasyLoading.show(status: '登录中...');

      // 调用登录接口
      final loginResponse = await _loginApi.loginWithPassword(
        username: username,
        password: password,
      );

      if (loginResponse == null) {
        EasyLoading.dismiss();
        EasyLoading.showError('登录失败，请重试');
        setState(() {
          _isLoading = false;
        });
        return;
      }

      // 缓存登录数据
      HXCache.instance.saveToken(loginResponse.token);
      HXCache.instance.saveN8nCookie(loginResponse.n8nCookie);
      HXCache.instance.saveN8nSetCookies(loginResponse.n8nSetCookies);

      // 调用获取用户信息接口
      final userInfo = await _loginApi.getUserInfo();

      if (userInfo == null) {
        EasyLoading.dismiss();
        EasyLoading.showError('获取用户信息失败');
        // 清除已保存的token
        HXCache.instance.removeToken();
        setState(() {
          _isLoading = false;
        });
        return;
      }

      // 保存用户信息
      final loginModel = LoginModel(userInfo: userInfo);
      HXCache.instance.storeUserInfo(loginModel);

      EasyLoading.dismiss();
      EasyLoading.showSuccess('登录成功');

      // 跳转到主页
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const HomeMainPage()),
        );
      }
    } catch (e) {
      EasyLoading.dismiss();
      EasyLoading.showError('登录失败: ${e.toString()}');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E1A),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo和标题区域
                  _buildHeader(),
                  const SizedBox(height: 48),

                  // 登录表单
                  _buildLoginForm(),
                  const SizedBox(height: 32),

                  // 登录按钮
                  _buildLoginButton(),
                  const SizedBox(height: 24),

                  // 其他操作
                  _buildFooter(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// 构建头部区域
  Widget _buildHeader() {
    return Column(
      children: [
        // Logo图标或文字
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: const Color(0xFF00D9FF).withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFF00D9FF).withOpacity(0.3),
              width: 2,
            ),
          ),
          child: const Icon(
            Icons.account_circle_outlined,
            size: 48,
            color: Color(0xFF00D9FF),
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'MAGI CORE',
          style: TextStyle(
            color: Colors.white,
            fontSize: 32,
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '欢迎回来',
          style: TextStyle(
            color: Colors.white.withOpacity(0.6),
            fontSize: 16,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }

  /// 构建登录表单
  Widget _buildLoginForm() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF151923),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFF00D9FF).withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 用户名输入框
          _buildTextField(
            controller: _usernameController,
            focusNode: _usernameFocusNode,
            label: '用户名',
            hintText: '请输入用户名',
            prefixIcon: Icons.person_outline,
            textInputAction: TextInputAction.next,
            onSubmitted: (_) {
              _passwordFocusNode.requestFocus();
            },
          ),
          const SizedBox(height: 20),

          // 密码输入框
          _buildTextField(
            controller: _passwordController,
            focusNode: _passwordFocusNode,
            label: '密码',
            hintText: '请输入密码',
            prefixIcon: Icons.lock_outline,
            obscureText: _obscurePassword,
            textInputAction: TextInputAction.done,
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
                color: Colors.white.withOpacity(0.6),
                size: 20,
              ),
              onPressed: () {
                setState(() {
                  _obscurePassword = !_obscurePassword;
                });
              },
            ),
            onSubmitted: (_) {
              _handleLogin();
            },
          ),
        ],
      ),
    );
  }

  /// 构建输入框
  Widget _buildTextField({
    required TextEditingController controller,
    required FocusNode focusNode,
    required String label,
    required String hintText,
    required IconData prefixIcon,
    bool obscureText = false,
    TextInputAction textInputAction = TextInputAction.next,
    Widget? suffixIcon,
    ValueChanged<String>? onSubmitted,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withOpacity(0.8),
            fontSize: 14,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF1A1F2E),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: focusNode.hasFocus
                  ? const Color(0xFF00D9FF).withOpacity(0.5)
                  : const Color(0xFF00D9FF).withOpacity(0.1),
              width: 1,
            ),
          ),
          child: TextField(
            controller: controller,
            focusNode: focusNode,
            obscureText: obscureText,
            textInputAction: textInputAction,
            onSubmitted: onSubmitted,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: TextStyle(
                color: Colors.white.withOpacity(0.4),
                fontSize: 14,
              ),
              prefixIcon: Icon(
                prefixIcon,
                color: focusNode.hasFocus
                    ? const Color(0xFF00D9FF)
                    : Colors.white.withOpacity(0.6),
                size: 20,
              ),
              suffixIcon: suffixIcon,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
            ),
            cursorColor: const Color(0xFF00D9FF),
          ),
        ),
      ],
    );
  }

  /// 构建登录按钮
  Widget _buildLoginButton() {
    return GestureDetector(
      onTap: _isLoading ? null : _handleLogin,
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          gradient: _isLoading
              ? null
              : const LinearGradient(
                  colors: [Color(0xFF00D9FF), Color(0xFF00B8D4)],
                ),
          color: _isLoading ? const Color(0xFF00D9FF).withOpacity(0.5) : null,
          borderRadius: BorderRadius.circular(8),
          boxShadow: _isLoading
              ? null
              : [
                  BoxShadow(
                    color: const Color(0xFF00D9FF).withOpacity(0.3),
                    blurRadius: 12,
                    spreadRadius: 0,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        child: Center(
          child: _isLoading
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : const Text(
                  '登录',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
        ),
      ),
    );
  }

  /// 构建底部区域
  Widget _buildFooter() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        TextButton(
          onPressed: () {
            // TODO: 忘记密码
            EasyLoading.showInfo('忘记密码功能待实现');
          },
          child: Text(
            '忘记密码？',
            style: TextStyle(
              color: const Color(0xFF00D9FF).withOpacity(0.8),
              fontSize: 14,
            ),
          ),
        ),
        Text(
          '|',
          style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 14),
        ),
        TextButton(
          onPressed: () {
            // TODO: 注册
            EasyLoading.showInfo('注册功能待实现');
          },
          child: Text(
            '注册账号',
            style: TextStyle(
              color: const Color(0xFF00D9FF).withOpacity(0.8),
              fontSize: 14,
            ),
          ),
        ),
      ],
    );
  }
}
