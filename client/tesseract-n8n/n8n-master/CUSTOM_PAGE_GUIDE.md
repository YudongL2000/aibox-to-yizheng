# n8n 自定义页面开发指南

## 📋 目录
1. [启动项目](#启动项目)
2. [访问现有页面](#访问现有页面)
3. [添加自定义页面](#添加自定义页面)
4. [示例：创建自定义页面](#示例创建自定义页面)

---

## 🚀 启动项目

### 方法 1：开发模式（推荐，支持热重载）
```bash
cd /Users/liuxiaolin/Desktop/n8n_base/n8n-master
pnpm dev
```

启动后访问：**http://localhost:5678**

### 方法 2：仅前端开发
```bash
pnpm dev:fe
```

### 方法 3：仅后端开发
```bash
pnpm dev:be
```

---

## 🌐 访问现有页面

启动项目后，可以通过以下 URL 访问不同的页面：

### 主要页面
- **工作流列表**：http://localhost:5678/home/workflows
- **新建工作流**：http://localhost:5678/workflow/new
- **执行历史**：http://localhost:5678/executions
- **凭证管理**：http://localhost:5678/credentials
- **设置页面**：http://localhost:5678/settings
- **模板库**：http://localhost:5678/templates/

### 认证页面
- **登录**：http://localhost:5678/signin
- **注册**：http://localhost:5678/signup
- **设置向导**：http://localhost:5678/setup

### 工作流相关
- **工作流编辑器**：http://localhost:5678/workflow/:workflowId
- **工作流执行**：http://localhost:5678/workflow/:workflowId/executions

---

## ➕ 添加自定义页面

### 步骤 1：创建视图组件

在 `packages/frontend/editor-ui/src/app/views/` 目录下创建你的 Vue 组件：

```vue
<!-- packages/frontend/editor-ui/src/app/views/MyCustomView.vue -->
<template>
  <div class="custom-page">
    <div class="container">
      <h1>我的自定义页面</h1>
      <p>这是你的自定义页面内容</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

onMounted(() => {
  console.log('自定义页面已加载');
});
</script>

<style scoped>
.custom-page {
  padding: 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
```

### 步骤 2：在导航常量中添加视图名称

编辑 `packages/frontend/editor-ui/src/app/constants/navigation.ts`：

```typescript
export const enum VIEWS {
  // ... 现有视图
  MY_CUSTOM_PAGE = 'MyCustomPage', // 添加这一行
}
```

### 步骤 3：在路由中添加路由配置

编辑 `packages/frontend/editor-ui/src/app/router.ts`：

```typescript
import MyCustomView from '@/app/views/MyCustomView.vue'; // 导入组件

export const routes: RouteRecordRaw[] = [
  // ... 现有路由
  {
    path: '/my-custom-page',
    name: VIEWS.MY_CUSTOM_PAGE,
    component: MyCustomView,
    meta: {
      middleware: ['authenticated'], // 需要登录才能访问
      // 或者使用 'guest' 允许未登录用户访问
    },
  },
];
```

### 步骤 4：重新启动开发服务器

修改路由配置后，需要重启开发服务器：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
pnpm dev
```

### 步骤 5：访问你的页面

访问：**http://localhost:5678/my-custom-page**

---

## 📝 示例：创建自定义页面

### 完整示例：创建一个"关于我们"页面

#### 1. 创建视图组件

```vue
<!-- packages/frontend/editor-ui/src/app/views/AboutView.vue -->
<template>
  <div class="about-page">
    <div class="container">
      <h1>关于 n8n</h1>
      <div class="content">
        <p>这是自定义的关于页面</p>
        <el-button @click="goHome">返回首页</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';

const router = useRouter();

const goHome = () => {
  router.push({ name: VIEWS.WORKFLOWS });
};
</script>

<style scoped>
.about-page {
  padding: 2rem;
  min-height: 100vh;
  background: var(--color-background-base);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.content {
  margin-top: 2rem;
}
</style>
```

#### 2. 添加到导航常量

在 `packages/frontend/editor-ui/src/app/constants/navigation.ts` 中添加：

```typescript
export const enum VIEWS {
  // ... 现有代码
  ABOUT = 'AboutView',
}
```

#### 3. 添加到路由

在 `packages/frontend/editor-ui/src/app/router.ts` 中添加：

```typescript
import AboutView from '@/app/views/AboutView.vue';

export const routes: RouteRecordRaw[] = [
  // ... 现有路由
  {
    path: '/about',
    name: VIEWS.ABOUT,
    component: AboutView,
    meta: {
      middleware: ['authenticated'],
    },
  },
];
```

#### 4. 访问页面

启动项目后访问：**http://localhost:5678/about**

---

## 🎨 使用 n8n 设计系统组件

n8n 使用 Element Plus 和自定义设计系统，你可以使用这些组件：

```vue
<template>
  <div>
    <!-- Element Plus 组件 -->
    <el-button type="primary">按钮</el-button>
    <el-input v-model="input" placeholder="输入框" />
    
    <!-- n8n 自定义组件 -->
    <n8n-heading tag="h1">标题</n8n-heading>
    <n8n-text>文本内容</n8n-text>
  </div>
</template>
```

---

## 🔗 添加导航链接

如果你想在侧边栏或导航菜单中添加链接，需要修改相应的导航组件：

### 在主菜单中添加

编辑 `packages/frontend/editor-ui/src/app/components/AppSidebar.vue` 或相关导航组件。

### 在设置页面中添加

编辑 `packages/frontend/editor-ui/src/features/settings/` 下的相关组件。

---

## 📚 常用路由配置选项

```typescript
{
  path: '/your-path',
  name: VIEWS.YOUR_VIEW,
  component: YourComponent,
  meta: {
    // 中间件配置
    middleware: ['authenticated'], // 需要登录
    // middleware: ['guest'],      // 仅未登录用户
    // middleware: ['enterprise'], // 需要企业版
    
    // 布局配置
    layout: 'default', // 默认布局
    // layout: 'workflow', // 工作流布局
    // layout: 'auth',     // 认证布局
    
    // 企业版功能检查
    middlewareOptions: {
      enterprise: {
        feature: [EnterpriseEditionFeature.YourFeature],
      },
    },
    
    // 遥测配置
    telemetry: {
      pageCategory: 'settings',
      getProperties(route) {
        return {
          custom_property: route.params.id,
        };
      },
    },
  },
}
```

---

## 🛠️ 调试技巧

1. **查看路由配置**：`packages/frontend/editor-ui/src/app/router.ts`
2. **查看所有视图**：`packages/frontend/editor-ui/src/app/constants/navigation.ts`
3. **查看现有页面示例**：`packages/frontend/editor-ui/src/app/views/`
4. **使用 Vue DevTools**：安装浏览器扩展进行调试
5. **查看控制台日志**：浏览器开发者工具中的 Console

---

## ⚠️ 注意事项

1. **TypeScript 类型**：确保导入的类型正确
2. **样式作用域**：使用 `<style scoped>` 避免样式冲突
3. **路由名称**：确保路由名称在 `VIEWS` 枚举中唯一
4. **权限检查**：根据页面需求设置正确的中间件
5. **热重载**：开发模式下修改代码会自动重新编译

---

## 📖 相关资源

- [Vue 3 文档](https://vuejs.org/)
- [Vue Router 文档](https://router.vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
- [n8n 贡献指南](../CONTRIBUTING.md)

---

## 💡 快速开始模板

创建一个新页面的快速命令：

```bash
# 1. 创建视图文件
touch packages/frontend/editor-ui/src/app/views/MyPage.vue

# 2. 编辑文件添加内容（使用上面的模板）

# 3. 添加到 navigation.ts（手动编辑）

# 4. 添加到 router.ts（手动编辑）

# 5. 重启开发服务器
pnpm dev
```

现在你可以开始创建自己的自定义页面了！🎉
