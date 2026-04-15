# Component Reuse Rule

- Prefer reusing existing components, services, and modules before creating new ones.
- Search the current workspace and the target module first, especially shared UI, agent, workflow, and bridge layers.
- New abstractions are allowed only when existing implementations cannot satisfy the requirement without distortion.
- When a new module is introduced, update the owning directory `.folder.md` so the reuse boundary stays visible.
