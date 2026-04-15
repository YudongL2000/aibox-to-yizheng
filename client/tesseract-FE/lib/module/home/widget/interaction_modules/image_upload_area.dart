import 'package:flutter/material.dart';

/// 图片上传区域组件
class ImageUploadArea extends StatelessWidget {
  final VoidCallback? onTap;

  const ImageUploadArea({
    super.key,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // 参考图3：上传区域 - 虚线边框、圆角 32px、中央大加号
    const cyan = Color(0xFF00F2FF);
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: double.infinity,
          height: 200,
          decoration: BoxDecoration(
            color: cyan.withOpacity(0.01),
            borderRadius: BorderRadius.circular(32),
            border: Border.all(
              color: cyan.withOpacity(0.3),
              width: 1,
              style: BorderStyle.solid,
            ),
          ),
          child: Center(
            child: Text(
              '+',
              style: TextStyle(
                color: cyan.withOpacity(0.4),
                fontSize: 48,
                fontWeight: FontWeight.w300,
                height: 1,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
