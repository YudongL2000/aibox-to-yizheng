<script lang="ts" setup>
import { h, inject } from 'vue';
import CanvasNodeDefault from './render-types/CanvasNodeDefault.vue';
import CanvasNodeStickyNote from './render-types/CanvasNodeStickyNote.vue';
import CanvasNodeAddNodes from './render-types/CanvasNodeAddNodes.vue';
import CanvasNodeChoicePrompt from './render-types/CanvasNodeChoicePrompt.vue';
import { CanvasNodeKey } from '@/app/constants';
import { CanvasNodeRenderType } from '../../../canvas.types';
import CanvasNodeTrigger
	from "@/features/workflows/canvas/components/elements/nodes/render-types/CanvasNodeTrigger.vue";
import CanvasNodeSensor
	from "@/features/workflows/canvas/components/elements/nodes/render-types/CanvasNodeSensor.vue";
import CanvasNodeProcessor
	from "@/features/workflows/canvas/components/elements/nodes/render-types/CanvasNodeProcessor.vue";
import CanvasNodeLogic
	from "@/features/workflows/canvas/components/elements/nodes/render-types/CanvasNodeLogic.vue";
import CanvasNodeActuator
	from "@/features/workflows/canvas/components/elements/nodes/render-types/CanvasNodeActuator.vue";

const node = inject(CanvasNodeKey);

const Render = () => {
	const renderType = node?.data.value.render.type ?? CanvasNodeRenderType.Default;
	let Component;

	switch (renderType) {
		case CanvasNodeRenderType.StickyNote:
			Component = CanvasNodeStickyNote;
			break;
		case CanvasNodeRenderType.AddNodes:
			Component = CanvasNodeAddNodes;
			break;
		case CanvasNodeRenderType.ChoicePrompt:
			Component = CanvasNodeChoicePrompt;
			break;
		case CanvasNodeRenderType.Trigger:
			Component = CanvasNodeTrigger;
			break;
		case CanvasNodeRenderType.Sensor:
			Component = CanvasNodeSensor;
			break;
		case CanvasNodeRenderType.Processor:
			Component = CanvasNodeProcessor;
			break;
		case CanvasNodeRenderType.Logic:
			Component = CanvasNodeLogic;
			break;
		case CanvasNodeRenderType.Actuator:
			Component = CanvasNodeActuator;
			break;
		default:
			Component = CanvasNodeDefault;
	}

	return h(Component, {
		'data-canvas-node-render-type': renderType,
	});
};
</script>

<template>
	<Render />
</template>
