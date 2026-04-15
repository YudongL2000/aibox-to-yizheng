/*
 * [INPUT]: 依赖首页视觉组件、HomeWorkspacePage/HomeMyProductPage/DeviceListPage/VideoStreamPage 导航入口。
 * [OUTPUT]: 对外提供 HomeMainPage 首页，负责把用户从入口 prompt 导向教学/对话工作台。
 * [POS]: module/home 的首页壳层，位于 Splash 之后，是进入数字孪生工作台与对话模式的主要起点。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'dart:async';

import 'package:aitesseract/module/device/device_list_page.dart';
import 'package:aitesseract/module/home/home_my_product_page.dart';
import 'package:aitesseract/module/video_stream/video_stream_page.dart';
import 'package:aitesseract/module/home/home_workspace_page.dart';
import 'package:aitesseract/utils/colorUtils/color_util.dart';
import 'package:flutter/material.dart';

class HomeMainPage extends StatefulWidget {
  const HomeMainPage({super.key});

  @override
  State<HomeMainPage> createState() => _HomeMainPageState();
}

class _HomeMainPageState extends State<HomeMainPage> {
  bool _isThinkingMode = true;
  final TextEditingController _promptController = TextEditingController();
  int _selectedNavIndex = -1; // 首页不选中任何tab
  final ScrollController _scrollController = ScrollController();
  Timer? _scrollTimer;

  @override
  void initState() {
    super.initState();
    // 延迟启动自动滚动，等待布局完成
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startAutoScroll();
    });
  }

  @override
  void dispose() {
    _promptController.dispose();
    _scrollController.dispose();
    _scrollTimer?.cancel();
    super.dispose();
  }

  // 启动自动滚动
  void _startAutoScroll() {
    _scrollTimer = Timer.periodic(const Duration(milliseconds: 50), (timer) {
      if (_scrollController.hasClients) {
        final maxScroll = _scrollController.position.maxScrollExtent;
        final currentScroll = _scrollController.offset;

        // 从右向左滚动（增加 offset）
        double newOffset = currentScroll + 1.0;

        // 当滚动到第一个列表的末尾时（maxScroll / 2），无缝重置到开头
        // 这样用户看不到跳跃，实现无缝循环
        final halfScroll = maxScroll / 2;
        if (newOffset >= halfScroll) {
          _scrollController.jumpTo(newOffset - halfScroll);
        } else {
          _scrollController.jumpTo(newOffset);
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E1A), // 深色背景
      body: SafeArea(
        child: Stack(
          children: [
            // 主要内容区域
            Column(
              children: [
                // Header部分
                _buildHeader(),

                const Spacer(),
                // 下方模块 - 等间距排列
                _buildNeuralWorkflowCases(screenWidth),
                const SizedBox(height: 40),
              ],
            ),
            // 对话框 - 屏幕正中心
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildMainTitle(),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: screenWidth * 0.5,
                    child: _buildPromptBox(),
                  ),
                  const SizedBox(height: 220),
                ],
              ),
            ),
            // 左上角下方的两个按钮
            Positioned(
              left: 24,
              top: 100, // Header下方
              child: Column(
                children: [
                  _buildActionButton(
                    'assets/images/add.png',
                  ),
                  const SizedBox(height: 12),
                  _buildActionButton(
                    'assets/images/set.png',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Header部分
  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Row(
        children: [
          // 左侧Logo
          Row(
            children: [
              // 六边形图标
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: const Color(0xFF00D9FF), // 青色边框
                    width: 2,
                  ),
                ),
                child: const Icon(
                  Icons.add,
                  color: Color(0xFF00D9FF),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'MAGI CORE V1.0',
                    style: TextStyle(
                      color: Color(0xFF00D9FF),
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1,
                    ),
                  ),
                  Text(
                    'NEXUS SYSTEM',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.6),
                      fontSize: 12,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
            ],
          ),
          // 中间导航按钮 - 屏幕正上方中间
          Expanded(
            child: Center(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildNavButton('市场/社区', 0),
                  const SizedBox(width: 12),
                  _buildNavButton('工作空间', 1),
                  const SizedBox(width: 12),
                  _buildNavButton('我的作品集', 2),
                ],
              ),
            ),
          ),
          Opacity(
            opacity: 0,
            child: Row(
              children: [
                // 六边形图标
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFF00D9FF), // 青色边框
                      width: 2,
                    ),
                  ),
                  child: const Icon(
                    Icons.add,
                    color: Color(0xFF00D9FF),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'MAGI CORE V1.0',
                      style: TextStyle(
                        color: Color(0xFF00D9FF),
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                    Text(
                      'NEXUS SYSTEM',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.6),
                        fontSize: 12,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  // 左上角操作按钮
  Widget _buildActionButton(
    String imagePath1,
  ) {
    final isSet = imagePath1.contains('set');
    final isAdd = imagePath1.contains('add');
    return GestureDetector(
      onTap: () {
        if (isSet) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const DeviceListPage(),
            ),
          );
        } else if (isAdd) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const VideoStreamPage(),
            ),
          );
        }
      },
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03), // 白色背景，透明度0.03
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: ColorsUtil.hexColor(0xffffff, alpha: 0.03),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              imagePath1,
              width: 24,
              height: 24,
            ),
          ],
        ),
      ),
    );
  }

  // 导航按钮
  Widget _buildNavButton(String text, int index) {
    final isSelected = _selectedNavIndex == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedNavIndex = index;
        });
        // 导航到对应页面
        if (index == 1) {
          // 工作空间
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const HomeWorkspacePage(
                showAssistantPanel: true,
                openInDialogueMode: true,
              ),
            ),
          );
        } else if (index == 2) {
          // 我的作品集
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const HomeMyProductPage(),
            ),
          );
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF2563EB).withOpacity(0.2) // 选中：背景色2563EB，透明度0.2
              : Colors.white.withOpacity(0.03), // 非选中：背景色白色，透明度0.03
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF3B82F6)
                    .withOpacity(0.5) // 选中：边框颜色3B82F6，透明度0.5
                : Colors.white.withOpacity(0.1), // 非选中：边框颜色白色，透明度0.1
            width: 1,
          ),
        ),
        child: Text(
          text,
          style: TextStyle(
            color: isSelected
                ? const Color(0xFF60A5FA) // 选中：文字颜色3B82F6，透明度0.5
                : Colors.white, // 非选中：文字颜色白色
            fontSize: 14,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  // 主标题 - 居中
  Widget _buildMainTitle() {
    return Text.rich(
      TextSpan(
        children: [
          // "一句话，让" - 白色
          const TextSpan(
            text: '一句话，让',
            style: TextStyle(
              color: Colors.white,
              fontSize: 50,
              fontWeight: FontWeight.bold,
              height: 1.2,
            ),
          ),
          // "想法动起来" - 蓝色渐变
          WidgetSpan(
            alignment: PlaceholderAlignment.baseline,
            baseline: TextBaseline.alphabetic,
            child: ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                colors: [
                  Color(0xFF60A5FA), // 浅蓝色
                  Color(0xFF3B82F6), // 深蓝色
                ],
              ).createShader(bounds),
              child: const Text(
                '想法动起来',
                style: TextStyle(
                  color: Colors.white, // 这个颜色会被渐变覆盖
                  fontSize: 50,
                  fontWeight: FontWeight.bold,
                  height: 1.2,
                ),
              ),
            ),
          ),
        ],
      ),
      textAlign: TextAlign.center,
    );
  }

  // AI提示输入框
  Widget _buildPromptBox() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF151923),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFF00D9FF).withOpacity(0.3),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF00D9FF).withOpacity(0.1),
            blurRadius: 20,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 顶部栏：左侧三个圆点 + 右侧AI_PROMPT_V1.0
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // 左侧三个圆点（窗口控制按钮样式）
              Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFF5F57),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    width: 12,
                    height: 12,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFFBD2E),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    width: 12,
                    height: 12,
                    decoration: const BoxDecoration(
                      color: Color(0xFF28CA42),
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ),
              // 右侧AI_PROMPT_V1.0标签
              Text(
                'AI_PROMPT_V1.0',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.5),
                  fontSize: 12,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // 输入框区域：箭头 + 提示文本
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // 蓝色箭头图标
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: const Icon(
                  Icons.arrow_forward,
                  color: Color(0xFF00D9FF),
                  size: 20,
                ),
              ),
              const SizedBox(width: 8),
              // 输入框
              Expanded(
                child: TextField(
                  controller: _promptController,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    height: 1.5,
                  ),
                  textAlignVertical: TextAlignVertical.center,
                  decoration: InputDecoration(
                    hintText: '描述你的AI硬件想法... 例如：\'做一个看到我就走过来打招呼的机器人\'',
                    hintStyle: TextStyle(
                      color: const Color(0xFF9CA3AF),
                      fontSize: 16,
                      height: 1.5,
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                    isDense: true,
                  ),
                  maxLines: 3,
                  minLines: 1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // 底部：左侧Thinking模式 + 右侧Model信息 + 右下角提交按钮
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // 左侧：Thinking模式
              Row(
                children: [
                  Text(
                    'Thinking 模式',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.7),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _isThinkingMode = !_isThinkingMode;
                      });
                    },
                    child: Container(
                      width: 44,
                      height: 24,
                      decoration: BoxDecoration(
                        color: _isThinkingMode
                            ? const Color(0xFF00D9FF)
                            : Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Stack(
                        children: [
                          AnimatedPositioned(
                            duration: const Duration(milliseconds: 200),
                            curve: Curves.easeInOut,
                            left: _isThinkingMode ? 22 : 2,
                            top: 2,
                            child: Container(
                              width: 20,
                              height: 20,
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              // 右侧：Model信息 + 提交按钮
              Row(
                children: [
                  Text(
                    'MODEL: GPT-40-HARDWARE',
                    style: TextStyle(
                      color: const Color(0xFF00D9FF),
                      fontSize: 12,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(width: 16),
                  // 提交按钮（右下角）
                  GestureDetector(
                    onTap: () {
                      // 导航到工作空间页面
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => HomeWorkspacePage(
                            promptText: _promptController.text,
                            showAssistantPanel: true,
                            openInDialogueMode: true,
                          ),
                        ),
                      );
                    },
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFF00D9FF),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF00D9FF).withOpacity(0.5),
                            blurRadius: 12,
                            spreadRadius: 0,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.arrow_forward,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 神经网络工作流案例 - 从右向左自动循环滚动
  Widget _buildNeuralWorkflowCases(double screenWidth) {
    // 为了无缝循环，复制列表内容
    final duplicatedCases = [..._workflowCases, ..._workflowCases];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'EXPLORE NEURAL WORKFLOW CASES',
            style: TextStyle(
              color: Colors.white.withOpacity(0.3),
              fontSize: 12,
              letterSpacing: 2,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 24),
          // 水平滚动的卡片列表
          SizedBox(
            height: 190,
            child: SingleChildScrollView(
              controller: _scrollController,
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(), // 禁用手动滚动
              child: Row(
                children: duplicatedCases.map((caseItem) {
                  return Container(
                    width: 300,
                    height: 190,
                    margin: const EdgeInsets.only(right: 16),
                    child: _buildWorkflowCard(caseItem),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 工作流卡片
  Widget _buildWorkflowCard(WorkflowCase caseItem) {
    return GestureDetector(
      onTap: () {
        // TODO: 处理卡片点击
      },
      child: Container(
        width: 300,
        height: 190,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF151923),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: const Color(0xFF00D9FF).withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            // 图标
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: const Color(0xFF00D9FF).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Image.asset(caseItem.iconPath),
            ),
            const SizedBox(height: 16),
            // 标题
            Text(
              caseItem.title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            // 描述
            Text(
              caseItem.description,
              style: TextStyle(
                color: Colors.white.withOpacity(0.6),
                fontSize: 12,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 工作流案例数据
  final List<WorkflowCase> _workflowCases = [
    WorkflowCase(
      iconPath: "assets/images/motion.png",
      title: '情感交互',
      description: '"看到我伤心安慰我"',
      customIcon: _buildEmotionalIcon,
    ),
    WorkflowCase(
      iconPath: "assets/images/game.png",
      title: '猜拳游戏',
      description: '"和我玩石头剪刀布"',
      customIcon: _buildRockPaperScissorsIcon,
    ),
    WorkflowCase(
      iconPath: "assets/images/time.png",
      title: '定时提醒',
      description: '"到了x点播放音乐"',
      customIcon: _buildTimerIcon,
    ),
    WorkflowCase(
      iconPath: "assets/images/loop.png",
      title: '循环任务',
      description: '"每隔30分钟晃动逗猫棒"',
      customIcon: _buildLoopIcon,
    ),
    WorkflowCase(
      iconPath: "assets/images/gesture.png",
      title: '个性化手势交互',
      description: '"见到我比个V打招呼"',
      customIcon: _buildGestureIcon,
    ),
  ];

  // 自定义图标构建器
  static Widget _buildEmotionalIcon() {
    return CustomPaint(
      size: const Size(24, 24),
      painter: EmotionalIconPainter(),
    );
  }

  static Widget _buildRockPaperScissorsIcon() {
    return CustomPaint(
      size: const Size(24, 24),
      painter: RockPaperScissorsIconPainter(),
    );
  }

  static Widget _buildTimerIcon() {
    return CustomPaint(
      size: const Size(24, 24),
      painter: TimerIconPainter(),
    );
  }

  static Widget _buildLoopIcon() {
    return CustomPaint(
      size: const Size(24, 24),
      painter: LoopIconPainter(),
    );
  }

  static Widget _buildGestureIcon() {
    return CustomPaint(
      size: const Size(24, 24),
      painter: GestureIconPainter(),
    );
  }
}

// 工作流案例数据模型
class WorkflowCase {
  final String iconPath;
  final String title;
  final String description;
  final Widget Function()? customIcon;

  WorkflowCase({
    required this.iconPath,
    required this.title,
    required this.description,
    this.customIcon,
  });
}

// 自定义图标绘制器
class EmotionalIconPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF00D9FF)
      ..style = PaintingStyle.fill;

    // 绘制心形
    final path = Path();
    final centerX = size.width / 2;
    final centerY = size.height / 2;
    path.moveTo(centerX, centerY + 4);
    path.cubicTo(centerX - 6, centerY - 2, centerX - 8, centerY - 6, centerX,
        centerY - 8);
    path.cubicTo(centerX + 8, centerY - 6, centerX + 6, centerY - 2, centerX,
        centerY + 4);
    canvas.drawPath(path, paint);

    // 绘制眼睛（两个点）
    final eyePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(centerX - 3, centerY - 4), 1.5, eyePaint);
    canvas.drawCircle(Offset(centerX + 3, centerY - 4), 1.5, eyePaint);

    // 绘制嘴巴（小曲线）
    final mouthPath = Path();
    mouthPath.moveTo(centerX - 2, centerY);
    mouthPath.quadraticBezierTo(centerX, centerY + 1, centerX + 2, centerY);
    final mouthPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    canvas.drawPath(mouthPath, mouthPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class RockPaperScissorsIconPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF00D9FF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final centerX = size.width / 2;
    final centerY = size.height / 2;
    final boxSize = 8.0;

    // 中间的正方形
    canvas.drawRect(
      Rect.fromCenter(
          center: Offset(centerX, centerY), width: boxSize, height: boxSize),
      paint,
    );

    // 加号
    canvas.drawLine(
      Offset(centerX, centerY - 2),
      Offset(centerX, centerY + 2),
      paint,
    );
    canvas.drawLine(
      Offset(centerX - 2, centerY),
      Offset(centerX + 2, centerY),
      paint,
    );

    // 左侧小正方形
    canvas.drawRect(
      Rect.fromCenter(
          center: Offset(centerX - 6, centerY),
          width: boxSize - 2,
          height: boxSize - 2),
      paint,
    );

    // 右侧小正方形
    canvas.drawRect(
      Rect.fromCenter(
          center: Offset(centerX + 6, centerY),
          width: boxSize - 2,
          height: boxSize - 2),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class TimerIconPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF00D9FF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final centerX = size.width / 2;
    final centerY = size.height / 2;
    final radius = 8.0;

    // 绘制圆形（时钟）
    canvas.drawCircle(Offset(centerX, centerY), radius, paint);

    // 绘制指针
    canvas.drawLine(
      Offset(centerX, centerY),
      Offset(centerX, centerY - 4),
      paint,
    );
    canvas.drawLine(
      Offset(centerX, centerY),
      Offset(centerX + 3, centerY + 2),
      paint,
    );

    // 绘制圆形箭头（循环）
    final arrowPath = Path();
    arrowPath.addArc(
      Rect.fromCircle(center: Offset(centerX, centerY), radius: radius + 2),
      -0.5,
      2.5,
    );
    arrowPath.lineTo(centerX + radius + 2, centerY - 2);
    arrowPath.lineTo(centerX + radius + 2, centerY + 2);
    arrowPath.close();
    canvas.drawPath(arrowPath, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class LoopIconPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF00D9FF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final centerX = size.width / 2;
    final centerY = size.height / 2;
    final radius = 8.0;

    // 绘制圆形箭头
    final path = Path();
    path.addArc(
      Rect.fromCircle(center: Offset(centerX, centerY), radius: radius),
      0.5,
      5.0,
    );
    // 箭头头部
    path.lineTo(centerX + radius - 1, centerY - 3);
    path.lineTo(centerX + radius + 2, centerY);
    path.lineTo(centerX + radius - 1, centerY + 3);
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class GestureIconPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF00D9FF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final centerX = size.width / 2;
    final centerY = size.height / 2;

    // 绘制V字手势（简化版）
    // 拇指
    canvas.drawLine(
      Offset(centerX - 4, centerY + 4),
      Offset(centerX - 2, centerY),
      paint,
    );
    // 食指和中指（V字）
    canvas.drawLine(
      Offset(centerX - 2, centerY),
      Offset(centerX, centerY - 4),
      paint,
    );
    canvas.drawLine(
      Offset(centerX + 2, centerY),
      Offset(centerX, centerY - 4),
      paint,
    );
    // 手掌
    canvas.drawLine(
      Offset(centerX - 4, centerY + 4),
      Offset(centerX + 4, centerY + 4),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
