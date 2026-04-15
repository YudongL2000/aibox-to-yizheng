import 'dart:math';

import 'package:flutter/material.dart';

class SquareWidget extends StatefulWidget {
  final double? height;
  final double? width;
  final Widget? child;
  final Clip clipBehavior;
  final Decoration? decoration;

  const SquareWidget(
      {Key? key,
      this.height,
      this.width,
      this.child,
      this.clipBehavior = Clip.none,
      this.decoration})
      : super(key: key);

  @override
  _State createState() => _State();
}

class _State extends State<SquareWidget> with WidgetsBindingObserver {
  double? _height;
  double? _width;

  @override
  void initState() {
    super.initState();
    _height = widget.height;
    _width = widget.width;
    WidgetsBinding.instance.addObserver(this); //添加观察者
    WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
      _checkWh();
    });
  }

  _checkWh() {
    double? rw = context.size?.width;
    double? rh = context.size?.height;
    if (rw != null && rh != null) {
      double r = min(rw, rh);
      _height = r;
      _width = r;
      if (mounted) {
        setState(() {});
      }
    }
  }

  @override
  void didChangeMetrics() {
    super.didChangeMetrics();
    if ((_height ?? 0) < (widget.height ?? 0) ||
        (_width ?? 0) < (widget.width ?? 0)) {
      if (mounted) {
        setState(() {
          _height = widget.height;
          _width = widget.width;
        });
      }
    } else {
      if (mounted) {
        setState(() {
          Future.delayed(Duration(milliseconds: 200), () {
            _checkWh();
          });
        });
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: _width,
      height: _height,
      child: widget.child,
      decoration: widget.decoration,
      clipBehavior: widget.clipBehavior,
    );
  }
}
