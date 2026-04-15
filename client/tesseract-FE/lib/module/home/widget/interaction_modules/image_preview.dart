import 'package:flutter/material.dart';
import 'dart:convert';

/// 图片预览组件
class ImagePreview extends StatelessWidget {
  final String? imageUrl;
  final String? imageBase64; // base64图片数据（用于本地预览）
  final String? profile; // 人物名称
  final VoidCallback? onConfirm;
  final VoidCallback? onReselect; // 重新选择图片

  const ImagePreview({
    super.key,
    this.imageUrl,
    this.imageBase64,
    this.profile,
    this.onConfirm,
    this.onReselect,
  });

  @override
  Widget build(BuildContext context) {
    // 参考图4：图片预览卡片 - 圆角 32px、preview-box 120px、渐变主按钮
    const cyan = Color(0xFF00F2FF);
    const blue = Color(0xFF0066FF);
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.02),
              borderRadius: BorderRadius.circular(32),
              border: Border.all(
                color: Colors.white.withOpacity(0.08),
                width: 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  width: double.infinity,
                  height: 120,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: cyan.withOpacity(0.1),
                      width: 1,
                    ),
                  ),
                  child: _buildImageContent(),
                ),
                const SizedBox(height: 20),
                if (onConfirm != null || onReselect != null) ...[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      if (onReselect != null)
                        Expanded(
                          child: OutlinedButton(
                            onPressed: onReselect,
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(
                              color: Colors.white.withOpacity(0.2),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: Text(
                            '重新选择',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.7),
                              fontSize: 13,
                            ),
                          ),
                        ),
                        ),
                      if (onReselect != null && onConfirm != null)
                        const SizedBox(width: 12),
                      if (onConfirm != null)
                        Expanded(
                          flex: onReselect != null ? 2 : 1,
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [blue, cyan],
                                begin: Alignment.centerLeft,
                                end: Alignment.centerRight,
                              ),
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: cyan.withOpacity(0.2),
                                  blurRadius: 20,
                                  offset: const Offset(0, 5),
                                ),
                              ],
                            ),
                            child: ElevatedButton(
                              onPressed: onConfirm,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.transparent,
                                shadowColor: Colors.transparent,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                minimumSize: const Size(double.infinity, 44),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                              child: const Text(
                                '确认并开始特征提取',
                                style: TextStyle(
                                  color: Colors.black,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageContent() {
    // 优先使用网络URL
    if (imageUrl != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.network(
          imageUrl!,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return _buildPlaceholder();
          },
        ),
      );
    }
    
    // 其次使用base64数据
    if (imageBase64 != null) {
      try {
        // 提取base64字符串（去掉data:image/xxx;base64,前缀）
        String base64String = imageBase64!;
        if (base64String.contains(',')) {
          base64String = base64String.split(',').last;
        }
        final bytes = base64Decode(base64String);
        return ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.memory(
            bytes,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return _buildPlaceholder();
            },
          ),
        );
      } catch (e) {
        return _buildPlaceholder();
      }
    }
    
    // 都没有则显示占位符
    return _buildPlaceholder();
  }

  Widget _buildPlaceholder() {
    return Center(
      child: Text(
        'PREVIEW_IMAGE',
        style: TextStyle(
          color: const Color(0xFF00F2FF).withOpacity(0.3),
          fontSize: 10,
          letterSpacing: 2,
        ),
      ),
    );
  }
}
