import 'package:flutter/material.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:aitesseract/server/api/agent_chat_api.dart';
import 'package:aitesseract/module/home/widget/interaction_modules/select_interaction_widget.dart';
import 'package:aitesseract/module/home/widget/interaction_modules/instruction_text.dart';

/// SelectInteractionWidget 预览页面
/// 用于预览图片中 JSON 数据的渲染效果
class SelectInteractionPreview extends StatelessWidget {
  const SelectInteractionPreview({super.key});

  @override
  Widget build(BuildContext context) {
    // 根据图片中的 JSON 数据创建 Interaction 对象
    final interaction = Interaction(
      id: 'config-screen-emoji-code_screen_execute_empty_angry',
      mode: 'single',
      field: 'screen_emoji',
      title: '请选择屏幕显示表情',
      description: '可选项:开心 / 难过 / 生气 / 平和',
      options: [
        InteractionOption(label: '开心', value: 'Happy'),
        InteractionOption(label: '难过', value: 'Sad'),
        InteractionOption(label: '生气', value: 'Angry'),
        InteractionOption(label: '平和', value: 'Peace'),
      ],
    );

    return Scaffold(
      backgroundColor: context.spatial.palette.bgBase,
      appBar: AppBar(
        title: const Text('SelectInteractionWidget 预览'),
        backgroundColor: context.spatial.surface(SpatialSurfaceTone.panel),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 显示消息文本
            InstructionText(
              text: '这是我构思的工作流逻辑配置阶段,共需配置 10 个组件。\n\n请你选择希望屏幕显示的表情:',
            ),
            const SizedBox(height: 20),
            // 显示 SelectInteractionWidget
            SelectInteractionWidget(
              interaction: interaction,
              onSubmit: (selectedValues) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('已选择: ${selectedValues.join(", ")}'),
                    backgroundColor: context.spatial.palette.semInfo,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
