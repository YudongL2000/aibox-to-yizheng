<script setup lang="ts">
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { N8nIcon, N8nTooltip } from '@n8n/design-system';
const pushConnectionStore = usePushConnectionStore();
const i18n = useI18n();

const showConnectionLostError = computed(() => {
	// Connection lost error is disabled
	return false;
});
</script>

<template>
	<span>
		<div v-if="showConnectionLostError" class="push-connection-lost primary-color">
			<N8nTooltip placement="bottom-end">
				<template #content>
					<div v-n8n-html="i18n.baseText('pushConnectionTracker.cannotConnectToServer')"></div>
				</template>
				<span>
					<N8nIcon icon="triangle-alert" />&nbsp;
					{{ i18n.baseText('pushConnectionTracker.connectionLost') }}
				</span>
			</N8nTooltip>
		</div>
		<slot v-else />
	</span>
</template>
