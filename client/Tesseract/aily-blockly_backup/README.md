# aily blockly

[中文](README_ZH.md) | English

## Overview
`aily-blockly` is being refocused as a Tesseract-first desktop studio for hardware workflow authoring.

The current MVP keeps the original Electron + Angular shell, legacy Blockly editor, board toolchain, serial monitor, and project management flow, while adding:

- a local Tesseract Agent sidecar managed by Electron
- a local n8n runtime managed by Electron
- a new Tesseract Studio workspace as the default project experience
- a fallback legacy Blockly route for existing `.abi` projects

This repository is still the upstream `aily-blockly` codebase, but the active integration direction is now "hardware Cursor": natural language -> workflow blueprint -> local n8n workflow -> hardware configuration guidance.

<img src="./img/home.webp" />

> Status: Tesseract MVP. The desktop shell is usable for development and integration work, but it is not positioned as a production-ready firmware IDE.

## Product Direction
The desktop app now has two project modes:

1. `Tesseract project`
   - Identified by `.tesseract/manifest.json`
   - Workflow snapshot stored in `.tesseract/workflow.json`
   - Opens in `/main/tesseract-studio`
2. `Legacy Blockly project`
   - Identified by `project.abi`
   - Opens in `/main/blockly-editor`

If neither file exists, the project opens in the code editor fallback.

## Runtime Topology
- Electron main process remains JavaScript-based.
- Electron manages a local Tesseract Agent sidecar instead of embedding backend TypeScript directly.
- Electron manages a local n8n instance for workflow editing and deployment.
- Angular talks to both runtimes through preload-exposed desktop APIs.
- Existing cloud chat modes remain available; Tesseract projects default to local Tesseract chat mode.

## Main Capabilities
- Tesseract Studio as the default workspace for new projects
- Local workflow editing through embedded n8n
- Tesseract chat responses rendered with custom `aily-*` markdown viewers
- Legacy Blockly, pinmap, circuit tooling preserved as fallback paths
- Existing hardware ecosystem retained: board packages, npm-managed libraries, serial monitor, build/upload pipeline

## Development
Run commands from this directory.

```bash
npm install
npm start
npm run electron
npm run build
```

The Tesseract desktop runtime depends on the sibling `../backend` workspace being present and buildable. The Electron build flow validates that dependency instead of silently degrading.

## Project Layout
- `src/app/editors/tesseract-studio/`: new Tesseract-first workspace
- `src/app/tools/aily-chat/`: chat UI, markdown viewers, local/remote mode switching
- `src/app/components/float-sider/`: route-aware workspace side rail
- `electron/`: main-process IPC, runtime managers, preload bridge
- `docs/design-docs/tesseract-integration-context.md`: condensed integration context from the PRD and conversation log

## Documentation
- [Design Docs](./docs/DESIGN.md)
- [Tesseract Integration Context](./docs/design-docs/tesseract-integration-context.md)
- [Frontend Guide](./docs/FRONTEND.md)
- [Plans Overview](./docs/PLANS.md)
- [User Documentation](https://aily.pro/doc)
- [Library Adaptation Documentation](https://github.com/ailyProject/aily-blockly-libraries/blob/main/%E5%BA%93%E8%A7%84%E8%8C%83.md)

## Related Repositories
- [Development Boards](https://github.com/ailyProject/aily-blockly-boards)
- [Block Libraries](https://github.com/ailyProject/aily-blockly-libraries)
- [Compilers](https://github.com/ailyProject/aily-blockly-compilers)
- [Related Tools](https://github.com/ailyProject/aily-project-tools)

## Project Sponsorship
This project is sponsored by the following companies and individuals.

### Corporate Sponsors
<a target="_blank" href="https://www.seeedstudio.com/" >
    <img src=".\public\sponsor\seeedstudio\logo_l.webp" alt="seeedstudio" width=200 />
</a><br>
<a target="_blank" href="https://www.seekfree.cn/" >
    <img src=".\public\sponsor\seekfree\logo_l.webp" alt="seekfree" width=200 />
</a><br>
<a target="_blank" href="https://www.diandeng.tech/" >
    <img src=".\public\sponsor\diandeng\logo_l.webp" alt="diandeng" width=200 />
</a><br>
<a target="_blank" href="https://www.openjumper.com/" >
    <img src=".\public\sponsor\openjumper\logo.webp" alt="openjumper" width=200 />
</a><br>
<a target="_blank" href="https://www.pdmicro.cn/" >
    <img src=".\public\sponsor\pengde\logo.webp" alt="pengde" width=200 />
</a><br>
<a target="_blank" href="https://www.titlab.cn/" >
    <img src=".\public\sponsor\titlab\logo_l.webp" alt="titlab" width=200 />
</a><br>
<a target="_blank" href="https://www.emakefun.com" >
    <img src=".\public\sponsor\emakefun\logo_l.webp" alt="emakefun" width=200 />
</a><br>
<a target="_blank" href="http://www.keyes-robot.com/" >
    <img src=".\public\sponsor\keyes\logo_l.webp" alt="keyes" width=200 />
</a>

### Individual Sponsors
Tao Dong (Tianwei Electronics)
Xia Qing (Mushroom Cloud Maker Space)
Du Zhongzhong Dzz (Community Partner)
Li Duan (Yixuehui)
Sun Junjie (Community Partner)

## Main Open Source Projects Used in This Project
- [electron](https://www.electronjs.org/)
- [angular](https://angular.dev/)
- [node](https://nodejs.org/)
- [n8n](https://n8n.io/)

Other dependencies can be found in [package.json](./package.json).

## AI References
- [Kode](https://github.com/shareAI-lab/Kode-cli)
- [copilot](https://github.com/microsoft/vscode-copilot-chat)

## Additional Rights Statement
1. This software is free software under the GPL license. Without authorization, the sale of this software or derivative software based on this software is prohibited.
2. Hardware works developed using this software are not restricted by the GPL, and users may decide on their own release and usage methods.
3. For derivatives based on this software, information about relevant rights holders and sponsors of this project must not be removed, and such information must appear on the software startup page.
4. The online service content attached to this project must not be removed.
