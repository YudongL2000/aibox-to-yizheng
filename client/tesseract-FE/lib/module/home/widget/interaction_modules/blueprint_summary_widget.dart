import 'package:flutter/material.dart';

import 'interaction_utils.dart';

/// 蓝图摘要组件
/// 用于显示summary_ready类型的响应，展示blueprint信息
class BlueprintSummaryWidget extends StatelessWidget {
  final String? intentSummary;
  final List<String>? missingFields;
  final List<Map<String, dynamic>>? triggers;
  final List<Map<String, dynamic>>? logic;
  final List<Map<String, dynamic>>? executors;
  final VoidCallback? onContinue; // 继续交流
  final VoidCallback? onConfirm; // 确认构建
  /// 是否已经完成构建，用于更新文案状态
  final bool isBuilt;
  /// 交互按钮区域最大宽度（如 1/4 内容区宽度）
  final double? maxButtonWidth;

  const BlueprintSummaryWidget({
    super.key,
    this.intentSummary,
    this.missingFields,
    this.triggers,
    this.logic,
    this.executors,
    this.onContinue,
    this.onConfirm,
    this.isBuilt = false,
    this.maxButtonWidth,
  });

  @override
  Widget build(BuildContext context) {
    // 与图7 构建卡片风格一致：圆角 36px、边框、继续交流 + 确认构建渐变
    const cyan = Color(0xFF00F2FF);
    const blue = Color(0xFF0066FF);
    final Color borderColor =
        isBuilt ? Colors.white.withOpacity(0.08) : cyan.withOpacity(0.2);
    final Color bgColor = isBuilt
        ? const Color(0xFF0D1324).withOpacity(0.6)
        : const Color(0xFF0D1324).withOpacity(0.85);
    final Color titleColor =
        isBuilt ? Colors.white.withOpacity(0.7) : Colors.white;

    return Container(
      // 总体缩小：内边距减半、圆角减半
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
        children: [
          Text(
            isBuilt ? '蓝图已构建' : '蓝图摘要',
            style: TextStyle(
              color: titleColor,
              fontSize: 11, // 字号 ≈ 80%
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          if (intentSummary != null && intentSummary!.isNotEmpty) ...[
            _buildSection('意图摘要', intentSummary!, isBuilt),
            const SizedBox(height: 6),
          ],
          if (triggers != null && triggers!.isNotEmpty) ...[
            _buildSection('触发器', '${triggers!.length} 个触发器', isBuilt),
            const SizedBox(height: 6),
          ],
          if (logic != null && logic!.isNotEmpty) ...[
            _buildSection('逻辑节点', '${logic!.length} 个逻辑节点', isBuilt),
            const SizedBox(height: 6),
          ],
          if (executors != null && executors!.isNotEmpty) ...[
            _buildSection('执行器', '${executors!.length} 个执行器', isBuilt),
            const SizedBox(height: 6),
          ],
          if (missingFields != null && missingFields!.isNotEmpty) ...[
            _buildSection('缺失字段', missingFields!.join(', '), isBuilt),
          ],
          if (onContinue != null || onConfirm != null) ...[
            const SizedBox(height: 10),
            _buildButtonRow(cyan, blue, isBuilt),
          ],
        ],
      ),
    );
  }

  Widget _buildButtonRow(Color cyan, Color blue, bool isBuilt) {
    final row = Row(
              children: [
                if (onContinue != null)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: onContinue,
                      style: OutlinedButton.styleFrom(
                        side:
                            BorderSide(color: Colors.white.withOpacity(0.1)),
                        padding: const EdgeInsets.symmetric(vertical: 7),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        '继续交流',
                        style: TextStyle(
                          color: Colors.white.withOpacity(isBuilt ? 0.5 : 0.8),
                          fontSize: 9, // 字号缩小为约 80%
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                if (onContinue != null && onConfirm != null)
                  const SizedBox(width: 8),
                if (onConfirm != null)
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: isBuilt
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
                        onPressed: isBuilt ? null : onConfirm,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          padding: const EdgeInsets.symmetric(vertical: 7),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          isBuilt ? '已构建' : '确认构建',
                          style: TextStyle(
                            color: isBuilt
                                ? Colors.white.withOpacity(0.8)
                                : Colors.black,
                            fontSize: 9, // 字号缩小
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            );
    if (maxButtonWidth != null) {
      // 按当前显示标题测量：左「继续交流」，右 isBuilt ?「已构建」:「确认构建」
      final leftW = measureButtonTitleWidth('继续交流', fontSize: 9);
      final rightTitle = isBuilt ? '已构建' : '确认构建';
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

  Widget _buildSection(String label, String value, bool isBuilt) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 40,
          child: Text(
            '$label:',
            style: TextStyle(
              color: Colors.white.withOpacity(isBuilt ? 0.4 : 0.6),
              fontSize: 9, // 字号缩小
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              color: Colors.white.withOpacity(isBuilt ? 0.6 : 1.0),
              fontSize: 9, // 字号缩小
            ),
          ),
        ),
      ],
    );
  }
}
