import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:aitesseract/utils/colorUtils/color_util.dart';

///
/// create_user: zhengzaihong
/// email:1096877329@qq.com
/// create_date: 2021/12/13
/// create_time: 18:07
/// describe: 输入框拓展带自动检索组件
///

typedef Builder = Widget Function(
    BuildContext context, InputExtendState controller);

typedef Compare<T> = bool Function(List<T> data);

typedef CreateCheckedWidgets<T> = List<Widget> Function(
    List<T> checkDatas, InputExtendState controller);

typedef OnchangeInput<String> = void Function(
    String value, InputExtendState controller);

typedef InputDecorationStyle = InputDecoration Function(
    InputExtendState controller);

class InputExtend<T> extends StatefulWidget {
  // 搜索结果的自定义组件 外部传入
  final Builder builder;

  // 选择内容发生变化
  final OnchangeInput<String> onChanged;

  // 相应回撤
  final OnchangeInput<String>? onEditingComplete;

  // 选择后回显的样式
  final CreateCheckedWidgets checkedWidgets;

  // 选中的每个Item宽度
  final double checkedItemWidth;

  // 输入框搜索的文字样式
  final TextStyle inputTextStyle;

  // 输入框的外观
  final InputDecorationStyle? inputDecoration;

  // 选中的item约束
  final double? itemsBoxMaxWidth;
  final double? itemsBoxMixWidth;
  final double? itemsBoxMaxHeight;
  final double? itemsBoxMixHeight;

  // 滚动方向
  final ScrollPhysics? physics;

  // 当前选中的item数组
  final List<T>? initCheckedValue;

  // 搜索接口调用的间隔
  final int intervalTime;

  // 开启多选最大的选择数目
  final int maxChecked;

  // 是否支持点击所选项删除
  final bool enableClickClear;

  // 是否支持多选
  final bool enableMultipleChoice;

  // 选中后自动收起遮罩
  final bool autoClose;

  // 点击背景关闭
  final bool clickBlankClose;

  ///输入框得到焦点即回调。
  final bool enableHasFocusCallBack;

  // 弹框列表的宽高约束 默认与输入框同宽 高度200
  final PopConstraintBox? popConstraintBox;
  final TextEditingController? textEditingController;

  final bool enabled;

  InputExtend(
      {required this.builder,
      required this.onChanged,
      required this.checkedWidgets,
      this.onEditingComplete,
      this.checkedItemWidth = 60,
      this.itemsBoxMaxWidth,
      this.itemsBoxMixWidth,
      this.itemsBoxMaxHeight,
      this.itemsBoxMixHeight,
      this.inputTextStyle =
          const TextStyle(color: ColorsUtil.color_black, fontSize: 16),
      this.inputDecoration,
      this.physics,
      this.intervalTime = 500,
      this.initCheckedValue = const [],
      this.maxChecked = 100,
      this.enableClickClear = false,
      this.enableMultipleChoice = false,
      this.autoClose = false,
      this.enableHasFocusCallBack = false,
      this.popConstraintBox,
      this.textEditingController,
       this.enabled = true,
      Key? key,
      this.clickBlankClose = false})
      : super(key: key);

  @override
  InputExtendState createState() => InputExtendState();
}

class InputExtendState<T> extends State<InputExtend> {
  final FocusNode _focusNode = FocusNode();

  ///关联输入框，处理在组价在列表中跟随滚动
  final LayerLink _layerLink = LayerLink();

  OverlayEntry? _overlayEntry;

  ///提供给外部的控制器
  late InputExtendState _controller;

  late final BuildContext _buildContext;

  List<T> _searchResultData = [];

  List<T> _checkedData = [];

  late TextEditingController _editingController;
  ScrollController _scrollController = ScrollController();
  final ScrollController _inputScrollController = ScrollController();
  late final int intervalTime;

  Timer? _timer;

  int oldSize = 0;

  @override
  void initState() {
    if (widget.initCheckedValue == null) {
      _checkedData = [];
    } else {
      _checkedData.addAll(widget.initCheckedValue!.cast<T>());
      oldSize = _checkedData.length;
    }
    _editingController =
        widget.textEditingController ?? TextEditingController();
    intervalTime = widget.intervalTime;
    _controller = this;
    _buildContext = context;
    _focusNode.addListener(() {
      if (_focusNode.hasFocus == true) {
        _overlayEntry = _createOverlayEntry();
        Overlay.of(context)?.insert(_overlayEntry!);
        if (widget.enableHasFocusCallBack) {
          _onTextChangeCallBack(_editingController.text, true);
        }
      } else {
        _overlayEntry?.remove();
      }
    });
  }

  void setSearchResultData(List<T>? newData) {
    _searchResultData = newData ?? [];
    notyOverlayDataChange();
  }

  List<T> get getSearchData => _searchResultData;

  void setCheckedData(List<T>? checkedData) {
    if (mounted) {
      setState(() {
        _checkedData = checkedData ?? [];
      });
    }
  }

  List<dynamic> get getCheckedData {
    if (mounted) {
      return widget.initCheckedValue ?? [];
    } else {
      return [];
    }
  }

  TextEditingController get getTextController => _editingController;

  ///返回输入框的滑动控制器
  ScrollController get getInputScrollController => _inputScrollController;

  Future<bool> updateCheckedData(T data, Compare compare) {
    if (widget.maxChecked <= widget.initCheckedValue!.length) {
      return Future.value(false);
    }

    bool isChecked = compare(widget.initCheckedValue!);
    var initValue = widget.initCheckedValue!;
    if (widget.enableMultipleChoice) {
      if (isChecked) {
        initValue.remove(data);
      } else {
        initValue.add(data);
      }
    } else {
      if (!isChecked) {
        widget.initCheckedValue!.clear();
        widget.initCheckedValue!.add(data);
      } else {
        initValue.remove(data);
      }
    }

    var offset = _checkedData.length * widget.checkedItemWidth +
        widget.checkedItemWidth * 10 +
        _editingController.text.length;

    if (_scrollController.hasClients) {
      if (_checkedData.length > oldSize) {
        _scrollController.animateTo(offset,
            duration: Duration(milliseconds: 300), curve: Curves.linear);
      } else {
        _scrollController.jumpTo(offset);
      }
      oldSize = _checkedData.length;
    }

    if (widget.enableClickClear) {
      _editingController.text = "";
    }

    ///刷新搜索列表
    notyOverlayDataChange();

    ///刷新输入框组件
    notyListUiChange();

    if (widget.autoClose) {
      _focusNode.unfocus();
    }
    return Future.value(true);
  }

  void setText(String text) {
    // _editingController.text = text;
    _editingController.selection = TextSelection.collapsed(offset: text.length);
    if (_inputScrollController.hasClients) {
      Future.delayed(Duration(milliseconds: 300), () {
        _inputScrollController.animateTo(
            _inputScrollController.position.maxScrollExtent,
            duration: Duration(milliseconds: 500),
            curve: Curves.decelerate);
      });
    }
  }

  ///创建搜索弹窗
  OverlayEntry _createOverlayEntry() {
    RenderBox renderBox = context.findRenderObject() as RenderBox;
    var size = renderBox.size;

    var popBox = widget.popConstraintBox;
    return OverlayEntry(builder: (context) {
      return Stack(
        children: [
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: widget.clickBlankClose
                ? () {
                    _overlayEntry?.remove();
                    FocusScope.of(context).requestFocus(FocusNode()); //让输入框失去焦点
                  }
                : null,
            child: Container(
              height: double.infinity,
              width: double.infinity,
            ),
          ),
          Positioned(
            width: popBox == null
                ? size.width
                : popBox.limitSize
                    ? null
                    : popBox.width,
            height: popBox?.height ?? 200,
            child: CompositedTransformFollower(
              link: _layerLink,
              showWhenUnlinked: false,
              offset: Offset(0.0, size.height + 5.0),
              child: widget.builder.call(_buildContext, _controller),
            ),
          )
        ],
      );
    });
  }

  ///外部构建传入选中后的数据样式
  List<Widget> createCheckedWidget() {
    return widget.checkedWidgets(_checkedData, _controller);
  }

  var lastTime = DateTime.now();

  bool intervalSearch() {
    return true;
    if (DateTime.now().difference(lastTime) >
        Duration(milliseconds: intervalTime)) {
      lastTime = DateTime.now();
      return true;
    }
    return false;
  }

  void _initData() {
    _scrollController = ScrollController();
    var initValue = widget.initCheckedValue;
    _checkedData.clear();
    if (initValue is List<T>) {
      initValue.forEach((element) {
        _checkedData.add(element);
      });
    }
  }

  @override
  void dispose() {
    // TODO: implement dispose
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    _initData();
    return CompositedTransformTarget(
      link: _layerLink,
      child: Row(
        children: [
          Container(
            constraints: BoxConstraints(
                maxWidth: widget.itemsBoxMaxWidth ?? 100,
                maxHeight: widget.itemsBoxMaxHeight ?? 40,
                minHeight: widget.itemsBoxMixHeight ?? 0,
                minWidth: widget.itemsBoxMixWidth ?? 0),
            child: _checkedData.isEmpty
                ? const SizedBox(
                    width: 0,
                    height: 0,
                  )
                : SingleChildScrollView(
                    physics: widget.physics,
                    controller: _scrollController,
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: createCheckedWidget(),
                    ),
                  ),
          ),
          Expanded(
              child: TextFormField(
            focusNode: _focusNode,
            autofocus: false,
            enabled: widget.enabled,
            controller: _editingController,
            style: widget.inputTextStyle,
            scrollController: _inputScrollController,
            onChanged: (text) async {
              _timer?.cancel();
              _timer = Timer(Duration(milliseconds: 300), () {
                _onTextChangeCallBack(text, false);
              });
            },
            onEditingComplete: () {
              widget.onEditingComplete
                  ?.call(_editingController.text, _controller);
            },
            decoration: widget.inputDecoration?.call(_controller),
          ))
        ],
      ),
    );
  }

  void _onTextChangeCallBack(String text, bool isFirst) {
    setText(text);
    if ("" == text && !isFirst) {
      _focusNode.unfocus();
    }
    if (isFirst) {
      widget.onChanged.call(text, _controller);
    } else {
      bool flag = intervalSearch();
      if (flag) {
        widget.onChanged.call(text, _controller);
      }
    }
  }

  void notyOverlayDataChange() {
    _overlayEntry?.markNeedsBuild();
  }

  void notyListUiChange() {
    if (mounted) {
      setState(() {});
    }
  }
}

///约束浮层的条件
class PopConstraintBox {
  double? width;
  double? height;

  ///limitSize 为真，则约束宽度无效，可无限延伸
  final bool limitSize;

  PopConstraintBox({this.width, this.height, this.limitSize = false});
}

class _MyVerticalDragGestureRecognizer extends HorizontalDragGestureRecognizer {
  @override
  void rejectGesture(int pointer) {
    acceptGesture(pointer);
  }
}
