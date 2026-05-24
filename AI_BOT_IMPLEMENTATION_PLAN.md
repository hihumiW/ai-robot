# AI Bot 实施计划

## 1. 项目目标

这个项目是一个本地运行的 AI 聊天机器人学习型 Demo。

这个 Demo 的目标不只是“做出一个聊天机器人”，更重要的是帮助你逐步理解 Web 应用如何接入 AI：

- Vue 前端如何发送聊天请求。
- 后端如何接收、校验和组织请求。
- 后端如何调用本地 LM Studio 提供的 LLM 服务。
- AI 的流式响应是如何返回到浏览器的。
- 聊天记录如何在服务端保存。
- 后续如何从普通聊天逐步扩展到 Agent 或 RAG。

第一版应该保持简单、清晰、可读，方便你亲自参与核心部分的实现，尤其是流式请求处理。

## 2. 产品阶段规划

### 阶段 1：最小聊天 MVP

先实现一个单用户、本地可运行的最小聊天机器人。

核心能力：

- 创建一个聊天会话。
- 用户输入并发送消息。
- 前端立即展示用户消息。
- 后端调用本地 LM Studio。
- AI 回复以流式方式返回到前端。
- 前端逐步渲染 AI 回复内容。
- 服务端保存用户消息和 AI 消息。
- 页面刷新后可以恢复历史聊天记录。

这一阶段的核心链路是：

```txt
Vue Web -> Express API -> LM Studio LLM Server -> 流式响应 -> MySQL
```

这一阶段的重点不是功能多，而是完整理解一次 AI 聊天请求从前端到后端再到模型服务的全过程。

### 阶段 2：会话管理

在最小 MVP 跑通之后，让它更接近真实聊天产品。

可以加入：

- 左侧会话列表。
- 新建会话。
- 切换会话。
- 删除会话。
- 根据第一条用户消息生成简单会话标题。
- 点击某个会话后重新加载对应聊天记录。

这一阶段的重点是理解“聊天机器人产品”里的会话模型。

### 阶段 3：模型和参数控制

加入一些 AI 产品中常见的配置能力。

可以加入：

- 选择模型。
- 调整 `temperature`。
- 调整最大输出长度。
- 配置 system prompt。
- 展示当前请求状态，例如空闲、生成中、失败、完成。
- 支持中断正在生成的回复。

这一阶段的重点是理解 LLM 请求参数如何影响模型输出。

### 阶段 4：后端能力增强

让 Express 后端从“简单转发层”逐渐变成更真实的 AI 应用后端。

可以加入：

- 统一错误响应格式。
- 请求日志。
- LLM 调用耗时统计。
- 简单的消息长度或 token 估算。
- 基础限流。
- 环境变量管理。
- 数据库迁移脚本。
- 基础接口测试。

这一阶段的重点是理解 AI 应用后端需要承担哪些职责。

### 阶段 5：Agent 和 RAG 扩展

当普通聊天链路足够熟悉之后，再进入更高级的 AI 应用形态。

可以扩展：

- Agent 工具调用，例如计算器、查询数据库、读取本地文件并总结。
- RAG 知识库，例如上传文档、切分内容、检索相关片段、结合上下文回答。
- 长期记忆，把用户偏好或重要信息写入数据库。
- 多步骤任务状态，让后端维护任务执行过程。

这一阶段不属于第一版 MVP，而是后续学习路线。

## 3. 技术架构

### 前端

建议技术栈：

- Vue 3
- TypeScript
- JSX
- Tailwind CSS
- `@tanstack/vue-query`
- 原生 `fetch`
- Fetch Stream 或 SSE 风格的流式响应处理

前端职责：

- 渲染聊天界面。
- 管理输入框、消息列表、加载状态和当前会话。
- 调用后端 API。
- 读取流式响应，并逐步更新当前 AI 消息。
- 使用 Vue Query 管理会话列表、消息列表和请求状态。
- 不直接调用 LM Studio。

### 后端

建议技术栈：

- Node.js
- Express
- TypeScript
- `mysql2`
- `zod`
- `dotenv`
- `nanoid` 或数据库自增 ID
- `tsx` 用于本地开发阶段运行 TypeScript

后端职责：

- 提供 Web API。
- 校验前端请求参数。
- 调用 LM Studio 的 OpenAI-compatible API。
- 将 AI 的流式响应转发给前端。
- 保存用户消息和 AI 消息。
- 隐藏 LLM 服务地址、模型名称和未来可能出现的密钥。
- 统一处理错误。
- 为后续 Agent、RAG、鉴权、限流等能力预留位置。

建议接口：

```txt
GET    /api/conversations
POST   /api/conversations
GET    /api/conversations/:conversationId/messages
DELETE /api/conversations/:conversationId
POST   /api/chat
```

其中 `POST /api/chat` 负责：

- 接收 `conversationId` 和用户输入。
- 保存用户消息。
- 读取当前会话历史。
- 调用 LM Studio，并开启流式输出。
- 把 AI 回复流式转发给前端。
- 在生成结束后保存完整 AI 回复。

### 数据库

第一版使用 MySQL 保存服务端聊天记录。

初始只需要两张表：

```txt
conversations
- id
- title
- created_at
- updated_at

messages
- id
- conversation_id
- role
- content
- created_at
```

消息角色使用：

```txt
user
assistant
system
```

第一阶段不需要用户表，因为当前项目定位是本地单用户学习 Demo。

### LLM Server

使用 LM Studio 作为本地 LLM Server。

LM Studio 通常会提供 OpenAI-compatible API。后端通过环境变量配置：

```txt
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_MODEL=<你的本地模型名>
```

后端优先使用聊天补全接口，并开启流式输出。

## 4. 是否需要 Express 层

建议保留 Express 层。

虽然在本地开发时，前端理论上可以直接请求 LM Studio，但这不适合作为一个真实 AI Web 应用的学习路径。

Express 层的价值：

- 避免前端直接依赖 LLM 服务地址。
- 隐藏模型名称、服务地址和未来可能出现的密钥。
- 统一管理聊天记录的保存逻辑。
- 统一处理参数校验、错误、日志和请求格式。
- 更容易处理流式响应转发。
- 后续 Agent 工具调用必须放在后端更合理。
- 为未来部署、鉴权、限流、多用户支持留出空间。

第一阶段暂时不建议引入：

- 用户登录。
- Docker。
- ORM。
- Redis。
- 向量数据库。
- LangChain 或 LlamaIndex。
- 复杂 Agent 框架。

这些都可以等普通聊天链路稳定后再逐步引入。

## 5. 第一阶段 MVP 范围

第一阶段只做这些事情：

- 一个 Web 聊天页面。
- 一个 Express 后端。
- MySQL 保存会话和消息。
- 调用本地 LM Studio。
- AI 回复支持流式输出。
- 基础错误展示。
- 基础加载状态和按钮禁用状态。

第一阶段不做：

- 登录注册。
- 多用户。
- RAG。
- Agent 工具调用。
- 模型市场。
- 复杂 Prompt 模板。
- 生产环境部署。

## 6. 测试场景

第一阶段至少验证：

- 可以创建新会话。
- 用户发送消息后，消息能立即显示在页面上。
- AI 回复能逐步流式显示。
- 用户消息和 AI 消息能保存到 MySQL。
- 刷新页面后可以恢复之前的聊天记录。
- 空输入不能发送。
- AI 生成中不能重复提交同一条消息。
- LM Studio 没有启动时，前端能显示友好错误。
- LLM 请求失败时，后端不会崩溃。
- AI 回复完整生成后才保存 assistant 消息。

## 7. 当前假设

- 当前项目是本地单用户学习项目。
- 第一版使用 MySQL 在服务端保存聊天记录。
- 第一版只实现普通聊天和流式输出。
- Express 是正式后端层，而不是临时代理。
- MySQL 第一阶段只保存结构化聊天数据。
- Agent 和 RAG 是后续学习目标，不属于 MVP。
- 前端应该是一个真正可用的聊天工作台，而不是营销首页。
- 实现过程要方便你亲自参与核心部分，尤其是流式请求处理。

## 8. 学习笔记

这个区域用于在实现过程中记录关键理解。

### 流式响应

当前已完成第一版聊天流改造。

后端实现方式：

- `POST /api/chat` 仍然是聊天入口，但响应改为 `text/event-stream`。
- Express 后端先请求 LM Studio 的 OpenAI-compatible `/v1/chat/completions`，并设置 `stream: true`。
- LM Studio 返回的数据是 SSE 风格文本，常见格式是：

```txt
data: {"id":"...","created":123,"choices":[{"delta":{"content":"你"}}]}

data: {"id":"...","created":123,"choices":[{"delta":{"content":"好"}}]}

data: [DONE]
```

- SSE 事件之间用空行分隔，也就是 `\n\n` 或 `\r\n\r\n`。
- 后端读取模型流时使用 `TextDecoder` 把二进制块转成文本。
- 因为一次 `reader.read()` 不保证刚好读到完整 SSE 事件，所以需要使用 `buffer` 暂存半包内容。
- 当前解析逻辑是：先把新文本追加到 `buffer`，再用 `/\r?\n\r?\n/` 按 SSE 事件边界切分，最后一个不确定是否完整的片段继续留在 `buffer` 中。
- 单个 SSE 事件里可能有多行 `data:`，这些 `data:` 行在协议语义上属于同一个事件的数据整体，需要合并后再解析。
- LM Studio / OpenAI-compatible 流式响应通常是“一个 SSE 事件包含一行 `data:`，这一行是一个 JSON 对象”。
- 后端从每个 JSON 对象中读取 `choices[0].delta.content`，得到本次新增 token。
- 后端把模型原始流转成前端更清晰的 SSE 事件：

```txt
event: chunk
data: {"content":"你"}

event: done
data: {"id":"...","created":123,"reply":"完整回复"}

event: error
data: {"message":"错误信息"}
```

前端实现方式：

- 前端使用原生 `fetch` 请求 `/api/chat`。
- 使用 `response.body.getReader()` 逐块读取后端返回的 SSE 文本流。
- 使用 `TextDecoder` 解码，并同样用 `buffer + /\r?\n\r?\n/` 处理半包问题。
- 前端按 `event:` 和 `data:` 解析出 `chunk`、`done`、`error` 三类事件。
- 收到 `chunk` 时，把增量 `content` 追加到当前 assistant 消息。
- 收到 `done` 时，把当前 assistant 消息状态改为完成，并同步后端返回的完整回复。
- 收到 `error` 或网络异常时，把当前 assistant 消息状态改为失败。

前端消息状态：

- 用户发送消息后，用户消息立即追加到列表中，状态为 `done`。
- 同时追加一条空的 assistant 占位消息，状态为 `sending`。
- `sending` 状态用于触发 `ChatMessage` 的 loading UI，表示模型正在思考或请求尚未吐出第一个 token。
- 收到第一个 `chunk` 后，assistant 消息切换为 `streaming`。
- 模型输出完成后，assistant 消息切换为 `done`。
- 模型请求失败时，assistant 消息切换为 `error`，并显示错误文案。

补充理解：

- SSE 的 `event:` 字段是可选的；LM Studio 只返回 `data:` 也是合法 SSE。
- 如果前后端都由自己控制，带上 `event:` 会让前端更容易区分 `chunk`、`done`、`error`。
- 如果要实现 JSON 流，也不应该使用普通 `application/json`，更适合使用 `application/x-ndjson`，即一行一个 JSON 对象。
- 不管是 SSE 还是 NDJSON，真正作为协议分隔符的是传输文本里的真实换行；如果内容来自 `JSON.stringify`，内容中的换行会被转义成 `\n` 字符串，不会破坏分隔。

### Express 后端

当前已接入基础 Express API。

- 后端通过 `ai-bot-api` 提供 `/api/test` 和 `/api/chat`。
- 前端 Vite 开发服务通过 `/api` 代理到 `http://localhost:3001`。
- `/api/chat` 现在负责校验请求体、调用 LM Studio、转发流式响应。
- 当前阶段还没有接入数据库保存，聊天历史仍然只存在前端内存中。

### MySQL 数据持久化

待实现数据库保存逻辑时补充。

### LM Studio 接入

当前已接入 LM Studio 的 OpenAI-compatible Chat Completions API。

- 默认地址来自 `LM_STUDIO_BASE_URL`，未配置时使用 `http://127.0.0.1:1234`。
- 默认模型来自 `LM_STUDIO_MODEL`，未配置时使用当前项目里的默认模型名。
- 后端会统一添加 system message，要求模型使用中文直接输出最终答案，并避免输出 `<think>` 思考过程。
- 普通聊天链路使用 `stream: true`，非流式方法暂时保留，方便后续调试或对比。

## 9. 进度记录

用于记录项目推进情况。

- [~] 阶段 1：最小聊天 MVP
  - [x] 创建前端项目目录 `ai-bot-web`
  - [x] 按计划技术栈初始化 Vue 3 + TypeScript + JSX + Tailwind CSS + Vue Query 项目骨架
  - [x] 搭建第一版聊天工作台静态界面雏形
  - [x] 根据参考 UI 重做深色两栏聊天工作台静态页面
  - [x] 安装前端依赖并通过生产构建验证
  - [x] 接入 Express 后端 API
  - [x] 接入流式聊天响应
    - [x] 后端 `/api/chat` 返回 SSE 流式事件
    - [x] 后端读取并解析 LM Studio 的 OpenAI-compatible SSE 响应
    - [x] 前端使用 `fetch + ReadableStream` 读取流式响应
    - [x] 前端 assistant 消息支持 `sending -> streaming -> done/error`
    - [x] 生成中禁用输入发送，避免重复提交
    - [x] 通过后端 typecheck、前端 typecheck 和前端生产构建验证
  - [ ] 接入 MySQL 历史记录恢复
- [ ] 阶段 2：会话管理
- [ ] 阶段 3：模型和参数控制
- [ ] 阶段 4：后端能力增强
- [ ] 阶段 5：Agent 和 RAG 扩展
