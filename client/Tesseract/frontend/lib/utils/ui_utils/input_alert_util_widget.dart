import 'package:flutter/material.dart';
import 'package:flutter_easyloading/flutter_easyloading.dart';
import 'package:aitesseract/utils/colorUtils/color_util.dart';
import 'package:aitesseract/utils/ui_utils/edit_text/input_text.dart';

/*
*                   // 使用路由跳转方式
                  Navigator.push(
                    context,
                    PopRoute(
                      child: InputAlertUntilWidget(
                        btnContext: alertContext,
                        content: content,
                        title: "备注",
                        onClick: (String content) {
                          Navigator.pop(context);
                        }, // 传到外面来的回调事件
                      ),
                    ),
                  );
* */
// 接收一个上下文context，用来获取点击的控件的位置
class PopRoute extends PopupRoute {
  // push的耗时，milliseconds为毫秒
  final Duration _duration = Duration(milliseconds: 300);

  // 接收一个child，也就是我们push的内容。
  Widget child;

  PopRoute({required this.child});

  @override
  Color get barrierColor => ColorsUtil.hexColor(0x000000, alpha: 0.5);

  @override
  bool get barrierDismissible => true;

  @override
  String? get barrierLabel => null;

  @override
  Widget buildPage(BuildContext context, Animation<double> animation,
      Animation<double> secondaryAnimation) {
    return child;
  }

  @override
  Duration get transitionDuration => _duration;
}

// 类型声明回调
typedef OnItem = Function(String value);

class InputAlertUntilWidget extends StatefulWidget {
  final BuildContext btnContext;
  final OnItem? onClick; // 点击回调
  final String? content; // 回显的内容
  final String? title; // 标题
  const InputAlertUntilWidget(
      {Key? key,
      required this.btnContext,
      this.onClick,
      this.content,
      this.title})
      : super(key: key);

  @override
  _InputAlertUntilWidgetState createState() => _InputAlertUntilWidgetState();
}

class _InputAlertUntilWidgetState extends State<InputAlertUntilWidget> {
  RenderBox? button;
  RenderBox? overlay;
  RelativeRect? position;

  TextEditingController? vc;
  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    // 找到并渲染对象button
    button = widget.btnContext.findRenderObject() as RenderBox;
    // 找到并渲染对象overlay
    overlay =
        Overlay.of(widget.btnContext)?.context?.findRenderObject() as RenderBox;
    // 位置设置
    position = RelativeRect.fromRect(
      Rect.fromPoints(
        button!.localToGlobal(Offset.zero, ancestor: overlay),
        button!.localToGlobal(Offset.zero, ancestor: overlay),
      ),
      Offset.zero & overlay!.size,
    );
    vc = TextEditingController(text: widget.content ?? '');
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: GestureDetector(
        child: Stack(
          children: <Widget>[
            Container(
              // 设置一个容器组件，是整屏幕的。
              width: MediaQuery.of(context).size.width,
              height: MediaQuery.of(context).size.height,
              color: Colors.transparent, // 它的颜色为透明色
            ),
            Positioned(
              child: _inputWidget(),
              top: (MediaQuery.of(context).size.height - 350 - 44) / 2, // 顶部位置
              right: (MediaQuery.of(context).size.width - 300) / 2, //
            )
          ],
        ),
        onTap: () => Navigator.of(context).pop(), //点击空白处直接返回
      ),
    );
  }

  Widget _inputWidget() {
    return Container(
        width: 300,
        height: 350,
        padding: EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.all(Radius.circular(10)), // 圆角
        ),
        child: Column(children: [
          Text(
            widget.title ?? "",
            style: TextStyle(fontSize: 14, color: Colors.black),
          ),
          SizedBox(
            height: 15,
          ),
          InputText(
            padding: EdgeInsets.all(8),
            controller: vc,
            enableClear: false,
            autofocus: false,
            obscureText: false,
            maxLength: 100,
            maxLines: 10,
            hintText: "请输入${widget.title ?? ""}",
          ),
          Container(
              height: 40,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  GestureDetector(
                    onTap: () {
                      if (mounted) {
                        setState(() {
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            vc?.clear();
                            // widget.model.value = "";
                          });
                        });
                      }
                    },
                    child: Container(
                      width: 105,
                      height: 32,
                      decoration: BoxDecoration(
                        color: Color(0xffF3F5F7),
                        borderRadius: BorderRadius.all(Radius.circular(8)),
                      ),
                      child: Center(
                        child: Text(
                          "重置",
                          style:
                              TextStyle(fontSize: 14, color: Color(0xff3EC3CF)),
                        ),
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 8,
                  ),
                  GestureDetector(
                    onTap: () {
                      if ((vc?.text ?? "") == "") {
                        EasyLoading.showInfo("请输入${widget.title ?? ""}内容");
                        return;
                      }
                      widget.onClick!(vc?.text ?? "");
                    },
                    child: Container(
                      width: 105,
                      height: 32,
                      decoration: BoxDecoration(
                        color: Color(0xff3EC3CF),
                        borderRadius: BorderRadius.all(Radius.circular(8)),
                      ),
                      child: Center(
                        child: Text(
                          "确定",
                          style: TextStyle(fontSize: 14, color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                ],
              )),
        ]));
  }
}
