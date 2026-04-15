# bank/
> L2 | 父级: ../CLAUDE.md

成员清单
world.md: 相对客观、稳定的项目事实与环境背景。
experience.md: 已验证经验、踩坑记录与有效 workflow。
opinions.md: 偏好、判断与倾向，带简单置信度。
entities/: 反复出现的人、项目、产品实体页目录。

架构决策
- `bank/` 只收录已经稳定或重复出现的长期记忆，不直接接收原始会话内容。
- `world.md` 放客观事实，`experience.md` 放经验教训，`opinions.md` 放偏好判断；三者不能混写。
- 当主题膨胀时，优先拆分文件，而不是继续向单页堆积。

开发规范
- 新内容必须先从 `daily/` 晋升，而不是直接落入 `bank/`。
- `opinions.md` 的偏好必须带简单置信度，避免一次性表述被当成铁律。

变更日志
- 2026-03-13: 建立 bank 目录，拆分 world / experience / opinions / entities 四类长期记忆。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
