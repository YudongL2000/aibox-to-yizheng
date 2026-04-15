import 'package:flutter/material.dart';

import 'interaction_utils.dart';

/// 工作流详情组件
class WorkflowDetailsWidget extends StatelessWidget {
  final Map<String, String> details;
  final VoidCallback? onContinue;
  final VoidCallback? onConfirm;
  /// 是否已完成「确认构建工作流」
  final bool isCreated;

  /// 是否处于「构建中」加载状态
  final bool isCreating;

  /// 交互按钮区域最大宽度（如 1/4 内容区宽度）
  final double? maxButtonWidth;

  const WorkflowDetailsWidget({
    super.key,
    required this.details,
    this.onContinue,
    this.onConfirm,
    this.isCreated = false,
    this.isCreating = false,
    this.maxButtonWidth,
  });

  @override
  Widget build(BuildContext context) {
    // 参考图7：构建卡片 - logic-summary-card 圆角 36px、列表、继续交流边框 + 确认渐变
    const cyan = Color(0xFF00F2FF);
    const blue = Color(0xFF0066FF);
    final bool disabled = isCreated || isCreating;
    final Color borderColor =
        isCreated ? Colors.white.withOpacity(0.08) : cyan.withOpacity(0.2);
    final Color bgColor = isCreated
        ? const Color(0xFF0D1324).withOpacity(0.6)
        : const Color(0xFF0D1324).withOpacity(0.85);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        // 和 BlueprintSummaryWidget 一样整体缩小：padding / 圆角减半
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: borderColor,
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            ...details.entries
                .map((entry) => _buildDetailItem(entry.key, entry.value)),
            const SizedBox(height: 10),
            _buildButtonRow(),
          ],
        ),
      ),
    );
  }

  Widget _buildButtonRow() {
    const cyan = Color(0xFF00F2FF);
    const blue = Color(0xFF0066FF);
    final disabled = isCreated || isCreating;
    final row = Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onContinue,
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: Colors.white.withOpacity(0.1)),
                      padding: const EdgeInsets.symmetric(vertical: 7),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      '继续交流',
                      style: TextStyle(
                        color: Colors.white.withOpacity(isCreated ? 0.5 : 0.8),
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: isCreated
                            ? [
                                Colors.grey.shade700,
                                Colors.grey.shade500,
                              ]
                            : [blue, cyan],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: cyan.withOpacity(0.2),
                          blurRadius: 20,
                          offset: const Offset(0, 5),
                        ),
                      ],
                    ),
                    child: ElevatedButton(
                      onPressed: disabled ? null : onConfirm,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        padding: const EdgeInsets.symmetric(vertical: 7),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        isCreated
                            ? (isCreating ? '构建中...' : '已创建工作流')
                            : (isCreating ? '构建中...' : '确认构建工作流'),
                        style: TextStyle(
                          color: disabled
                              ? Colors.white.withOpacity(0.9)
                              : Colors.black,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            );
    if (maxButtonWidth != null) {
      // 按当前显示标题测量：左「继续交流」，右随状态变化
      final leftW = measureButtonTitleWidth('继续交流', fontSize: 9);
      final rightTitle = isCreated
          ? (isCreating ? '构建中...' : '已创建工作流')
          : (isCreating ? '构建中...' : '确认构建工作流');
      final rightW = measureButtonTitleWidth(rightTitle, fontSize: 9);
      final singleMin = (leftW > rightW ? leftW : rightW) + 5;
      final rowMin = 2 * singleMin + 8;
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

  Widget _buildDetailItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(right: 8, top: 1),
            child: Text(
              '•',
              style: TextStyle(
                color: Colors.white,
                fontSize: 9,
                height: 1.4,
              ),
            ),
          ),
          Expanded(
            child: RichText(
              text: TextSpan(
                children: [
                  TextSpan(
                    text: '$label: ',
                    style: TextStyle(
                      color: const Color(0xFF9CA3AF),
                      fontSize: 9,
                      height: 1.4,
                    ),
                  ),
                  TextSpan(
                    text: value,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.9),
                      fontSize: 9,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
