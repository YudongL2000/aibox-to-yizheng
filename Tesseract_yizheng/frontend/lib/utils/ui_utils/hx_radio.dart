import 'package:flutter/material.dart';
import 'package:aitesseract/utils/ui_utils/hx_text.dart';

// 定义接收的选项的结构
class IOptions {
  String label = '';
  String value = '';

  IOptions(this.label, this.value);
}

class HXRadio extends StatefulWidget {
  List<IOptions> options = [];

  HXRadio({Key? key, required this.options}) : super(key: key);

  @override
  State<HXRadio> createState() => _MyHXRadio();
}

class _MyHXRadio extends State<HXRadio> {
  String? _value = "1";

  void setValue(String? value) {
    setState(() {
      _value = value;
    });
    print("setValue $value");
  }

  @override
  Widget build(BuildContext context) {
    return Wrap(
      children: widget.options
          .map((e) => UnconstrainedBox(
                child: Row(
                  children: [
                    Radio(
                        value: e.value,
                        groupValue: _value,
                        onChanged: setValue),
                    HXText(e.label)
                  ],
                ),
              ))
          .toList(),
    );
  }
}
