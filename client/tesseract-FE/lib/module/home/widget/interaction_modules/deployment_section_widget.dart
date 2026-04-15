import 'package:flutter/material.dart';

import 'interaction_utils.dart';

/// 部署区域组件
class DeploymentSectionWidget extends StatelessWidget {
  final String question;
  final String cancelText;
  final String confirmText;
  final VoidCallback? onCancel;
  final VoidCallback? onConfirm;
  /// 是否已经完成部署
  final bool isDeployed;

  /// 是否处于部署中
  final bool isDeploying;

  /// 交互按钮区域最大宽度（如 1/4 内容区宽度）
  final double? maxButtonWidth;

  const DeploymentSectionWidget({
    super.key,
    this.question = '是否启动一键同步,部署至硬件终端?',
    this.cancelText = '暂不部署',
    this.confirmText = '一键部署到硬件',
    this.onCancel,
    this.onConfirm,
    this.isDeployed = false,
    this.isDeploying = false,
    this.maxButtonWidth,
  });

  @override
  Widget build(BuildContext context) {
    // 参考图8：部署确认 - 深青绿卡片、“一键同步”高亮、暂不部署边框 + 一键部署到硬件青色
    const cyan = Color(0xFF00CED1);
    final bool disabled = isDeployed || isDeploying;
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
        decoration: BoxDecoration(
          color: const Color(0xFF0F2E24).withOpacity(0.1),
          borderRadius: BorderRadius.circular(32),
          border: Border.all(
            color: const Color(0xFF10B981).withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildQuestionRichText(
              question,
              isDeployed: isDeployed,
            ),
            const SizedBox(height: 20),
            _buildButtonRow(cyan, disabled),
          ],
        ),
      ),
    );
  }

  Widget _buildButtonRow(Color cyan, bool disabled) {
    final row = Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: isDeployed ? null : onCancel,
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: Colors.white.withOpacity(0.2)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      cancelText,
                      style: TextStyle(
                        color: Colors.white.withOpacity(
                          isDeployed ? 0.4 : 0.8,
                        ),
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: disabled ? null : onConfirm,
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          isDeployed ? Colors.grey : (isDeploying ? cyan : cyan),
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      isDeployed
                          ? '已部署'
                          : (isDeploying ? '部署中...' : confirmText),
                      style: TextStyle(
                        color: disabled ? Colors.white : Colors.black,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              ],
            );
    if (maxButtonWidth != null) {
      // 按当前显示标题测量：左 cancelText，右随状态变化
      final confirmTitle = isDeployed
          ? '已部署'
          : (isDeploying ? '部署中...' : confirmText);
      final leftW = measureButtonTitleWidth(cancelText, fontSize: 12);
      final rightW = measureButtonTitleWidth(confirmTitle, fontSize: 12);
      final singleMin = (leftW > rightW ? leftW : rightW) + 5;
      final rowMin = 2 * singleMin + 16;
      final minW = rowMin.clamp(0.0, maxButtonWidth!);
      return Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minWidth: minW,
            maxWidth: maxButtonWidth!,
          ),
          child: row,
        ),
      );
    }
    return Center(child: row);
  }

  /// 将问题中的「一键同步」高亮为青色
  Widget _buildQuestionRichText(
    String q, {
    required bool isDeployed,
  }) {
    const cyan = Color(0xFF00CED1);
    final span = '一键同步';
    final idx = q.indexOf(span);
    if (idx < 0) {
      return Text(
        q,
        style: TextStyle(
          color: const Color(0xFF9CA3AF)
              .withOpacity(isDeployed ? 0.5 : 1.0),
          fontSize: 13,
          height: 1.5,
        ),
      );
    }
    return RichText(
      text: TextSpan(
        style: const TextStyle(
          color: Color(0xFF9CA3AF),
          fontSize: 13,
          height: 1.5,
        ),
        children: [
          TextSpan(text: q.substring(0, idx)),
          const TextSpan(
            text: '一键同步',
            style: TextStyle(
              color: Color(0xFF00CED1),
              fontWeight: FontWeight.w700,
            ),
          ),
          TextSpan(text: q.substring(idx + span.length)),
        ],
      ),
    );
  }
}
