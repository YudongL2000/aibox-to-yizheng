import 'package:aitesseract/server/Http_config.dart';
import 'package:aitesseract/utils/colorUtils/color_util.dart';
import 'package:aitesseract/utils/ui_utils/edit_text/input_text.dart';
import 'package:aitesseract/utils/ui_utils/hx_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class HXEndDrawer extends StatefulWidget {
  // 标题
  final String? title;

  // 阴影
  final double elevation;

  // 宽度百分比
  final double? widthPercent;

  // 宽度
  final double? drawerWidth;

  // 内容子组件
  final Widget child;

  // 是否需要返回按钮和确认按钮 默认true
  final bool? needBtn;

  // 是否需要搜索功能
  final bool? needSearch;

  // 取消按钮 默认有一个取消按钮
  final Widget? cancelWidget;

  // 确定按钮 默认有一个确认按钮
  final Widget? sureWidget;

  // 确定按钮的禁用 -默认不禁
  final bool? sureBtnDisable;

  // 取消按钮的回调
  final Function? cancelClickCallBack;

  // 确定按钮的回调
  final Function? sureClickCallBack;

  // 确定按钮的标题 默认确定
  final String? confirmBtnTitle;

  // 输入框的回调
  final Function? onEditingComplete;

  // 打开-关闭回调
  final Function? drawerCallback;

  const HXEndDrawer(
      {Key? key,
      required this.child,
      this.title,
      this.elevation = 0.0,
      this.widthPercent = 0.35,
      this.drawerWidth,
      this.needBtn = true,
      this.needSearch,
      this.onEditingComplete,
      this.cancelWidget,
      this.sureWidget,
      this.sureBtnDisable = false,
      this.sureClickCallBack,
      this.cancelClickCallBack,
      this.confirmBtnTitle,
      this.drawerCallback})
      : super(key: key);

  @override
  _HXEndDrawerState createState() => _HXEndDrawerState();
}

class _HXEndDrawerState extends State<HXEndDrawer> {
  TextEditingController _textEditingController = TextEditingController();
  bool _isProcessing = false; // 添加处理状态标识

  @override
  void initState() {
    widget.drawerCallback?.call(true);

    super.initState();
  }

  @override
  void dispose() {
    widget.drawerCallback?.call(false);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: widget.drawerWidth ??
          MediaQuery.of(context).size.width * (widget.widthPercent ?? 0.35),
      child: RawKeyboardListener(
          focusNode: FocusNode(),
          onKey: (event) {
            if (event.runtimeType == RawKeyEventDataWeb) {
              if (event.physicalKey == PhysicalKeyboardKey.escape) {}
            }
          },
          child: Material(
            color: Colors.transparent,
            elevation: widget.elevation,
            child: Container(
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(10),
                        bottomLeft: Radius.circular(10))),
                clipBehavior: Clip.hardEdge,
                child: Column(
                  children: [
                    _topNavigatorView(),
                    Expanded(child: widget.child)
                  ],
                )),
          )),
    );
  }

  Widget _topNavigatorView() {
    return Column(
      children: [
        // 顶部 展示返回和 取消、确定按钮
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(width: 1, color: ColorsUtil.color_F3F5F7),
          ),
          child: Row(
            children: [
              // 点击事件 关闭当前的弹窗
              InkWell(
                onTap: () {
                  widget.cancelClickCallBack?.call();
                  Navigator.pop(context);
                },
                child: Container(
                  height: 60,
                  padding: EdgeInsets.symmetric(horizontal: 20),
                  child: Center(
                    child: Row(
                      children: [
                        HXImage(
                          imageUrl:
                              "${HttpConfig.assetsImgUrl}managent/ic_managment_back.png",
                          width: 16,
                          height: 16,
                        ),
                        SizedBox(
                          width: 10,
                        ),
                        Text(
                          widget.title ?? "",
                          style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.black),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Spacer(),
              Visibility(
                  visible: widget.needBtn!,
                  child: widget.cancelWidget ?? Container()),
              SizedBox(
                width: 16,
              ),
              Visibility(
                  visible: widget.needBtn!,
                  child: widget.sureWidget ?? Container()),
              SizedBox(
                width: 25,
              ),
            ],
          ),
        ),
        widget.needSearch == true ? _topSearchView() : Container()
      ],
    );
  }

  Widget _topSearchView() {
    return Container(
      height: 60,
      margin: EdgeInsets.only(
        // bottom: 10,
        top: 10,
        left: 25,
        right: 25,
      ),
      child: Row(
        children: [
          Expanded(
            child: InputText(
              width: null,
              margin: EdgeInsets.only(right: 10),
              controller: _textEditingController,
              onEditingComplete: () {
                widget.onEditingComplete?.call(_textEditingController.text);
              },
              hintText: "请输入搜索内容",
            ),
          ),
          Container()
        ],
      ),
    );
  }
}
