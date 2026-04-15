# Codex Client MCP Setup

面向截图中的 `Connect to a custom MCP` 表单，说明如何把 Codex 客户端接到本项目的 MCP Memory 服务。

## 适用场景

- 你已经有一个正在运行的 MCP Memory HTTP 服务
- 你准备在 Codex 客户端里通过 `Streamable HTTP` 接入它
- 你看到的表单字段和截图一致：`URL`、`Bearer token env var`、`Headers`、`Headers from environment variables`

## 先说结论

如果你连接的是一个已经在跑的 HTTP MCP 服务，选 `Streamable HTTP`，不要选 `STDIO`。

`STDIO` 用于“由客户端拉起一个本地进程”，不适合“连接已经在运行的服务”。

## 服务端前提

在填写客户端前，服务端至少要满足下面三点：

1. MCP 入口是 `/mcp`
2. HTTP 服务已经在监听
3. 你知道鉴权方式是 `Authorization: Bearer <token>` 还是 `X-API-Key: <token>`

常见地址形态：

- 本机同网段或 WSL 暴露地址：`http://<host>:8011/mcp`
- 公网 HTTPS 地址：`https://<domain>/mcp`

不要把 REST API 地址 `/api` 填到这里。这个表单需要的是 MCP 入口 `/mcp`。

## 字段怎么填

### Name

建议填写：

```text
mcp-memory
```

这只是客户端里的显示名，不影响服务端。

### Transport

选择：

```text
Streamable HTTP
```

### URL

填写 MCP 入口：

```text
http://172.22.224.57:8011/mcp
```

或者公网版本：

```text
https://memory.example.com/mcp
```

如果你是 Windows 客户端连 WSL 里的服务，优先填 WSL 的可访问地址，不要默认假设 `localhost` 一定可用。

### Bearer token env var

这个字段填的是“环境变量名”，不是 token 明文。

正确示例：

```text
MCP_API_KEY
```

错误示例：

```text
a66ff8ad030ad94414efceab748073f2beb1cdd2aae8a601
```

只有当客户端运行环境里真的存在 `MCP_API_KEY=<你的 token>` 时，这个字段才会生效。

### Headers

如果你想直接把 token 明文写进当前配置，可以在这里填。

Bearer 写法：

| Key | Value |
|-----|-------|
| `Authorization` | `Bearer <your-token>` |

如果你的服务端更偏向 `X-API-Key`，也可以这样填：

| Key | Value |
|-----|-------|
| `X-API-Key` | `<your-token>` |

### Headers from environment variables

这个区域用于“请求头名 -> 本地环境变量名”的映射。

示例一：通过环境变量注入 Bearer 所以这里留空

- 如果你已经用了 `Bearer token env var = MCP_API_KEY`，这里通常不需要再配

示例二：通过环境变量注入 `X-API-Key`

| Key | Value |
|-----|-------|
| `X-API-Key` | `MCP_API_KEY` |

这里的 `Value` 也应当是环境变量名，不是实际 token。

## 两套推荐配置

### 方案 A：最直接，先连通再说

适合先验证链路，不依赖客户端环境变量。

| 字段 | 值 |
|-----|----|
| `Name` | `mcp-memory` |
| `Transport` | `Streamable HTTP` |
| `URL` | `http://172.22.224.57:8011/mcp` |
| `Bearer token env var` | 留空 |
| `Headers` | `Authorization = Bearer <your-token>` |
| `Headers from environment variables` | 留空 |

### 方案 B：更干净，不在 UI 里写明文 token

适合本地客户端能读取环境变量的场景。

先在客户端运行环境里准备：

```bash
export MCP_API_KEY='your-token'
```

然后表单这样填：

| 字段 | 值 |
|-----|----|
| `Name` | `mcp-memory` |
| `Transport` | `Streamable HTTP` |
| `URL` | `http://172.22.224.57:8011/mcp` |
| `Bearer token env var` | `MCP_API_KEY` |
| `Headers` | 留空 |
| `Headers from environment variables` | 留空 |

如果你的服务端要求 `X-API-Key` 而不是 Bearer：

| 字段 | 值 |
|-----|----|
| `Headers from environment variables` | `X-API-Key = MCP_API_KEY` |

## 本项目当前可直接套用的例子

如果你接的是这台机器上已经暴露出来的服务，最小可用配置是：

| 字段 | 值 |
|-----|----|
| `Name` | `mcp-memory` |
| `Transport` | `Streamable HTTP` |
| `URL` | `http://172.22.224.57:8011/mcp` |
| `Bearer token env var` | 留空或 `MCP_API_KEY` |

二选一：

- 显式 header：`Authorization = Bearer <你的 MCP_API_KEY>`
- 环境变量 header：`X-API-Key = MCP_API_KEY`

## 常见错误

### 1. 选成 `STDIO`

现象：

- 客户端尝试自己拉起进程
- 无法连接你已经运行好的 HTTP 服务

修正：

- 改成 `Streamable HTTP`

### 2. URL 填成 `/api`

现象：

- 连通性检查失败
- 看到 REST API 正常，但 MCP 不工作

修正：

- 改成 `/mcp`

### 3. 把 token 明文填进 `Bearer token env var`

现象：

- 客户端把它当成环境变量名
- 实际请求不会带上正确 token

修正：

- 要么填环境变量名，比如 `MCP_API_KEY`
- 要么直接在 `Headers` 里写 `Authorization`

### 4. 把服务端环境变量写进 `Headers from environment variables`

错误示例：

| Key | Value |
|-----|-------|
| `MCP_ALLOW_ANONYMOUS_ACCESS` | `true` |

问题本质：

- 这是服务端启动配置，不是 HTTP 请求头
- 客户端发这个 header 没意义

修正：

- 这里只放真实请求头，比如 `Authorization` 或 `X-API-Key`

### 5. Windows 连 WSL 时用错地址

现象：

- WSL 里 `curl` 正常
- Windows 客户端里超时

修正：

- 改用 WSL 的实际可访问地址或公网域名
- 不要默认使用 `localhost`

## 保存后怎么验证

1. 点击 `Save`
2. 让客户端发起一次 MCP 初始化
3. 确认客户端没有报鉴权或连接错误
4. 再执行一次最简单的 memory 读取或搜索

如果你能调用到 memory 相关工具，说明配置已经生效。

## 排障顺序

先看地址，再看鉴权，最后看协议类型：

1. `URL` 是否真的是 `/mcp`
2. 服务端是否真的在监听该地址
3. 当前客户端是否能访问这个地址
4. token 是不是以正确方式注入
5. 传输方式是不是 `Streamable HTTP`

## 推荐实践

- 能用环境变量就不要把 token 明文写进 UI
- 能用 HTTPS 就不要长期暴露明文 HTTP
- 对已经运行的 MCP 服务，一律优先 `Streamable HTTP`
- 对短期排障，先用显式 `Authorization` 头把链路打通，再收口到环境变量配置
