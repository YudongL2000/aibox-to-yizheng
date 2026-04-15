<template>
	<div class="custom-page">
		<div class="container">
			<n8n-heading tag="h1" size="2xlarge">我的自定义页面</n8n-heading>
			<n8n-text size="large" class="mb-l">
				这是你的自定义页面内容。你可以在这里添加任何你需要的功能。
			</n8n-text>

			<div class="content-section">
				<el-card class="mb-m">
					<template #header>
						<span>功能示例</span>
					</template>
					<div class="button-group">
						<el-button type="primary" @click="handleClick">主要按钮</el-button>
						<el-button type="success" @click="goToWorkflows">查看工作流</el-button>
						<el-button type="info" @click="showMessage">显示消息</el-button>
					</div>
				</el-card>

				<el-card>
					<template #header>
						<span>信息卡片</span>
					</template>
					<n8n-text>
						当前时间：{{ currentTime }}
					</n8n-text>
					<n8n-text class="mt-s">
						页面已加载 {{ loadCount }} 次
					</n8n-text>
				</el-card>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';

const router = useRouter();
const toast = useToast();

const currentTime = ref(new Date().toLocaleString());
const loadCount = ref(1);
let timer: ReturnType<typeof setInterval> | null = null;

const handleClick = () => {
	toast.showMessage({
		title: '点击成功',
		message: '你点击了主要按钮！',
		type: 'success',
	});
};

const goToWorkflows = () => {
	router.push({ name: VIEWS.WORKFLOWS });
};

const showMessage = () => {
	toast.showMessage({
		title: '自定义消息',
		message: '这是一个自定义消息示例',
		type: 'info',
	});
};

onMounted(() => {
	// 更新当前时间
	timer = setInterval(() => {
		currentTime.value = new Date().toLocaleString();
	}, 1000);
});

onUnmounted(() => {
	if (timer) {
		clearInterval(timer);
	}
});
</script>

<style scoped>
.custom-page {
	padding: var(--spacing-xl);
	min-height: 100vh;
	background: var(--color-background-base);
}

.container {
	max-width: 1200px;
	margin: 0 auto;
}

.content-section {
	margin-top: var(--spacing-xl);
}

.button-group {
	display: flex;
	gap: var(--spacing-s);
	flex-wrap: wrap;
}

.mb-l {
	margin-bottom: var(--spacing-l);
}

.mb-m {
	margin-bottom: var(--spacing-m);
}

.mt-s {
	margin-top: var(--spacing-s);
}
</style>
