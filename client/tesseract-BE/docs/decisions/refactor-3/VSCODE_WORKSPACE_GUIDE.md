# VSCode 工作区使用指南

## 快速启动

```bash
# 在项目根目录打开工作区
code refactor3-parallel.code-workspace
```

## ⚠️ 重要：WSL + VSCode 路径兼容性

由于 worktree 在 WSL 中创建，但 VSCode 在 Windows 上运行，Git 路径格式不兼容。

### 问题现象
- VSCode 源代码管理面板只显示 main 仓库
- 其他 5 个 worktree 不显示 Git 状态

### 解决方案

**步骤 1: 修复路径（在 PowerShell 中执行）**

```powershell
cd C:\Users\sam\Documents\Sam\code\tesseract-BE
.\docs\scripts\fix-worktree-paths-for-vscode.ps1
```

**步骤 2: 重新加载 VSCode**

```
Ctrl+Shift+P → "Developer: Reload Window"
```

**步骤 3: 查看源代码管理**

```
Ctrl+Shift+G → 应该显示 6 个仓库
```

### 如果需要在 WSL 中使用 Git

修复路径后，WSL 中的 Git 命令会失败。需要先恢复路径：

```bash
# 在 WSL 中执行
bash docs/scripts/restore-worktree-paths-for-wsl.sh

# 然后可以正常使用 Git
cd /mnt/c/Users/sam/Documents/Sam/code/.zcf/tesseract-BE/feat-capability-registry
git status
```

### 工作流建议

1. **开发时**：使用 VSCode (Windows 路径)
   - 在 PowerShell 中执行 `fix-worktree-paths-for-vscode.ps1`
   - 使用 VSCode 的 Git UI 进行提交和推送

2. **命令行操作时**：使用 WSL (Unix 路径)
   - 在 WSL 中执行 `restore-worktree-paths-for-wsl.sh`
   - 使用 tmux + bash 进行 Git 操作

3. **切换环境时**：运行对应的脚本即可

---

## 工作区结构

工作区包含 6 个文件夹：

```
🏠 Main (tesseract-BE)              # 主仓库（main 分支）
📦 feat/capability-registry         # Worktree 1: 能力注册表
🧠 feat/reflection-engine           # Worktree 2: 反思引擎
🔧 feat/component-composer-refactor # Worktree 3: 组件组合器重构
🎯 feat/orchestrator-integration    # Worktree 4: Orchestrator 集成
🔀 chore/integrate-refactor3        # Worktree 5: 集成分支
```

## 核心功能

### 1. 多仓库 Git 管理

**源代码管理面板** (`Ctrl+Shift+G`):
- 显示所有 6 个仓库的 Git 状态
- 每个仓库独立的暂存区和提交历史
- 支持同时查看多个分支的变更

### 2. 跨 Worktree 文件导航

**快速打开** (`Ctrl+P`):
- 输入文件名，搜索所有 worktree
- 自动显示文件所在的分支
- 快速在不同分支间切换同一文件

**资源管理器** (`Ctrl+Shift+E`):
- 树形展示所有文件夹
- 每个 worktree 独立的文件树
- 支持拖拽文件在不同 worktree 间对比

### 3. 全局搜索

**搜索面板** (`Ctrl+Shift+F`):
- 搜索范围覆盖所有 worktree
- 可按文件夹过滤搜索结果
- 支持正则表达式和大小写敏感

### 4. 终端集成

**集成终端** (`` Ctrl+` ``):
- 每个文件夹独立的终端会话
- 自动切换到对应 worktree 目录
- 支持多终端并行执行命令

## 推荐扩展

工作区已配置推荐扩展：

1. **GitLens** (`eamodio.gitlens`)
   - 增强 Git 功能
   - 显示代码作者和提交历史
   - 支持分支对比和合并预览

2. **Git Graph** (`mhutchie.git-graph`)
   - 可视化 Git 提交图
   - 查看分支关系和合并历史
   - 支持交互式 rebase 和 cherry-pick

## 常用快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+E` | 打开资源管理器 |
| `Ctrl+Shift+G` | 打开源代码管理 |
| `Ctrl+Shift+F` | 全局搜索 |
| `Ctrl+P` | 快速打开文件 |
| `Ctrl+Shift+P` | 命令面板 |
| `` Ctrl+` `` | 打开终端 |
| `Ctrl+K Ctrl+O` | 打开文件夹 |
| `Ctrl+K F` | 关闭文件夹 |

## 工作流示例

### 场景 1: 同时开发多个分支

1. 在 Pane 0 (capability-registry) 编写代码
2. `Ctrl+Shift+G` 查看变更
3. 暂存并提交到 feat/capability-registry
4. `Ctrl+P` 切换到 Pane 1 (reflection-engine)
5. 继续开发，无需切换分支

### 场景 2: 对比不同分支的同一文件

1. `Ctrl+P` 输入文件名（如 `types.ts`）
2. 选择 main 分支的 types.ts
3. 右键 → "Select for Compare"
4. `Ctrl+P` 再次输入 `types.ts`
5. 选择 feat/capability-registry 的 types.ts
6. 右键 → "Compare with Selected"

### 场景 3: 集成时解决冲突

1. 在 Integrator pane (chore/integrate-refactor3) 执行合并
2. VSCode 自动检测冲突文件
3. 源代码管理面板显示冲突标记
4. 点击冲突文件，使用内置合并编辑器
5. 解决冲突后暂存并提交

## 注意事项

1. **不要在 main 分支直接修改代码**
   - main 仅用于拉取最新代码
   - 所有开发在 feat 分支进行

2. **定期同步 worktree**
   - 每天开始前 `git pull` 更新 main
   - 从 chore/integrate-refactor3 拉取已合并的代码

3. **避免跨 worktree 复制粘贴**
   - 使用 Git 合并而非手动复制
   - 保持每个分支的独立性

4. **关闭工作区时不会删除 worktree**
   - Worktree 仍然存在于 `../.zcf/tesseract-BE/`
   - 下次打开工作区即可继续使用

## 故障排除

### 问题 1: 源代码管理面板不显示某个仓库

**解决**:
```bash
# 在该 worktree 目录执行
git status

# 如果提示 "not a git repository"，重新创建 worktree
cd /mnt/c/Users/sam/Documents/Sam/code/tesseract-BE
git worktree remove ../.zcf/tesseract-BE/feat-capability-registry --force
git worktree add ../.zcf/tesseract-BE/feat-capability-registry feat/capability-registry
```

### 问题 2: 文件搜索找不到 worktree 中的文件

**解决**:
1. `Ctrl+Shift+P` → "Reload Window"
2. 或关闭并重新打开工作区文件

### 问题 3: Git 操作提示权限错误

**解决**:
```bash
# 检查 SSH agent
ssh-add -l

# 如果未加载密钥
eval $(ssh-agent -s)
ssh-add ~/.ssh/id_rsa
```

---

**Conceived by Romuald Członkowski** - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)
