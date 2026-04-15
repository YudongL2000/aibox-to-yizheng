/// 首页实例占位类
/// TODO: 根据实际需求实现
class HomeManager {
  static final HomeManager instance = HomeManager._();
  HomeManager._();

  IndexPath defaultIndex = IndexPath(section: 0, row: 0);
}

class IndexPath {
  final int section;
  final int row;

  IndexPath({required this.section, required this.row});
}
