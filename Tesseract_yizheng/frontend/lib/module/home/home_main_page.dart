/*
 * [INPUT]: 依赖 HomeWorkspacePage 与随宿主 theme 切换的 Spatial token。
 * [OUTPUT]: 对外提供 HomeMainPage 首页入口，以更直接的低圆角单层 prompt composer 和案例带承接 Flutter 默认 landing shell，并只保留最轻的 grid backdrop。
 * [POS]: module/home 的首页壳层，位于 Splash 或登录跳转之后，是进入数字
 * 孪生工作台、设备页与作品集的首个显式入口。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:async';

import 'package:aitesseract/module/home/home_workspace_page.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:flutter/material.dart';

class HomeMainPage extends StatefulWidget {
  const HomeMainPage({super.key});

  @override
  State<HomeMainPage> createState() => _HomeMainPageState();
}

class _HomeMainPageState extends State<HomeMainPage> {
  static const Duration _autoScrollTick = Duration(milliseconds: 50);
  static const double _autoScrollStep = 1;

  final TextEditingController _promptController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  Timer? _scrollTimer;

  bool _isThinkingMode = true;

  final List<WorkflowCase> _workflowCases = const <WorkflowCase>[
    WorkflowCase(
      title: '情感交互',
      prompt: '做一个看到我伤心会安慰我的机器人',
      systemTag: 'EMOTION LOOP',
      icon: Icons.favorite_rounded,
      tone: SpatialStatusTone.neural,
    ),
    WorkflowCase(
      title: '猜拳游戏',
      prompt: '做一个和我玩石头剪刀布的桌面机器人',
      systemTag: 'GAMEPLAY',
      icon: Icons.sports_esports_rounded,
      tone: SpatialStatusTone.info,
    ),
    WorkflowCase(
      title: '定时提醒',
      prompt: '做一个到点播放音乐并提醒我起身活动的设备',
      systemTag: 'SCHEDULED TASK',
      icon: Icons.schedule_rounded,
      tone: SpatialStatusTone.warning,
    ),
    WorkflowCase(
      title: '循环任务',
      prompt: '做一个每隔 30 分钟自动晃动逗猫棒的装置',
      systemTag: 'LOOPED MOTION',
      icon: Icons.autorenew_rounded,
      tone: SpatialStatusTone.success,
    ),
    WorkflowCase(
      title: '个性化手势',
      prompt: '做一个看到我就比 V 手势打招呼的机器人',
      systemTag: 'CUSTOM GESTURE',
      icon: Icons.waving_hand_rounded,
      tone: SpatialStatusTone.danger,
    ),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startAutoScroll());
  }

  @override
  void dispose() {
    _promptController.dispose();
    _scrollController.dispose();
    _scrollTimer?.cancel();
    super.dispose();
  }

  void _startAutoScroll() {
    _scrollTimer?.cancel();
    _scrollTimer = Timer.periodic(_autoScrollTick, (_) {
      if (!_scrollController.hasClients) {
        return;
      }

      final double maxScroll = _scrollController.position.maxScrollExtent;
      if (maxScroll <= 0) {
        return;
      }

      final double halfScroll = maxScroll / 2;
      final double nextOffset = _scrollController.offset + _autoScrollStep;
      if (nextOffset >= halfScroll) {
        _scrollController.jumpTo(nextOffset - halfScroll);
        return;
      }

      _scrollController.jumpTo(nextOffset);
    });
  }

  void _navigateToWorkspace({
    String? promptText,
    HomeWorkspaceInitialSurface initialSurface =
        HomeWorkspaceInitialSurface.digitalTwin,
  }) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => HomeWorkspacePage(
          promptText: promptText,
          showAssistantPanel: true,
          openInDialogueMode: true,
          initialSurface: initialSurface,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    final Size size = MediaQuery.of(context).size;
    final bool isCompact = size.width < 840;
    final double horizontalPadding =
        size.width >= 1080 ? spatial.space6 : spatial.space4;

    return Scaffold(
      backgroundColor: spatial.palette.bgBase,
      body: SafeArea(
        child: ListView(
          padding: EdgeInsets.fromLTRB(
            horizontalPadding,
            spatial.space4,
            horizontalPadding,
            spatial.space5,
          ),
          children: <Widget>[
            _buildPromptPanel(spatial: spatial, isCompact: isCompact),
            SizedBox(height: spatial.space4),
            _buildWorkflowCaseSection(
              spatial: spatial,
              isCompact: isCompact,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPromptPanel({
    required SpatialThemeData spatial,
    required bool isCompact,
  }) {
    final Color infoTone = spatial.status(SpatialStatusTone.info);

    return Container(
      padding: EdgeInsets.all(spatial.space4),
      decoration: spatial.dataBlockDecoration(
        accent: infoTone,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          TextField(
            controller: _promptController,
            maxLines: 5,
            minLines: 4,
            style: spatial.bodyTextStyle(),
            cursorColor: infoTone,
            decoration: InputDecoration(
              border: InputBorder.none,
              filled: false,
              hintText: '例如：做一个看到我就走过来打招呼的机器人',
              hintStyle:
                  spatial.bodyTextStyle().copyWith(color: spatial.textMuted),
              isCollapsed: true,
            ),
          ),
          SizedBox(height: spatial.space4),
          if (isCompact)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                _buildThinkingToggle(spatial: spatial),
              ],
            )
          else
            _buildThinkingToggle(spatial: spatial),
          SizedBox(height: spatial.space3),
          Wrap(
            spacing: spatial.space3,
            runSpacing: spatial.space3,
            children: <Widget>[
              FilledButton.icon(
                onPressed: () {
                  _navigateToWorkspace(
                    promptText: _promptController.text.trim().isEmpty
                        ? null
                        : _promptController.text.trim(),
                    initialSurface: HomeWorkspaceInitialSurface.workflow,
                  );
                },
                style: spatial.primaryButtonStyle(accent: infoTone),
                icon: const Icon(Icons.arrow_forward_rounded),
                label: const Text('生成 Workflow'),
              ),
              OutlinedButton.icon(
                onPressed: () => _navigateToWorkspace(
                  promptText: _promptController.text.trim().isEmpty
                      ? null
                      : _promptController.text.trim(),
                ),
                style: spatial.secondaryButtonStyle(accent: infoTone),
                icon: const Icon(Icons.grid_view_rounded),
                label: const Text('打开 Digital Twin'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildThinkingToggle({required SpatialThemeData spatial}) {
    final Color activeColor = spatial.status(SpatialStatusTone.info);

    return Row(
      children: <Widget>[
        Text(
          'THINKING',
          style: spatial.monoTextStyle(
            color: _isThinkingMode ? activeColor : spatial.textMuted,
            size: 10,
            letterSpacing: 1.5,
          ),
        ),
        SizedBox(width: spatial.space3),
        GestureDetector(
          onTap: () => setState(() => _isThinkingMode = !_isThinkingMode),
          child: AnimatedContainer(
            duration: spatial.motionBase,
            width: 54,
            height: 30,
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: _isThinkingMode
                  ? activeColor.withValues(alpha: 0.18)
                  : spatial.surface(SpatialSurfaceTone.muted),
              borderRadius: BorderRadius.circular(spatial.radiusMd),
              border: Border.all(
                color: _isThinkingMode
                    ? activeColor.withValues(alpha: 0.38)
                    : spatial.borderSubtle,
              ),
            ),
            child: Align(
              alignment: _isThinkingMode
                  ? Alignment.centerRight
                  : Alignment.centerLeft,
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: _isThinkingMode
                      ? activeColor
                      : spatial.palette.textSecondary,
                  borderRadius: BorderRadius.circular(spatial.radiusSm),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildWorkflowCaseSection({
    required SpatialThemeData spatial,
    required bool isCompact,
  }) {
    final List<WorkflowCase> duplicatedCases = <WorkflowCase>[
      ..._workflowCases,
      ..._workflowCases,
    ];

    return SizedBox(
      height: isCompact ? 212 : 196,
      child: SingleChildScrollView(
        controller: _scrollController,
        scrollDirection: Axis.horizontal,
        physics: const NeverScrollableScrollPhysics(),
        child: Row(
          children: duplicatedCases.map((WorkflowCase item) {
            return Padding(
              padding: EdgeInsets.only(right: spatial.space3),
              child: SizedBox(
                width: isCompact ? 280 : 300,
                child: _buildWorkflowCard(spatial: spatial, caseItem: item),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildWorkflowCard({
    required SpatialThemeData spatial,
    required WorkflowCase caseItem,
  }) {
    final Color tone = spatial.status(caseItem.tone);

    return InkWell(
      onTap: () => _navigateToWorkspace(
        promptText: caseItem.prompt,
        initialSurface: HomeWorkspaceInitialSurface.workflow,
      ),
      borderRadius: BorderRadius.circular(spatial.radiusLg),
      child: Ink(
        decoration: spatial.dataBlockDecoration(accent: tone),
        child: Padding(
          padding: EdgeInsets.all(spatial.space4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(spatial.radiusMd),
                      color: tone.withValues(alpha: 0.12),
                      border: Border.all(color: tone.withValues(alpha: 0.24)),
                    ),
                    child: Icon(caseItem.icon, color: tone),
                  ),
                  const Spacer(),
                  Text(
                    caseItem.systemTag,
                    style: spatial.monoTextStyle(
                      color: tone,
                      size: 10,
                      letterSpacing: 1.5,
                    ),
                  ),
                ],
              ),
              SizedBox(height: spatial.space4),
              Text(
                caseItem.title,
                style: spatial.sectionTextStyle(),
              ),
              const Spacer(),
              Container(
                width: double.infinity,
                padding: EdgeInsets.symmetric(
                  horizontal: spatial.space3,
                  vertical: spatial.space3,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(spatial.radiusMd),
                  border: Border.all(color: spatial.borderSubtle),
                  color: spatial.surface(SpatialSurfaceTone.muted),
                ),
                child: Text(
                  caseItem.prompt,
                  style: spatial.bodyTextStyle(),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class WorkflowCase {
  const WorkflowCase({
    required this.title,
    required this.prompt,
    required this.systemTag,
    required this.icon,
    required this.tone,
  });

  final String title;
  final String prompt;
  final String systemTag;
  final IconData icon;
  final SpatialStatusTone tone;
}
