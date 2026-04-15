/*
 * [INPUT]: 依赖 Spatial dark theme token。
 * [OUTPUT]: 对外提供 HomeMarketPage，作为市场页未接线阶段的极简占位入口，避免默认 Placeholder 破坏整体设计语言。
 * [POS]: module/home 的市场入口页，当前仅保留一级标题与状态说明。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import 'package:aitesseract/utils/spatial_design_ref.dart';
import 'package:flutter/material.dart';

class HomeMarketPage extends StatefulWidget {
  const HomeMarketPage({super.key});

  @override
  State<HomeMarketPage> createState() => _HomeMarketPageState();
}

class _HomeMarketPageState extends State<HomeMarketPage> {
  @override
  Widget build(BuildContext context) {
    final SpatialThemeData spatial = context.spatial;
    final Color accent = spatial.status(SpatialStatusTone.neural);

    return Scaffold(
      backgroundColor: spatial.palette.bgBase,
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(spatial.space4),
          child: Container(
            decoration: spatial.panelDecoration(
              tone: SpatialSurfaceTone.panel,
              accent: accent,
            ),
            padding: EdgeInsets.all(spatial.space5),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  '市场',
                  style: spatial.sectionTextStyle(),
                ),
                SizedBox(height: spatial.space3),
                Text(
                  '稍后接入',
                  style: spatial.monoTextStyle(
                    color: accent,
                    size: 11,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
