import 'package:flutter/material.dart';

class LoginInput extends StatefulWidget {
  final String? title;
  final String? hit;
  final ValueChanged<String>? onChange;
  final ValueChanged<bool>? focusChange;
  final bool? lineStretch;
  final bool? obscureText;
  final TextInputType? inputType;
  const LoginInput(
      {Key? key,
      this.title,
      this.hit,
      this.onChange,
      this.focusChange,
      this.lineStretch = false,
      this.obscureText = false,
      this.inputType})
      : super(key: key);

  @override
  State<LoginInput> createState() => _LoginInputState();
}

class _LoginInputState extends State<LoginInput> {
  final _focusNode = FocusNode();

  @override
  initState() {
    super.initState();
    _focusNode.addListener(() {
      print("has focus ${_focusNode.hasFocus}");
      widget.focusChange?.call(_focusNode.hasFocus);
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return const Placeholder();
  }
}
