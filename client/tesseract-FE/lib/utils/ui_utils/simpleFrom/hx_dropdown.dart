import 'package:flutter/material.dart';
import 'package:aitesseract/utils/colorUtils/color_util.dart';
import 'package:aitesseract/utils/ui_utils/hx_text.dart';
import 'package:pointer_interceptor/pointer_interceptor.dart';

class HXDropdown extends StatefulWidget {
  HXDropdown(
      {Key? key,
      this.value,
      this.onChanged,
      this.itemData,
      this.validator,
      this.initialValue,
      this.margin,
      this.padding,
      this.height,
      this.iconColor,
      this.hintColor,
      this.hint,
      this.onTap,
      this.enable = true,
      this.color,
        this.radius,
      this.border,
      this.needAllItem = true,
      this.nullOnChange = false,
      this.fontSize = 14})
      : super(key: key);
  final value;
  final onChanged;
  final List? itemData;
  final Function? validator;
  final initialValue;
  final BoxBorder? border;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry? padding;
  final double? height;
  final double? radius;
  final Color? iconColor;
  final Color? hintColor;
  final Color? color;
  final String? hint;
  final VoidCallback? onTap;
  final double? fontSize;
  final bool enable;
  final bool nullOnChange;
  final bool? needAllItem;

  @override
  _HXDropdownState createState() => _HXDropdownState();
}

class _HXDropdownState extends State<HXDropdown> {
  var value;

  @override
  void initState() {
    super.initState();
    value = widget.initialValue;
  }

  void _handleOnChanged(_value) {
    widget.onChanged(_value);
    if (mounted) {
      setState(() {
        value = _value;
      });
    }
  }

  @override
  void didUpdateWidget(covariant HXDropdown oldWidget) {
    value = widget.initialValue;
    super.didUpdateWidget(oldWidget);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
        margin: widget.margin ?? EdgeInsets.only(bottom: 10),
        padding: widget.padding ?? EdgeInsets.only(left: 10, right: 10),
        height: widget.height,
        alignment: Alignment.centerLeft,
        decoration: BoxDecoration(
            color: widget.color ?? ColorsUtil.color_F3F5F7,
            border: widget.border,
            borderRadius: BorderRadius.all(Radius.circular(widget.radius??10))),
        child: DropdownButtonFormField(
          focusColor: Colors.transparent,
          isExpanded: true,
          onTap: widget.onTap,
          decoration: InputDecoration(
              contentPadding: EdgeInsets.zero,
              border: OutlineInputBorder(borderSide: BorderSide.none),
              errorBorder: OutlineInputBorder(borderSide: BorderSide.none)),
          validator: (value) =>
              widget.validator == null ? null : widget.validator!(value),
          value: value ?? "",
          onChanged:
              !widget.enable || widget.nullOnChange ? null : _handleOnChanged,
          icon: Icon(
            Icons.keyboard_arrow_down_rounded,
            color: widget.enable ? widget.iconColor : ColorsUtil.c69,
          ),
          items: widget.needAllItem == true
              ? [
                  DropdownMenuItem(
                    value: "",
                    child: HXText(
                      widget.hint ?? "请选择",
                      fontSize: widget.fontSize ?? 14,
                      color: widget.hintColor,
                    ),
                  ),
                  ...widget.itemData!
                      .asMap()
                      .keys
                      .map(
                        (e) => DropdownMenuItem(
                          value: "${widget.itemData![e].id}",
                          child: PointerInterceptor(
                            child: HXText(
                              "${widget.itemData![e].name}",
                              fontSize: widget.fontSize ?? 14,
                              color:
                                  widget.enable ? Colors.black : ColorsUtil.c69,
                            ),
                          ),
                        ),
                      )
                      .toList()
                ]
              : widget.itemData!
                  .asMap()
                  .keys
                  .map(
                    (e) => DropdownMenuItem(
                      value: "${widget.itemData![e].id}",
                      child: PointerInterceptor(
                        child: HXText(
                          "${widget.itemData![e].name}",
                          fontSize: widget.fontSize ?? 14,
                          color: widget.enable ? Colors.black : ColorsUtil.c69,
                        ),
                      ),
                    ),
                  )
                  .toList(),
        ));
  }
}
