<script setup lang="ts">
import { computed } from 'vue';
import type { CanvasNodeData } from '@/features/workflows/canvas/canvas.types';

const props = defineProps<{
	nodeData: CanvasNodeData;
	accentColor: string;
	typeLabel: string;
}>();

const renderOptions = computed(
	() => (props.nodeData.render as { options?: Record<string, unknown> } | undefined)?.options,
);
</script>

<template>
	<div class="custom-node-hover-info" :style="{ '--accent': accentColor }">
		<div class="hover-info-row type-row">
			<span class="type-label">{{ typeLabel }}</span>
		</div>
		<div class="hover-info-row">
			<span class="label">名称</span>
			<span class="value">{{ nodeData.name }}</span>
		</div>
		<div class="hover-info-row">
			<span class="label">节点类型</span>
			<span class="value">{{ nodeData.type }}</span>
		</div>
		<template v-if="renderOptions">
			<div v-if="renderOptions.title" class="hover-info-row">
				<span class="label">标题</span>
				<span class="value">{{ renderOptions.title }}</span>
			</div>
			<div v-if="renderOptions.subtitle" class="hover-info-row">
				<span class="label">描述</span>
				<span class="value">{{ renderOptions.subtitle }}</span>
			</div>
			<div v-if="renderOptions.displayName" class="hover-info-row">
				<span class="label">显示名</span>
				<span class="value">{{ renderOptions.displayName }}</span>
			</div>
			<div v-if="renderOptions.nodeType" class="hover-info-row">
				<span class="label">Node Type</span>
				<span class="value">{{ renderOptions.nodeType }}</span>
			</div>
		</template>
		<div class="hover-info-row">
			<span class="label">ID</span>
			<span class="value id">{{ nodeData.id }}</span>
		</div>
		<div v-if="nodeData.disabled" class="hover-info-row">
			<span class="value status disabled">已禁用</span>
		</div>
		<div v-else-if="nodeData.execution?.running" class="hover-info-row">
			<span class="value status running">运行中</span>
		</div>
		<div v-else-if="nodeData.execution?.status" class="hover-info-row">
			<span class="value status">{{ nodeData.execution.status }}</span>
		</div>
	</div>
</template>

<style scoped lang="scss">
.custom-node-hover-info {
	--accent: #3b82f6;
	min-width: 200px;
	max-width: 320px;
	padding: 12px 14px;
	background: rgba(26, 26, 26, 0.98);
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-top: 2px solid var(--accent);
	border-radius: 0;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
	text-align: left;
	font-size: 12px;
	color: #e5e5e5;

	.hover-info-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px;
		padding: 4px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);

		&:last-child {
			border-bottom: none;
		}

		&.type-row {
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
			margin-bottom: 4px;
			padding-bottom: 8px;
		}
	}

	.type-label {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 1px;
		color: var(--accent);
		text-transform: uppercase;
	}

	.label {
		flex-shrink: 0;
		color: rgba(200, 200, 200, 0.8);
		min-width: 64px;
	}

	.value {
		color: #fff;
		word-break: break-all;

		&.id {
			font-size: 11px;
			color: rgba(200, 200, 200, 0.9);
		}

		&.status {
			&.disabled {
				color: rgba(255, 200, 100, 0.9);
			}
			&.running {
				color: #00ff88;
			}
		}
	}
}
</style>
