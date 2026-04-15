/*
 * [INPUT]: 依赖 flutter_test、Spatial theme 与 WorkflowDetailsWidget。
 * [OUTPUT]: 对外提供 workflow 详情卡片回归测试，覆盖空白明细过滤与 CTA 紧贴标题布局。
 * [POS]: test 的 widget 级回归，防止 workflow 标题和 CTA 之间重新出现无意义留白。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:aitesseract/module/home/widget/interaction_modules/workflow_details_widget.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'puts CTA directly under title when workflow details are blank',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: SpatialDesignTheme.dark(),
          home: Scaffold(
            body: WorkflowDetailsWidget(
              details: const <String, String>{
                '人物名称': '   ',
                '动作手势': '',
              },
              onContinue: () {},
              onConfirm: () {},
            ),
          ),
        ),
      );

      final titleFinder = find.text('WORKFLOW SPEC');
      final buttonFinder = find.byType(OutlinedButton);

      expect(titleFinder, findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is RichText && widget.text.toPlainText().contains('人物名称:'),
        ),
        findsNothing,
      );
      expect(buttonFinder, findsOneWidget);

      final titleBottom = tester.getBottomLeft(titleFinder).dy;
      final buttonTop = tester.getTopLeft(buttonFinder).dy;
      expect(buttonTop - titleBottom, lessThanOrEqualTo(28));
    },
  );
}
