<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spatial Wireframe Design Spec</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <style>
        /* =========================================
           1. 核心设计令牌 (Design Tokens)
           ========================================= */
        :root {
            --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", sans-serif;
            --font-mono: 'Space Mono', 'Courier New', monospace;

            /* Light Theme */
            --bg-base: #F4F4F2;
            --surface: #EAEAEA;
            --surface-hover: #DFDFDF;
            --border-solid: #222222;
            --border-dashed: #BBBBBB;
            --grid-color: rgba(0, 0, 0, 0.03);
            
            --text-primary: #111111;
            --text-secondary: #666666;
            --text-inverse: #F4F4F2;
            
            /* Semantic Colors (Light) */
            --sem-info: #0055FF;
            --sem-success: #00A859;
            --sem-warning: #E58A00;
            --sem-danger: #E0282E;
            --sem-neural: #6B21A8;
            
            --status-ok: var(--sem-success); 
            --status-warn: var(--sem-warning);
            --accent: var(--sem-neural);
            
            --radius-base: 4px;
            --transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        [data-theme="dark"] {
            /* Dark Theme */
            --bg-base: #121316;
            --surface: #1E1F24;
            --surface-hover: #2A2C33;
            --border-solid: #3A3D45;
            --border-dashed: #555555;
            --grid-color: rgba(255, 255, 255, 0.02);
            
            --text-primary: #F0F0F0;
            --text-secondary: #8A8D98;
            --text-inverse: #121316;
            
            /* Semantic Colors (Dark/Neon) */
            --sem-info: #00E5FF;
            --sem-success: #CFFF04;
            --sem-warning: #FFC000;
            --sem-danger: #FF3366;
            --sem-neural: #B14EFF;
            
            --status-ok: var(--sem-success); 
            --status-warn: var(--sem-warning);
            --accent: var(--sem-neural);
            
            --radius-base: 8px; 
        }

        /* =========================================
           2. 全局与背景层 (Global & Background)
           ========================================= */
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background-color: var(--bg-base);
            background-image: 
                linear-gradient(var(--grid-color) 1px, transparent 1px),
                linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
            background-size: 32px 32px;
            color: var(--text-primary);
            font-family: var(--font-sans);
            font-size: 14px;
            line-height: 1.6;
            padding: 2rem 4rem;
            min-height: 100vh;
            transition: var(--transition);
        }

        .mono {
            font-family: var(--font-mono);
            text-transform: uppercase;
            font-size: 0.85em;
            letter-spacing: 0.02em;
        }

        /* =========================================
           3. 布局与容器 (Layout & Containers)
           ========================================= */
        .container {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 3rem;
        }

        .grid-3col {
            display: grid;
            grid-template-columns: 1fr 1.5fr 1fr;
            gap: 2rem;
        }

        .grid-2col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
        }

        @media (max-width: 1024px) {
            body { padding: 1rem; }
            .grid-3col, .grid-2col { grid-template-columns: 1fr; }
        }

        .panel {
            background: var(--surface);
            border: 1px solid var(--border-solid);
            border-radius: var(--radius-base);
            padding: 1.5rem;
            position: relative;
            transition: var(--transition);
        }

        /* =========================================
           4. 排版与核心组件 (Typography & Components)
           ========================================= */
        h1 { font-size: 2.5rem; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 0.5rem; line-height: 1.1; }
        h2 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 1.5rem; }
        h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; }

        .label-text { color: var(--text-secondary); margin-bottom: 0.5rem; }
        .divider { border-bottom: 1px dashed var(--border-dashed); margin: 1rem 0; }

        /* Button Variations */
        button {
            background: transparent;
            color: var(--text-primary);
            border: 1px solid var(--border-solid);
            border-radius: var(--radius-base);
            padding: 0.5rem 1rem;
            cursor: pointer;
            transition: var(--transition);
        }
        button:hover:not(:disabled) { background: var(--text-primary); color: var(--text-inverse); }
        button.primary { background: var(--text-primary); color: var(--text-inverse); }
        button.primary:hover:not(:disabled) { background: transparent; color: var(--text-primary); }
        button.danger { border-color: var(--sem-danger); color: var(--sem-danger); }
        button.danger:hover:not(:disabled) { background: var(--sem-danger); color: var(--text-inverse); }
        button:disabled { opacity: 0.4; cursor: not-allowed; border-style: dashed; }

        /* Data Block Variations */
        .data-block {
            border: 1px solid var(--border-solid);
            border-radius: var(--radius-base);
            padding: 1rem;
            background: var(--bg-base);
        }
        .data-block-header {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid var(--border-dashed);
            padding-bottom: 0.5rem;
            margin-bottom: 0.5rem;
        }

        /* List Variations */
        .list-item {
            display: grid;
            grid-template-columns: 40px 1fr auto;
            align-items: center;
            padding: 1rem 0;
            border-bottom: 1px solid var(--border-dashed);
            transition: var(--transition);
        }
        .list-item:hover {
            padding-left: 0.5rem;
            background: linear-gradient(90deg, var(--surface) 0%, transparent 100%);
        }

        /* Terminal Progress Bar */
        .progress-track {
            display: flex;
            align-items: center;
            gap: 1rem;
            font-family: var(--font-mono);
            font-size: 0.85em;
        }
        .progress-fill {
            flex-grow: 1;
            height: 12px;
            background: repeating-linear-gradient(
                90deg,
                var(--sem-info),
                var(--sem-info) 6px,
                transparent 6px,
                transparent 8px
            );
            border: 1px solid var(--sem-info);
        }

        /* Wireframe Switch/Toggle */
        .toggle-switch {
            width: 40px; height: 20px;
            border: 1px solid var(--border-solid);
            border-radius: 99px;
            position: relative;
            cursor: pointer;
            transition: var(--transition);
        }
        .toggle-switch::after {
            content: '';
            position: absolute;
            top: 2px; left: 2px;
            width: 14px; height: 14px;
            background: var(--text-primary);
            border-radius: 50%;
            transition: var(--transition);
        }
        .toggle-switch.active::after { left: 22px; background: var(--status-ok); }
        .toggle-switch.danger.active::after { background: var(--sem-danger); border-color: var(--sem-danger); }
        .toggle-switch.disabled { opacity: 0.4; cursor: not-allowed; border-style: dashed; }
        .toggle-switch.disabled::after { background: var(--text-secondary); }

        /* Status Dot */
        .status-dot {
            display: inline-block;
            width: 8px; height: 8px;
            background-color: var(--status-ok);
            border-radius: 50%;
            margin-right: 8px;
        }
        [data-theme="dark"] .status-dot { box-shadow: 0 0 10px var(--status-ok); }
        .status-dot.accent { background-color: var(--accent); box-shadow: 0 0 10px var(--accent); }
        .status-dot.danger { background-color: var(--sem-danger); box-shadow: 0 0 10px var(--sem-danger); }
        .status-dot.info { background-color: var(--sem-info); box-shadow: 0 0 10px var(--sem-info); }

        /* Color Swatches */
        .color-swatch-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
            margin-top: 1.5rem;
        }
        .color-swatch {
            border: 1px solid var(--border-solid);
            border-radius: var(--radius-base);
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            background: var(--surface);
        }
        .swatch-color {
            height: 4px;
            width: 100%;
            border-radius: 2px;
            margin-bottom: 0.5rem;
        }

        /* Philosophy Section */
        .philosophy-card {
            border-left: 2px solid var(--text-primary);
            padding-left: 1.5rem;
            margin-bottom: 1rem;
        }

        /* Hierarchy & Elements Section */
        .layer-stack {
            display: flex; flex-direction: column; gap: 1rem;
            position: relative; padding-left: 40px; border-left: 1px solid var(--border-dashed);
        }
        .layer-item {
            background: var(--surface); border: 1px solid var(--border-solid);
            padding: 1rem; position: relative; border-radius: var(--radius-base);
            transition: var(--transition);
        }
        .layer-item:hover { transform: translateX(10px); border-color: var(--text-primary); }
        .layer-item::before {
            content: attr(data-z); position: absolute; left: -40px; top: 50%;
            transform: translateY(-50%); font-family: var(--font-mono); font-size: 10px;
            color: var(--text-secondary); background: var(--bg-base); padding: 2px 0;
        }

        header {
            display: flex; justify-content: space-between; align-items: flex-end;
            margin-bottom: 1rem; padding-bottom: 2rem; border-bottom: 1px solid var(--border-solid);
        }
    </style>
</head>
<body>

    <div class="container">
        <!-- Header -->
        <header>
            <div>
                <div class="label-text mono">PRO 4:23 (DEV) | BUILD_LOG_V2</div>
                <h1>空间架构系统 (Spatial OS)</h1>
            </div>
            <button class="mono" onclick="toggleTheme()" id="themeBtn">SWITCH_TO_DARK</button>
        </header>

        <!-- 理念篇：Philosophy -->
        <section class="grid-2col" style="border-bottom: 1px dashed var(--border-dashed); padding-bottom: 3rem;">
            <div>
                <h2 class="mono" style="color: var(--text-secondary);">01 / PRODUCT_PHILOSOPHY</h2>
                <div class="philosophy-card">
                    <h3>Less is More (奥卡姆剃刀)</h3>
                    <p class="label-text" style="color: var(--text-primary);">剥离一切非必要特性。在数据密集的数字环境中，设计不应争夺注意力，而应成为信息的高效导体。通过降低视觉噪声，提升用户的决策信噪比。界面本身应该隐形，让数据和逻辑作为唯一的主角浮现。</p>
                </div>
            </div>
            <div>
                <h2 class="mono" style="color: var(--text-secondary);">02 / DESIGN_PHILOSOPHY</h2>
                <div class="philosophy-card">
                    <h3>Function Dictates Form (功能先验)</h3>
                    <p class="label-text" style="color: var(--text-primary);">摒弃多余的拟物隐喻与纯装饰性元素。用最基础的图元语言——1px精度的边框、严谨的网格、等宽的数据字符——构建绝对理性的数字空间。这不仅是审美选择，更是对系统稳定性、性能表现和信息透明度的视觉承诺。</p>
                </div>
            </div>
        </section>

        <!-- 语义色彩篇：Semantic Colors -->
        <section style="border-bottom: 1px dashed var(--border-dashed); padding-bottom: 3rem;">
            <h2 class="mono" style="color: var(--text-secondary);">03 / SEMANTIC_COLOR_SYSTEM</h2>
            <div class="philosophy-card" style="border-color: var(--sem-info);">
                <h3>Functional Harmony (功能性色彩和谐)</h3>
                <p class="label-text" style="color: var(--text-primary);">色彩绝非装饰，而是数据的另一个维度。在这个极致灰度/暗黑的空间中，我们引入高饱和度的点缀色。它们极其克制地只出现在：状态指示、关键折线图和危险预警中。这是为了在不破坏整体极简基调的前提下，利用人类的“前注意视觉（Pre-attentive Visuals）”实现瞬间的数据解码。</p>
            </div>
            
            <div class="color-swatch-container">
                <div class="color-swatch">
                    <div class="swatch-color" style="background: var(--sem-info); box-shadow: 0 0 8px var(--sem-info);"></div>
                    <div class="mono" style="color: var(--sem-info);">[INFO]</div>
                    <div class="mono label-text" style="font-size: 10px;">DATA / STREAM / NORMAL</div>
                </div>
                <div class="color-swatch">
                    <div class="swatch-color" style="background: var(--sem-success); box-shadow: 0 0 8px var(--sem-success);"></div>
                    <div class="mono" style="color: var(--sem-success);">[SUCCESS]</div>
                    <div class="mono label-text" style="font-size: 10px;">ACTIVE / OK / STABLE</div>
                </div>
                <div class="color-swatch">
                    <div class="swatch-color" style="background: var(--sem-warning); box-shadow: 0 0 8px var(--sem-warning);"></div>
                    <div class="mono" style="color: var(--sem-warning);">[WARNING]</div>
                    <div class="mono label-text" style="font-size: 10px;">PENDING / CAUTION / WAIT</div>
                </div>
                <div class="color-swatch">
                    <div class="swatch-color" style="background: var(--sem-danger); box-shadow: 0 0 8px var(--sem-danger);"></div>
                    <div class="mono" style="color: var(--sem-danger);">[DANGER]</div>
                    <div class="mono label-text" style="font-size: 10px;">ERROR / CRITICAL / HALT</div>
                </div>
                <div class="color-swatch">
                    <div class="swatch-color" style="background: var(--sem-neural); box-shadow: 0 0 8px var(--sem-neural);"></div>
                    <div class="mono" style="color: var(--sem-neural);">[NEURAL]</div>
                    <div class="mono label-text" style="font-size: 10px;">AI / ML TASK / ACCENT</div>
                </div>
            </div>
        </section>

        <!-- 变体展示篇：Dashboard Variations -->
        <section>
            <h2 class="mono label-text" style="margin-bottom: 2rem; margin-top: 3rem;">[SYSTEM_DASHBOARD_PREVIEW]</h2>
                    <div class="panel">
                        <div class="data-block" style="border-color: var(--sem-danger);">
                            <div class="data-block-header mono label-text">
                                <span style="color: var(--sem-danger);">MEM.ALLOC [CRITICAL]</span>
                                <span>0x7FFF80</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: 1rem; align-items: center;">
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <span class="status-dot danger"></span>
                                    <span class="mono" style="font-size: 0.75rem; color: var(--sem-danger);">内存泄漏检测</span>
                                </div>
                                <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Column 2: Data Visualization & Stream -->
                <div class="panel" style="display: flex; flex-direction: column; border-top: 2px solid var(--sem-info);">
                    <div class="mono label-text" style="display: flex; justify-content: space-between;">
                        <span style="color: var(--sem-info);">NEURAL_WAVEFORM</span>
                        <span>[REALTIME]</span>
                    </div>
                    
                    <!-- SVG Wireframe Chart -->
                    <div style="flex-grow: 1; min-height: 120px; border: 1px solid var(--border-dashed); margin: 1rem 0; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; background: color-mix(in srgb, var(--sem-info) 5%, transparent);">
                        <svg width="100%" height="80px" preserveAspectRatio="none" viewBox="0 0 400 80" style="stroke: var(--sem-info); fill: none; stroke-width: 1.5px;">
                            <path d="M0,40 Q50,0 100,40 T200,40 T300,40 T400,40" stroke-dasharray="4 4" style="filter: drop-shadow(0 0 4px var(--sem-info));">
                                <animate attributeName="d" values="M0,40 Q50,0 100,40 T200,40 T300,40 T400,40; M0,40 Q50,80 100,40 T200,40 T300,40 T400,40; M0,40 Q50,0 100,40 T200,40 T300,40 T400,40" dur="3s" repeatCount="indefinite"/>
                            </path>
                            <line x1="0" y1="40" x2="400" y2="40" stroke="var(--sem-info)" stroke-width="1" opacity="0.3" />
                        </svg>
                        <div class="mono" style="position: absolute; bottom: 8px; right: 8px; font-size: 10px; color: var(--sem-info);">FREQ: 144Hz</div>
                    </div>

                    <div class="list-item" style="padding: 0.5rem 0;">
                        <span class="status-dot accent"></span>
                        <div class="mono">SYNC_MATRIX</div>
                        <div class="mono label-text" style="color: var(--sem-neural);">[PROCESSING]</div>
                    </div>
                    <div class="list-item" style="padding: 0.5rem 0; border-bottom: none;">
                        <span class="status-dot info"></span>
                        <div class="mono">NODE_CALIBRATE</div>
                        <div class="mono label-text" style="color: var(--sem-info);">[ROUTING]</div>
                    </div>
                </div>

                <!-- Column 3: Controls & Config -->
                <div class="panel">
                    <div class="mono label-text">GLOBAL_ARRAY_PARAMS</div>
                    <div class="divider"></div>

                    <div style="margin-bottom: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span class="mono" style="font-size: 11px;">SENSITIVITY_THRES</span>
                            <span class="mono" style="font-size: 11px;">0.15 MM</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.01" value="0.15" style="width: 100%; accent-color: var(--text-primary);">
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span class="mono" style="font-size: 11px;">FOV_ELEVATION</span>
                            <span class="mono" style="font-size: 11px;">45°</span>
                        </div>
                        <input type="range" min="0" max="90" value="45" style="width: 100%; accent-color: var(--text-primary);">
                    </div>

                    <div class="divider"></div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 1.5rem;">
                        <button class="mono primary" style="font-size: 11px;">DEPLOY</button>
                        <button class="mono" style="font-size: 11px;">RESET</button>
                    </div>
                </div>
            </div>
        </section>

        <!-- 原子元素与层次篇：Hierarchy & Elements -->
        <section class="grid-2col" style="margin-top: 2rem; border-top: 1px solid var(--border-solid); padding-top: 3rem;">
            <!-- Z轴层级 -->
            <div>
                <h2 class="mono" style="color: var(--text-secondary);">03 / Z_AXIS_HIERARCHY</h2>
                <p class="label-text" style="margin-bottom: 2rem;">空间 UI 依赖严格的 Z 轴逻辑来区分环境、结构与交互焦点。层级明确是 Less is More 的基础。</p>
                
                <div class="layer-stack">
                    <div class="layer-item" data-z="Z-30">
                        <div class="mono label-text">战术焦点 (Tactical Focus)</div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 500;">
                            <span class="status-dot accent"></span> 状态灯 / 控件 (Toggles/Sliders)
                        </div>
                    </div>
                    
                    <div class="layer-item" data-z="Z-20">
                        <div class="mono label-text">信息载体 (Data Vectors)</div>
                        <div style="font-weight: 500;">排版文本 / 线框图表 (Wireframe Charts)</div>
                    </div>
                    
                    <div class="layer-item" data-z="Z-10">
                        <div class="mono label-text">逻辑容器 (Surfaces)</div>
                        <div style="font-weight: 500;">面板 / 数据块 (带 1px 边框约束)</div>
                    </div>

                    <div class="layer-item" data-z="Z-00" style="background: transparent; border-style: dashed;">
                        <div class="mono label-text">绝对环境 (Base Environment)</div>
                        <div style="font-weight: 500; color: var(--text-secondary);">坐标网格底座 (Infinite Grid)</div>
                    </div>
                </div>
            </div>

            <!-- 原子元素 -->
            <div>
                <h2 class="mono" style="color: var(--text-secondary);">05 / ATOMIC_ELEMENTS</h2>
                <p class="label-text" style="margin-bottom: 2rem;">构建复杂数据看板的最小不可拆分图元单元。</p>

                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <div class="data-block">
                        <div class="mono label-text" style="margin-bottom: 0.5rem;">[标签] META_TAGS</div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <span class="mono" style="border: 1px solid var(--border-solid); padding: 2px 6px; border-radius: 2px; font-size: 0.75rem;">READONLY</span>
                            <span class="mono" style="background: var(--sem-success); color: var(--text-inverse); padding: 3px 6px; border-radius: 2px; font-size: 0.75rem;">EXECUTABLE</span>
                            <span class="mono" style="color: var(--sem-warning); padding: 3px 6px; font-size: 0.75rem; border: 1px dashed var(--sem-warning);">[AWAITING]</span>
                            <span class="mono" style="background: color-mix(in srgb, var(--sem-danger) 15%, transparent); color: var(--sem-danger); padding: 3px 6px; font-size: 0.75rem; border: 1px solid var(--sem-danger);">ERR_DUMP</span>
                        </div>
                    </div>

                    <div class="data-block">
                        <div class="mono label-text" style="margin-bottom: 0.5rem;">[交互按钮] INTERACTION_BUTTONS</div>
                        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                            <button class="mono primary" style="font-size: 11px;">PRIMARY_ACT</button>
                            <button class="mono" style="font-size: 11px;">SECONDARY_ACT</button>
                            <button class="mono danger" style="font-size: 11px;">CRITICAL_DEL</button>
                            <button class="mono" disabled style="font-size: 11px;">[DISABLED]</button>
                        </div>
                    </div>

                    <div class="data-block">
                        <div class="mono label-text" style="margin-bottom: 0.5rem;">[分隔/网格] DIVIDERS & GRIDS</div>
                        <div style="border-top: 1px solid var(--border-solid); margin-bottom: 0.5rem;"></div>
                        <div style="border-top: 1px dashed var(--border-dashed);"></div>
                    </div>

                    <div class="data-block">
                        <div class="mono label-text" style="margin-bottom: 0.5rem;">[开关逻辑] BOOLEAN_TOGGLES</div>
                        <div style="display: flex; gap: 2rem; align-items: center; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div class="toggle-switch" onclick="this.classList.toggle('active')"></div>
                                <span class="mono" style="font-size: 10px;">IDLE</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
                                <span class="mono" style="font-size: 10px;">SYS_ACTIVE</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div class="toggle-switch danger active" onclick="this.classList.toggle('active')"></div>
                                <span class="mono" style="font-size: 10px; color: var(--sem-danger);">OVERRIDE</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div class="toggle-switch disabled"></div>
                                <span class="mono label-text" style="font-size: 10px;">LOCKED</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

    </div>

    <script>
        const htmlDoc = document.documentElement;
        const themeBtn = document.getElementById('themeBtn');

        function toggleTheme() {
            const currentTheme = htmlDoc.getAttribute('data-theme');
            if (currentTheme === 'light') {
                htmlDoc.setAttribute('data-theme', 'dark');
                themeBtn.textContent = 'SWITCH_TO_LIGHT';
            } else {
                htmlDoc.setAttribute('data-theme', 'light');
                themeBtn.textContent = 'SWITCH_TO_DARK';
            }
        }
    </script>
</body>
</html>