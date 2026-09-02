# douyin-spark-client

`douyin-spark-client` 是 `douyin-spark` 的浏览器控制台前端，用于普通用户和管理员通过浏览器管理客户端账号、抖音号、扫码或远程浏览器登录、登录状态、发送任务、全局发送轮次、运行记录和管理员功能。

当前仓库为私有仓库。

当前前端发布为 `v1.6.1`，配套后端为 `douyin-spark v1.5.1`。

配套后端仓库：

```text
https://github.com/liuu2025/douyin-spark
```

配套智能客服 Agent 仓库：

```text
https://github.com/liuu2025/douyin-spark-assistant
```

## 技术栈

- TypeScript
- Vue 3
- Vite
- Element Plus
- Pinia
- Vue Router
- Axios
- lucide-vue-next

## 快速启动

安装依赖：

```powershell
npm.cmd install
```

启动开发服务：

```powershell
npm.cmd run dev -- --port 5173
```

访问：

```text
http://127.0.0.1:5173/
```

构建检查：

```powershell
npm.cmd run build
```

Vite 开发代理会把前端请求转发到本地后端：

```text
/api/v1 -> http://127.0.0.1:8787/api/v1
/health -> http://127.0.0.1:8787/health
```

普通 HTTP 接口开发可以使用本地 Go 后端；完整远程浏览器登录联调建议使用 Docker 后端，因为 noVNC、Xvfb、Chromium 等依赖在 Docker 环境里更接近服务器。

如果要联调智能客服，需要同时启动 `douyin-spark-assistant`。前端仍然只请求 Go 后端 `/api/v1/assistant/...`，由 Go 后端代理到 assistant。

## 生产构建

构建前端静态文件：

```powershell
npm.cmd run build
```

构建产物目录：

```text
dist/
```

项目包含 `Dockerfile.deploy`，用于把本地构建好的 `dist/` 复制进共享环境基线镜像，并生成独立的前端产物镜像。构建时保留 `douyin-spark-web:local`，前端容器使用 `douyin-spark-web:frontend-local`。

前端轻量部署时通常只需要上传：

```text
dist/
Dockerfile.deploy
```

不需要上传 `node_modules/`。

## 当前页面

普通用户：

- `/login`：登录、普通用户注册和忘记密码。
- `/dashboard`：仪表盘，展示抖音号概览和待处理事项。
- `/douyin-accounts`：抖音号入口列表。
- `/douyin-accounts/:douyinId`：单个抖音号详情，管理登录状态、重新登录、自动发送、发送任务、轮次选择、兑换码和运行记录。
- `/messages`：消息中心，查看通知，普通用户可联系管理员。
- `/account`：当前账号信息。
- `/redeem-codes`：我的兑换码。
- `/activities`：活动广场。
- `/tutorials`：教程中心。
- `/assistant`：智能客服，支持多会话、关联抖音号、上下文使用率、本次检查、参考资料和自动发送确认建议。

管理员：

- `/admin/douyin-accounts`：全站抖音号管理。
- `/admin/send-schedule/slots`：全局轮次管理。
- `/admin/send-runs`：全局发送记录。
- `/admin/users`：用户管理。
- `/admin/storage-state-imports`：登录态导入记录。
- `/admin/redeem-codes`：兑换码管理。
- `/admin/notices`：通知公告管理。
- `/admin/activities`：活动管理。
- `/admin/tutorials`：教程管理。
- `/admin/support`：客服与用户咨询。

## 登录方式

登录页提供两种互斥输入方式：

- 账户 ID 登录：输入 `100000`、`Admin` 或普通账户 ID。
- QQ 邮箱登录：输入普通用户 QQ 邮箱。

一个输入框只表达一种登录方式，切换方式后会清空对应输入值，避免混用。

## 核心闭环

普通用户：

```text
登录/注册 -> 仪表盘 -> 抖音号列表 -> 单个抖音号详情
  -> 添加/重新登录（扫码或远程浏览器）
  -> 验证登录状态
  -> 配置发送任务和参与轮次
  -> 查看运行记录
  -> 退出登录
```

管理员：

```text
登录 -> 仪表盘 -> 管理员菜单
  -> 抖音号管理
  -> 全局轮次管理
  -> 全局发送记录
  -> 用户、兑换码、通知、活动、教程和客服管理
  -> 退出登录
```

## 重要边界

- 前端只传业务 ID，例如 `douyin_id`、`task_id`、`owner_public_uid`、`target_public_uid`。
- 前端不读取、不展示、不提交服务端 `storageState.json` 路径。
- 普通用户没有登录态文件上传入口。
- 管理员导入登录态时只上传 `storage_state` 文件和 `target_public_uid`。
- 新增和重新登录抖音号时先选择扫码登录或远程浏览器登录。扫码模式展示鉴权读取的二维码并接收短信验证码；远程模式打开服务端返回的 `remote_url` 完成完整登录。
- 抖音昵称 `profile_nickname` 只用于展示和辅助识别账号，不作为唯一标识；唯一标识仍然是 `douyin_id`。
- 智能客服页面和悬浮窗共享同一个前端会话状态。前端不直连 assistant，不直接根据大模型文字修改业务状态；开启或关闭自动发送必须经过弹窗选择抖音号并由用户确认。

## 不提交内容

以下内容不应提交到 GitHub：

- `node_modules/`
- `dist/`
- `.tmp/`
- `.env`、`.env.local` 等本地私有环境文件
- 本地测试数据、临时构建包、调试输出

## 更多说明

- [更新日志](CHANGELOG.md)
- [前端架构说明](docs/前端架构说明.md)
- [接口接入说明](docs/接口接入说明.md)
- [后端启动与客户端接入备忘](docs/后端启动与客户端接入备忘.md)
- [本地预览说明](docs/本地预览说明.md)
- [登录与账号说明](docs/登录与账号说明.md)
