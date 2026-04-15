import 'package:flutter/material.dart';

/// 工作流确认组件
/// 用于显示workflow_ready类型的响应，展示workflow信息并确认构建
class WorkflowConfirmWidget extends StatelessWidget {
  final String? workflowName;
  final int? nodeCount;
  final Map<String, dynamic>? workflowData;
  final VoidCallback? onConfirm;
  final VoidCallback? onCancel;

  const WorkflowConfirmWidget({
    super.key,
    this.workflowName,
    this.nodeCount,
    this.workflowData,
    this.onConfirm,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0E1A),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: const Color(0xFF00D9FF).withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '工作流构建确认',
            style: TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          if (workflowName != null && workflowName!.isNotEmpty) ...[
            _buildDetailItem('工作流名称', workflowName!),
            const SizedBox(height: 8),
          ],
          if (nodeCount != null) ...[
            _buildDetailItem('节点数量', '$nodeCount'),
            const SizedBox(height: 8),
          ],
          if (workflowData != null) ...[
            _buildDetailItem('工作流ID', workflowData!['id']?.toString() ?? ''),
            const SizedBox(height: 8),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: onCancel,
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                      color: Colors.white.withOpacity(0.3),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: Text(
                    '取消',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.7),
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: onConfirm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00D9FF),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text(
                    '确认构建工作流',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDetailItem(String label, String value) {
    return Row(
      children: [
        Text(
          '$label: ',
          style: TextStyle(
            color: Colors.white.withOpacity(0.6),
            fontSize: 12,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}
