import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:aitesseract/utils/colorUtils/color_util.dart';
import 'package:aitesseract/utils/ui_utils/hx_tabbar/rounded_corners_tab_indicator.dart';

class HXTabBar extends StatefulWidget {
  /// Typically a list of two or more [Tab] widgets.
  ///
  /// The length of this list must match the [controller]'s [TabController.length]
  /// and the length of the [TabBarView.children] list.
  final List<Widget> tabs;

  /// This widget's selection and animation state.
  ///
  /// If [TabController] is not provided, then the value of [DefaultTabController.of]
  /// will be used.
  final TabController? controller;

  /// Whether this tab bar can be scrolled horizontally.
  ///
  /// If [isScrollable] is true, then each tab is as wide as needed for its label
  /// and the entire [TabBar] is scrollable. Otherwise each tab gets an equal
  /// share of the available space.
  final bool isScrollable;

  /// The amount of space by which to inset the tab bar.
  ///
  /// When [isScrollable] is false, this will yield the same result as if you had wrapped your
  /// [TabBar] in a [Padding] widget. When [isScrollable] is true, the scrollable itself is inset,
  /// allowing the padding to scroll with the tab bar, rather than enclosing it.
  final EdgeInsetsGeometry? padding;

  /// Whether this tab bar should automatically adjust the [indicatorColor].
  ///
  /// If [automaticIndicatorColorAdjustment] is true,
  /// then the [indicatorColor] will be automatically adjusted to [Colors.white]
  /// when the [indicatorColor] is same as [Material.color] of the [Material] parent widget.
  final bool automaticIndicatorColorAdjustment;

  /// The color of selected tab labels.
  ///
  /// Unselected tab labels are rendered with the same color rendered at 70%
  /// opacity unless [unselectedLabelColor] is non-null.
  ///
  /// If this parameter is null, then the color of the [ThemeData.primaryTextTheme]'s
  /// bodyText1 text color is used.
  final Color? labelColor;

  /// The color of unselected tab labels.
  ///
  /// If this property is null, unselected tab labels are rendered with the
  /// [labelColor] with 70% opacity.
  final Color? unselectedLabelColor;

  /// The text style of the selected tab labels.
  ///
  /// If [unselectedLabelStyle] is null, then this text style will be used for
  /// both selected and unselected label styles.
  ///
  /// If this property is null, then the text style of the
  /// [ThemeData.primaryTextTheme]'s bodyText1 definition is used.
  final TextStyle? labelStyle;

  /// The padding added to each of the tab labels.
  ///
  /// If there are few tabs with both icon and text and few
  /// tabs with only icon or text, this padding is vertically
  /// adjusted to provide uniform padding to all tabs.
  ///
  /// If this property is null, then kTabLabelPadding is used.
  final EdgeInsetsGeometry? labelPadding;

  /// The text style of the unselected tab labels.
  ///
  /// If this property is null, then the [labelStyle] value is used. If [labelStyle]
  /// is null, then the text style of the [ThemeData.primaryTextTheme]'s
  /// bodyText1 definition is used.
  final TextStyle? unselectedLabelStyle;

  /// Defines the ink response focus, hover, and splash colors.
  ///
  /// If non-null, it is resolved against one of [MaterialState.focused],
  /// [MaterialState.hovered], and [MaterialState.pressed].
  ///
  /// [MaterialState.pressed] triggers a ripple (an ink splash), per
  /// the current Material Design spec. The [overlayColor] doesn't map
  /// a state to [InkResponse.highlightColor] because a separate highlight
  /// is not used by the current design guidelines. See
  /// https://material.io/design/interaction/states.html#pressed
  ///
  /// If the overlay color is null or resolves to null, then the default values
  /// for [InkResponse.focusColor], [InkResponse.hoverColor], [InkResponse.splashColor]
  /// will be used instead.
  final MaterialStateProperty<Color?>? overlayColor;

  /// {@macro flutter.widgets.scrollable.dragStartBehavior}
  final DragStartBehavior dragStartBehavior;

  /// An optional callback that's called when the [TabBar] is tapped.
  ///
  /// The callback is applied to the index of the tab where the tap occurred.
  ///
  /// This callback has no effect on the default handling of taps. It's for
  /// applications that want to do a little extra work when a tab is tapped,
  /// even if the tap doesn't change the TabController's index. TabBar [onTap]
  /// callbacks should not make changes to the TabController since that would
  /// interfere with the default tap handler.
  final ValueChanged<int>? onTap;

  /// How the [TabBar]'s scroll view should respond to user input.
  ///
  /// For example, determines how the scroll view continues to animate after the
  /// user stops dragging the scroll view.
  ///
  /// Defaults to matching platform conventions.
  final ScrollPhysics? physics;

  final Color? indicatorColor;

  final EdgeInsetsGeometry? indicatorPadding;

  final bool? needIndicator;
  HXTabBar(
      {Key? key,
      required this.tabs,
      this.controller,
      this.needIndicator = true,
      this.isScrollable = true,
      this.padding,
      this.automaticIndicatorColorAdjustment = true,
      this.labelColor,
      this.labelStyle = const TextStyle(
          fontSize: 18, color: Colors.black, fontWeight: FontWeight.bold),
      this.labelPadding,
      this.unselectedLabelColor,
      this.unselectedLabelStyle =
          const TextStyle(fontSize: 18, color: Color(0xff666666)),
      this.dragStartBehavior = DragStartBehavior.start,
      this.overlayColor,
      this.onTap,
      this.physics,
      this.indicatorColor = ColorsUtil.color_3EC3CF,
      this.indicatorPadding})
      : super(key: key);

  @override
  _HXTabBarState createState() => _HXTabBarState();
}

class _HXTabBarState extends State<HXTabBar> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return TabBar(
      indicatorSize: TabBarIndicatorSize.label,
      key: widget.key,
      tabs: widget.tabs,
      controller: widget.controller,
      isScrollable: widget.isScrollable,
      padding: widget.padding,
      indicatorColor: widget.indicatorColor,
      automaticIndicatorColorAdjustment:
          widget.automaticIndicatorColorAdjustment,
      labelColor: widget.labelColor,
      labelStyle: widget.labelStyle,
      labelPadding: widget.labelPadding,
      indicatorPadding: widget.indicatorPadding ?? EdgeInsets.zero,
      unselectedLabelColor: widget.unselectedLabelColor,
      unselectedLabelStyle: widget.unselectedLabelStyle,
      dragStartBehavior: widget.dragStartBehavior,
      overlayColor: widget.overlayColor,
      onTap: widget.onTap,
      physics: widget.physics,
      indicator: widget.needIndicator == true
          ? RoundCornersTabIndicator(width: 36)
          : BoxDecoration(color: Colors.transparent),
    );
  }

  @override
  void dispose() {
    super.dispose();
  }
}
