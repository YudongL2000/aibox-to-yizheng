import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:flutter/material.dart';

/*
 * [INPUT]: 首屏占位型的作品集/市场页面，承接首页导航，提供卡片列表、筛选与按钮入口。
 * [OUTPUT]: 对外提供 HomeMyProductPage，展示作品集与市场内容，并保持极简卡片页结构。
 * [POS]: module/home 下首页衍生页，沿用 spatial 语义层，避免硬编码色值。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

class HomeMyProductPage extends StatefulWidget {
  const HomeMyProductPage({super.key});

  @override
  State<HomeMyProductPage> createState() => _HomeMyProductPageState();
}

class _HomeMyProductPageState extends State<HomeMyProductPage> {
  String _selectedFilter = 'ALL';

  final List<ProjectCard> _myProjects = [
    ProjectCard(
      title: '智能迎宾小车项目',
      lastEdited: '2025年12月20日',
      tags: ['5 Modules', 'RTOS'],
      isLive: true,
      version: 'V10',
    ),
    ProjectCard(
      title: '未命名作品 02',
      lastEdited: '2025年12月18日',
      tags: [],
      isLive: false,
    ),
    ProjectCard(
      title: '宠物AI陪伴魔盒',
      lastEdited: '2025年8月28日',
      tags: [],
      isLive: false,
    ),
    ProjectCard(
      title: '全息天气站',
      lastEdited: '2025年8月14日',
      tags: [],
      isLive: false,
    ),
  ];

  final List<MarketCard> _marketItems = [
    MarketCard(
      title: '边缘AI监控终端方案',
      creator: 'Ludwig_User',
      views: '3.3k',
      likes: 98,
      isNew: true,
    ),
    MarketCard(
      title: '全向移动底盘算法模组',
      creator: 'Andy_Dev',
      views: '1.2k',
      likes: 240,
      isNew: false,
    ),
    MarketCard(
      title: '手势识别库 v1.0 (轻量版)',
      creator: 'Sensor_Lab',
      views: '890',
      likes: 42,
      isNew: false,
    ),
    MarketCard(
      title: '智能语音互动回复节点',
      creator: 'VoiceAI_01',
      views: '2.1k',
      likes: 112,
      isNew: false,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;

    return Scaffold(
      backgroundColor: spatial.palette.bgBase,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: EdgeInsets.symmetric(
                  horizontal: spatial.space5,
                  vertical: spatial.space2,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(height: spatial.space5),
                    _buildMyProjectsSection(spatial),
                    SizedBox(height: spatial.space6),
                    _buildMarketSection(spatial),
                    SizedBox(height: spatial.space4),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMyProjectsSection(SpatialThemeData spatial) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '我的作品集',
          style: spatial.sectionTextStyle(),
        ),
        SizedBox(height: spatial.space3),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 5,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 0.75,
          ),
          itemCount: _myProjects.length + 1,
          itemBuilder: (context, index) {
            if (index == 0) {
              return _buildNewProjectCard(spatial);
            }
            return _buildProjectCard(_myProjects[index - 1], spatial);
          },
        ),
      ],
    );
  }

  Widget _buildNewProjectCard(SpatialThemeData spatial) {
    final Color accent = spatial.status(SpatialStatusTone.info);

    return GestureDetector(
      onTap: () {
        // TODO: 创建新项目
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: spatial.dataBlockDecoration(accent: accent),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.add,
                color: accent,
                size: 32,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'NEW PROJECT',
              style: spatial.monoTextStyle(
                color: accent,
                size: 10,
                letterSpacing: 1,
                weight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProjectCard(ProjectCard project, SpatialThemeData spatial) {
    final Color accent = spatial.status(SpatialStatusTone.info);
    final Color successTone = spatial.status(SpatialStatusTone.success);

    return GestureDetector(
      onTap: () {
        // TODO: 打开项目详情
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: spatial.dataBlockDecoration(accent: accent),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (project.isLive)
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: successTone.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: successTone,
                        width: 1,
                      ),
                    ),
                    child: Text(
                      '${project.version} LIVE',
                      style: spatial.monoTextStyle(
                        color: successTone,
                        size: 9,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
            if (project.isLive) const SizedBox(height: 12),
            Text(
              project.title,
              style: spatial.bodyTextStyle().copyWith(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const Spacer(),
            Text(
              project.lastEdited,
              style: spatial.captionTextStyle(),
            ),
            const SizedBox(height: 8),
            if (project.tags.isNotEmpty)
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: project.tags.map((tag) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      tag,
                      style: spatial.monoTextStyle(
                        color: accent,
                        size: 10,
                      ),
                    ),
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMarketSection(SpatialThemeData spatial) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '市场/社区',
          style: spatial.sectionTextStyle(),
        ),
        SizedBox(height: spatial.space3),
        Row(
          children: [
            _buildFilterButton('ALL', spatial),
            const SizedBox(width: 12),
            _buildFilterButton('感知类', spatial),
            const SizedBox(width: 12),
            _buildFilterButton('执行类', spatial),
            const SizedBox(width: 12),
            _buildFilterButton('创意案例', spatial),
            const SizedBox(width: 12),
            _buildFilterButton('逻辑模组', spatial),
          ],
        ),
        SizedBox(height: spatial.space3),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 0.8,
          ),
          itemCount: _marketItems.length,
          itemBuilder: (context, index) {
            return _buildMarketCard(_marketItems[index], spatial);
          },
        ),
        SizedBox(height: spatial.space3),
        Center(
          child: GestureDetector(
            onTap: () {
              // TODO: 加载更多
            },
            child: _buildLoadMoreButton(spatial),
          ),
        ),
      ],
    );
  }

  Widget _buildFilterButton(String text, SpatialThemeData spatial) {
    final bool isSelected = _selectedFilter == text;
    final Color accent = spatial.status(SpatialStatusTone.info);
    final Color borderColor = isSelected
        ? accent.withValues(alpha: 0.5)
        : spatial.borderSubtle.withValues(alpha: 0.8);

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedFilter = text;
        });
      },
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: spatial.space3,
          vertical: spatial.space2,
        ),
        decoration: BoxDecoration(
          color: isSelected
              ? accent.withValues(alpha: 0.18)
              : spatial.surface(SpatialSurfaceTone.muted).withValues(alpha: 0),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: borderColor, width: 1),
        ),
        child: Text(
          text,
          style: spatial.bodyTextStyle().copyWith(
                color: isSelected
                    ? spatial.palette.textPrimary
                    : spatial.textMuted,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
        ),
      ),
    );
  }

  Widget _buildLoadMoreButton(SpatialThemeData spatial) {
    final Color accent = spatial.status(SpatialStatusTone.info);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
      decoration: BoxDecoration(
        color: spatial.surface(SpatialSurfaceTone.elevated),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: accent.withValues(alpha: 0.32),
          width: 1,
        ),
      ),
      child: Text(
        'LOAD MORE ARCHIVES',
        style: spatial.monoTextStyle(
          color: accent,
          size: 10,
          letterSpacing: 1,
          weight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildMarketCard(MarketCard item, SpatialThemeData spatial) {
    final Color accent = spatial.status(SpatialStatusTone.info);
    final Color warnTone = spatial.status(SpatialStatusTone.warning);

    return GestureDetector(
      onTap: () {
        // TODO: 打开市场项目详情
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: spatial.dataBlockDecoration(accent: accent),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  item.views,
                  style: spatial.captionTextStyle(),
                ),
                Row(
                  children: [
                    if (item.isNew)
                      Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 4, vertical: 2),
                        decoration: BoxDecoration(
                          color: accent.withValues(alpha: 0.15),
                          border: Border.all(color: accent),
                        ),
                        child: Text(
                          'NEW',
                          style: TextStyle(
                            color: accent,
                            fontSize: 8,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    Icon(
                      Icons.favorite,
                      color: warnTone,
                      size: 16,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${item.likes}',
                      style: spatial.captionTextStyle(),
                    ),
                  ],
                ),
              ],
            ),
            const Spacer(),
            Text(
              item.title,
              style: spatial.bodyTextStyle().copyWith(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),
            Text(
              item.creator,
              style: spatial.captionTextStyle(),
            ),
          ],
        ),
      ),
    );
  }
}

// 项目卡片数据模型
class ProjectCard {
  final String title;
  final String lastEdited;
  final List<String> tags;
  final bool isLive;
  final String? version;

  ProjectCard({
    required this.title,
    required this.lastEdited,
    required this.tags,
    this.isLive = false,
    this.version,
  });
}

// 市场卡片数据模型
class MarketCard {
  final String title;
  final String creator;
  final String views;
  final int likes;
  final bool isNew;

  MarketCard({
    required this.title,
    required this.creator,
    required this.views,
    required this.likes,
    this.isNew = false,
  });
}
