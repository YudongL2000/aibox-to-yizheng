<script setup lang="ts">
import { inject, computed } from 'vue';
import { CanvasNodeKey } from '@/app/constants';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import CustomNodeHoverInfo from './parts/CustomNodeHoverInfo.vue';

const node = inject(CanvasNodeKey)!;

const options = computed(() => node.data.value.render?.options || {});
const nodeData = computed(() => node.data.value);
</script>

<template>
	<N8nTooltip
		placement="top"
		:show-after="300"
		:show-arrow="false"
		popper-class="custom-node-hover-tooltip"
		:popper-options="{ modifiers: [{ name: 'flip', enabled: false }] }"
	>
		<template #content>
			<CustomNodeHoverInfo
				:node-data="nodeData"
				accent-color="#06b6d4"
				type-label="SENSOR"
			/>
		</template>
		<div class="custom-node sensor-node">
		<!-- 左侧青色竖线 -->
		<div class="left-accent"></div>

		<!-- 四个角的L形括号 -->
		<div class="corner-bracket corner-top-left"></div>
		<div class="corner-bracket corner-top-right"></div>
		<div class="corner-bracket corner-bottom-left"></div>
		<div class="corner-bracket corner-bottom-right"></div>

		<!-- 头部区域 -->
		<div class="header">
			<div class="header-left">
				<!-- 青色传感器图标 -->
				<N8nIcon icon="camera" size="small" class="type-icon" />
				<!-- SENSOR 标签 -->
				<span class="type-label">SENSOR</span>
			</div>
			<!-- 右上角淡青色点 -->
			<div class="header-dot"></div>
		</div>

		<!-- 内容区域 -->
		<div class="content">
			<!-- 主标题：大号白色粗体 -->
			<div class="main-title">{{ options.title || node.data.value.name }}</div>
			<!-- 副标题：小号灰色 -->
			<div class="subtitle">{{ options.subtitle || 'FN: Sensor' }}</div>
		</div>
		</div>
	</N8nTooltip>
</template>

<style scoped lang="scss">
.sensor-node {
	position: relative;
	width: 100%;
	min-width: 200px;
	padding: 16px 20px;
	background: #1a1a1a;
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 0;
	color: #fff;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

	/* 左侧青色竖线 */
	.left-accent {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: #06b6d4;
		border-radius: 0;
		box-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
	}

	/* 四个角的L形括号 */
	.corner-bracket {
		position: absolute;
		width: 12px;
		height: 12px;
		border: 1px solid rgba(200, 200, 200, 0.4);
		pointer-events: none;

		&.corner-top-left {
			top: 0;
			left: 0;
			border-right: none;
			border-bottom: none;
			border-top-left-radius: 0;
			box-shadow:
				inset 0 0 4px rgba(6, 182, 212, 0.3),
				0 0 2px rgba(6, 182, 212, 0.2);
		}

		&.corner-top-right {
			top: 0;
			right: 0;
			border-left: none;
			border-bottom: none;
			border-top-right-radius: 0;
			box-shadow:
				inset 0 0 4px rgba(6, 182, 212, 0.3),
				0 0 2px rgba(6, 182, 212, 0.2);
		}

		&.corner-bottom-left {
			bottom: 0;
			left: 0;
			border-right: none;
			border-top: none;
			border-bottom-left-radius: 0;
			box-shadow:
				inset 0 0 4px rgba(6, 182, 212, 0.3),
				0 0 2px rgba(6, 182, 212, 0.2);
		}

		&.corner-bottom-right {
			bottom: 0;
			right: 0;
			border-left: none;
			border-top: none;
			border-bottom-right-radius: 0;
			box-shadow:
				inset 0 0 4px rgba(6, 182, 212, 0.3),
				0 0 2px rgba(6, 182, 212, 0.2);
		}
	}

	/* 头部区域：暗色透明背景与下方标题/说明区分 */
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: -16px -20px 12px -20px;
		padding: 10px 20px 10px 12px;
		background: rgba(0, 0, 0, 0.35);

		.header-left {
			display: flex;
			align-items: center;
			gap: 6px;
		}

		.type-icon {
			color: #06b6d4;
			filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.6));
		}

		.type-label {
			font-size: 10px;
			font-weight: 700;
			letter-spacing: 1px;
			color: #06b6d4;
			text-transform: uppercase;
			filter: drop-shadow(0 0 2px rgba(6, 182, 212, 0.5));
		}

		.header-dot {
			width: 6px;
			height: 6px;
			border-radius: 50%;
			background: rgba(6, 182, 212, 0.4);
			box-shadow: 0 0 4px rgba(6, 182, 212, 0.3);
		}
	}

	/* 内容区域 */
	.content {
		padding-left: 8px;
		text-align: left;

		.main-title {
			font-size: 16px;
			font-weight: 700;
			color: #ffffff;
			margin-bottom: 6px;
			line-height: 1.3;
		}

		.subtitle {
			font-size: 11px;
			color: rgba(200, 200, 200, 0.7);
			font-weight: 400;
		}
	}
}
</style>
