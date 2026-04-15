import 'package:flutter/material.dart';

class HomeMyProductPage extends StatefulWidget {
  const HomeMyProductPage({super.key});

  @override
  State<HomeMyProductPage> createState() => _HomeMyProductPageState();
}

class _HomeMyProductPageState extends State<HomeMyProductPage> {
  int _selectedNavIndex = 2; // 我的作品集选中
  String _selectedFilter = 'ALL'; // 选中的筛选器

  // Mock数据 - 我的作品集
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

  // Mock数据 - 市场/社区
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
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E1A),
      body: SafeArea(
        child: Column(
          children: [
            // 顶部导航栏
            _buildHeader(),
            // 主要内容区域
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 40),
                    // 我的作品集部分
                    _buildMyProjectsSection(),
                    const SizedBox(height: 60),
                    // 市场/社区部分
                    _buildMarketSection(),
                    const SizedBox(height: 40),
                    // Footer
                    _buildFooter(),
                    const SizedBox(height: 40),
                  ],
                ),
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
          // 左侧Logo和首页图标
          Row(
            children: [
              // 首页图标（可点击返回）
              GestureDetector(
                onTap: () {
                  Navigator.pop(context);
                },
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFF00D9FF),
                      width: 2,
                    ),
                  ),
                  child: const Icon(
                    Icons.home,
                    color: Color(0xFF00D9FF),
                    size: 24,
                  ),
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
          Spacer(),
          // 右上角个人信息模块
          _buildUserInfo(),
        ],
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
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF00D9FF).withOpacity(0.2)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: isSelected
              ? Border.all(
                  color: const Color(0xFF00D9FF).withOpacity(0.5),
                  width: 1,
                )
              : null,
        ),
        child: Text(
          text,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.white.withOpacity(0.6),
            fontSize: 14,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  // 右上角个人信息模块
  Widget _buildUserInfo() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(
              children: [
                Text(
                  'RANK: ',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 12,
                    letterSpacing: 1,
                  ),
                ),
                const Text(
                  'ARCHITECT',
                  style: TextStyle(
                    color: Color(0xFF00D9FF),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Text(
                  'ZHU RUIQI',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(width: 12),
                // 头像
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00D9FF).withOpacity(0.2),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFF00D9FF),
                      width: 2,
                    ),
                  ),
                  child: const Icon(
                    Icons.person,
                    color: Color(0xFF00D9FF),
                    size: 24,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () {
                // TODO: 跳转到所有档案
              },
              child: Text(
                'SEE ALL ARCHIVES >',
                style: TextStyle(
                  color: const Color(0xFF00D9FF),
                  fontSize: 12,
                  letterSpacing: 0.5,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // 我的作品集部分
  Widget _buildMyProjectsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 标题
        Row(
          children: [
            const Text(
              '我的作品集',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '/ MY PROJECTS',
              style: TextStyle(
                color: Colors.white.withOpacity(0.4),
                fontSize: 14,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        // 项目卡片网格
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 5,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 0.75,
          ),
          itemCount: _myProjects.length + 1, // +1 for NEW PROJECT card
          itemBuilder: (context, index) {
            if (index == 0) {
              return _buildNewProjectCard();
            }
            return _buildProjectCard(_myProjects[index - 1]);
          },
        ),
      ],
    );
  }

  // 新建项目卡片
  Widget _buildNewProjectCard() {
    return GestureDetector(
      onTap: () {
        // TODO: 创建新项目
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF151923),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: const Color(0xFF00D9FF).withOpacity(0.3),
            width: 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: const Color(0xFF00D9FF).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.add,
                color: Color(0xFF00D9FF),
                size: 32,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'NEW PROJECT',
              style: TextStyle(
                color: Color(0xFF00D9FF),
                fontSize: 14,
                fontWeight: FontWeight.bold,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 项目卡片
  Widget _buildProjectCard(ProjectCard project) {
    return GestureDetector(
      onTap: () {
        // TODO: 打开项目详情
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF151923),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: const Color(0xFF00D9FF).withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 顶部：LIVE PREVIEW标签
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
                      color: const Color(0xFF00FF00).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: const Color(0xFF00FF00),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      '${project.version} LIVE PREVIEW',
                      style: const TextStyle(
                        color: Color(0xFF00FF00),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
            if (project.isLive) const SizedBox(height: 12),
            // 标题
            Text(
              project.title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const Spacer(),
            // 最后编辑时间
            Text(
              '最后编辑: ${project.lastEdited}',
              style: TextStyle(
                color: Colors.white.withOpacity(0.5),
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 8),
            // 标签
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
                      color: const Color(0xFF00D9FF).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      tag,
                      style: const TextStyle(
                        color: Color(0xFF00D9FF),
                        fontSize: 10,
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

  // 市场/社区部分
  Widget _buildMarketSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 标题
        Row(
          children: [
            const Text(
              '市场/社区',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '/ HUB & DISCOVERY',
              style: TextStyle(
                color: Colors.white.withOpacity(0.4),
                fontSize: 14,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        // 筛选按钮
        Row(
          children: [
            _buildFilterButton('ALL'),
            const SizedBox(width: 12),
            _buildFilterButton('感知类'),
            const SizedBox(width: 12),
            _buildFilterButton('执行类'),
            const SizedBox(width: 12),
            _buildFilterButton('创意案例'),
            const SizedBox(width: 12),
            _buildFilterButton('逻辑模组'),
          ],
        ),
        const SizedBox(height: 24),
        // 市场卡片网格
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
            return _buildMarketCard(_marketItems[index]);
          },
        ),
        const SizedBox(height: 24),
        // LOAD MORE按钮
        Center(
          child: GestureDetector(
            onTap: () {
              // TODO: 加载更多
            },
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 32,
                vertical: 12,
              ),
              decoration: BoxDecoration(
                color: const Color(0xFF151923),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: const Color(0xFF00D9FF).withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: const Text(
                'LOAD MORE ARCHIVES',
                style: TextStyle(
                  color: Color(0xFF00D9FF),
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // 筛选按钮
  Widget _buildFilterButton(String text) {
    final isSelected = _selectedFilter == text;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedFilter = text;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF00D9FF).withOpacity(0.2)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: isSelected
              ? Border.all(
                  color: const Color(0xFF00D9FF).withOpacity(0.5),
                  width: 1,
                )
              : Border.all(
                  color: Colors.white.withOpacity(0.1),
                  width: 1,
                ),
        ),
        child: Text(
          text,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.white.withOpacity(0.6),
            fontSize: 14,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  // 市场卡片
  Widget _buildMarketCard(MarketCard item) {
    return GestureDetector(
      onTap: () {
        // TODO: 打开市场项目详情
      },
      child: Stack(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF151923),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFF00D9FF).withOpacity(0.2),
                width: 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 顶部：浏览量和点赞数
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      item.views,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.5),
                        fontSize: 12,
                      ),
                    ),
                    Row(
                      children: [
                        const Icon(
                          Icons.favorite,
                          color: Color(0xFFFF5F57),
                          size: 16,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${item.likes}',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.5),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const Spacer(),
                // 标题
                Text(
                  item.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                // 创建者
                Text(
                  item.creator,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.5),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          // NEW标签（右下角）
          if (item.isNew)
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF00D9FF),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(4),
                    bottomRight: Radius.circular(12),
                  ),
                ),
                child: const Text(
                  'NEW',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  // Footer
  Widget _buildFooter() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          '© 2025 MAGI_CORE NEXUS ALL RIGHTS RESERVED.',
          style: TextStyle(
            color: Colors.white.withOpacity(0.3),
            fontSize: 12,
            letterSpacing: 0.5,
          ),
        ),
        Row(
          children: [
            Text(
              'UPLINK: ',
              style: TextStyle(
                color: Colors.white.withOpacity(0.3),
                fontSize: 12,
                letterSpacing: 0.5,
              ),
            ),
            const Text(
              'ACTIVE',
              style: TextStyle(
                color: Color(0xFF00FF00),
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(width: 24),
            Text(
              'ENCRYPTION: ',
              style: TextStyle(
                color: Colors.white.withOpacity(0.3),
                fontSize: 12,
                letterSpacing: 0.5,
              ),
            ),
            const Text(
              'RES-256',
              style: TextStyle(
                color: Color(0xFF00D9FF),
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ],
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
