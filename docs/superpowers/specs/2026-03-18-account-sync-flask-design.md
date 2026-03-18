# 账号体系与云同步设计（Flask，面向后续前后端分离）

## 1. 背景与目标

当前应用使用 `IndexedDB + localStorage` 作为主要持久化方式，存在以下问题：

- 数据依赖浏览器本地环境，可能被清理或损坏
- 无法稳定支持跨设备同步
- 缺少账号体系，无法建立“用户级数据所有权”

本设计的目标是：

1. 引入账号体系（注册、登录、登出、续期）
2. 实现设置与句子的自动云同步
3. 保留本地缓存能力，实现离线可用与弱网容错
4. 为后续完全前后端分离（Python 后端）提供稳定架构边界

## 2. 范围与非目标

### 范围（MVP）

- 邮箱密码认证
- Access/Refresh Token 机制
- 句子与设置的增量同步
- 冲突处理（版本号并发控制 + 删除优先）
- 本地待同步队列（离线后补）

### 非目标（当前阶段不做）

- 第三方登录（如微信/Google）
- 多人协作与共享空间
- 字段级智能冲突合并
- 端到端加密

## 3. 总体架构

### 3.1 前端（Vue）

前端新增两层抽象，避免 UI/Store 直接绑定后端实现：

- `authRepository`：处理注册、登录、续期、登出、当前用户态
- `syncRepository`：处理句子/设置的读取、写入、增量同步

现有 `sentences` 与 `settings` store 继续保留，但其持久化职责调整为：

- 本地存储（IndexedDB/localStorage）作为缓存与离线容器
- 云端为最终真相源（source of truth）

### 3.2 后端（Flask）

提供 REST API：

- `/auth/*`：认证相关
- `/me`：当前用户信息
- `/sentences/*`、`/settings/*`：资源接口
- `/sync/pull`、`/sync/push`：增量同步接口

数据库使用 Postgres（可托管在 Supabase/Neon，但仅作为数据库，不依赖其 Auth）。

## 4. 数据模型设计

### 4.1 users

- `id` (uuid, pk)
- `email` (unique, indexed)
- `password_hash`
- `display_name`
- `status` (active/disabled)
- `created_at`, `updated_at`

### 4.2 user_settings

- `user_id` (uuid, pk, fk -> users.id)
- `use_mode` (simple/advanced)
- `text_api` (jsonb)
- `vision_api` (jsonb)
- `ui` (jsonb)
- `version` (bigint, default 1)
- `updated_at`

说明：保持与当前前端设置结构兼容，降低迁移成本。

### 4.3 sentences

- `id` (uuid, pk)
- `user_id` (uuid, indexed)
- `content` (text)
- `source` (text)
- `analysis` (jsonb, nullable)
- `tags` (jsonb)
- `created_at`
- `updated_at` (indexed)
- `deleted_at` (nullable, indexed)
- `version` (bigint, default 1)

说明：采用软删除（`deleted_at`）支持跨端一致删除与可恢复策略。

ID 规则：`id` 由客户端离线生成（UUID v4），服务端仅校验唯一性并落库，保证离线队列可引用稳定对象标识。

### 4.4 refresh_tokens（必需）

- `id` (uuid, pk)
- `user_id` (uuid, indexed)
- `token_hash`
- `expires_at`
- `revoked_at` (nullable)
- `created_at`

说明：用于 refresh 吊销、过期校验与会话管理，是认证闭环的必需表。

## 5. 认证与会话策略

### 5.1 Token 机制

- `access_token`：JWT，固定有效期 30 分钟
- `refresh_token`：固定有效期 30 天

refresh 生命周期（MVP 固定）：

- 启用 refresh 轮转：每次 `POST /auth/refresh` 成功后签发新 refresh token
- 旧 refresh token 立即吊销，不可再次使用
- `POST /auth/logout` 仅登出当前设备会话（当前 refresh token）
- 全设备登出不在 MVP 范围

认证传输约定（MVP）：

- 受保护接口使用 `Authorization: Bearer <access_token>`
- `email` 在服务端做 `trim + lower` 归一化后入库与比对

前端策略（MVP）：

- access token 存内存
- refresh token 存 localStorage
- 请求 401 时自动 refresh 并重试一次

后续可演进为 HttpOnly Cookie 方案。

### 5.2 安全基线

- 密码哈希：bcrypt 或 argon2
- 登录与 refresh 限频
- 所有数据查询强制按 `user_id` 过滤
- 审计日志：登录失败/成功、refresh、logout、同步失败

## 6. API 契约（MVP）

### 6.1 认证

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

示例：`POST /auth/login`

请求：

```json
{
  "email": "user@example.com",
  "password": "******"
}
```

响应：

```json
{
  "code": "OK",
  "message": "登录成功",
  "data": {
    "accessToken": "jwt...",
    "accessTokenExpiresIn": 1800,
    "refreshToken": "rt_...",
    "refreshTokenExpiresIn": 2592000,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "Tom"
    }
  },
  "requestId": "req_xxx"
}
```

### 6.2 用户

- `GET /me`

### 6.3 资源

- `GET /sentences`
- `POST /sentences`
- `PUT /sentences/:id`
- `DELETE /sentences/:id`（软删除）
- `GET /settings`
- `PUT /settings`（仅兼容/调试，前端业务写入主路径不是该接口）

`GET /sentences` 语义：

- 默认仅返回 `deleted_at = null` 的记录
- 支持 `includeDeleted=true` 获取软删除记录（用于修复和核对）
- 支持分页：`?limit=50&cursor=opaque_cursor`
- 稳定排序：`updated_at ASC, id ASC`，cursor 记录最后一条 `(updated_at, id)`

`PUT /settings` 语义（仅调试/运维，不属于前端业务路径）：

- 请求必须携带完整 settings 对象
- 必须携带 `version`
- 服务端仅在版本匹配时写入并 `version + 1`
- 版本不匹配返回 `409`

写入主路径约束（MVP）：

- 前端业务写入统一走 `POST /sync/push`
- `PUT /settings` 与 `POST/PUT/DELETE /sentences` 仅作为调试/运维入口，不纳入 MVP 客户端实现
- MVP 不实现“混用写路径”服务端检测规则

### 6.4 同步

- `GET /sync/pull?cursor=<opaque_cursor>`：拉取增量变更
- `POST /sync/push`：批量提交本地待同步操作

`POST /sync/push` 的响应策略（MVP 统一规则）：

- 请求级成功（鉴权通过且 JSON 合法）统一返回 `200`
- 单条操作成功/冲突/非法由 `data.results[]` 表达
- 仅在请求级错误时返回非 2xx（如 `401/422/429/5xx`）

`POST /sync/push` 执行语义（MVP 固定）：

- 按 `operations` 顺序逐条执行
- 每条操作独立事务，单条失败不回滚整批
- 允许同一实体在同一批出现多条操作，按顺序依次处理
- 客户端 SHOULD 在入队前合并同实体连续操作，降低冲突率

`sync cursor` 规则：

- cursor 由服务端生成并返回，不透明字符串
- 客户端只存储与透传，不解析
- 避免客户端时钟偏差、时区和毫秒精度导致的漏拉/重拉

`pull` 一致性与排序保证（MVP）：

- 变更流按全局键 `(updatedAt ASC, entityType ASC, entityId ASC)` 稳定排序
- 每个变更在同一 cursor 会话中最多出现一次
- 若跨页边界出现重复项，客户端以 `(entityType, entityId, version)` 去重
- `nextCursor` 表示“已消费到的最后位置”，客户端必须串行推进

cursor 组成约定：

- cursor 为不透明字符串，内部包含 `snapshotToken + offsetCheckpoint`
- 客户端仅透传 cursor，不单独传 `snapshotToken`
- 因此 `CURSOR_INVALID`/`CURSOR_EXPIRED` 都作用于 cursor 本身

全量拉取快照保证（空 cursor 场景）：

- 首次空 cursor 请求时，服务端生成 `snapshotToken`
- 后续翻页在同一 `snapshotToken` 视图中读取，避免并发写入导致漏读
- `snapshotToken` 过期返回 `409 CURSOR_EXPIRED`，客户端执行全量重建流程

`POST /sync/push` 请求示例：

```json
{
  "deviceId": "device_xxx",
  "operations": [
    {
      "opId": "op_uuid_1",
      "entityType": "sentence",
      "entityId": "sentence_uuid",
      "action": "upsert",
      "baseVersion": 3,
      "payload": {
        "content": "I have a dream.",
        "tags": ["speech"],
        "analysis": {"translation": "我有一个梦想"}
      },
      "clientUpdatedAt": "2026-03-18T10:20:30.456Z"
    },
    {
      "opId": "op_uuid_2",
      "entityType": "setting",
      "entityId": "user_uuid",
      "action": "replace",
      "baseVersion": 8,
      "payload": {
        "useMode": "advanced",
        "textApi": {},
        "visionApi": {},
        "ui": {"theme": "light"}
      },
      "clientUpdatedAt": "2026-03-18T10:20:35.123Z"
    }
  ]
}
```

`operations` 协议约束：

- `action` 枚举：`create | upsert | replace | delete`
- `create/upsert/replace` 必须包含 `payload`
- `delete` 仅需 `entityType/entityId/baseVersion`，`payload` 可省略
- `entityType` 枚举：`sentence | setting`

`entityType` 与 `action` 允许矩阵（MVP）：

- `sentence`：`create | upsert | delete`
- `setting`：仅允许 `replace`
- 不在矩阵内的组合返回操作级 `invalid` + `errorCode=ACTION_NOT_ALLOWED`

`sentence` 同步 payload 校验（MVP 规范）：

- `create`：`payload.content` 必填；`payload.tags/payload.analysis/payload.source` 可选
- `upsert`：允许部分字段更新；至少包含 `content/tags/analysis/source` 之一
- `payload.content`：字符串，长度 1-2000
- `payload.tags`：字符串数组，最大 50 个元素，每个元素长度 1-30
- `payload.analysis`：对象或 `null`，序列化后最大 64KB
- `payload.source`：`text | photo`
- 未知字段一律忽略并返回 `details.ignoredFields`

删除与恢复边界（MVP）：

- `action=delete` 写入软删除 tombstone（`deleted_at != null`）
- 已软删记录收到 `upsert/replace/create` 时返回 `conflict` + `errorCode=TOMBSTONE_CONFLICT`
- MVP 不支持隐式恢复；恢复需通过“新建新 ID”实现（后续阶段再加 `restore` 动作）

删除变更表达规范（MVP 固定）：

- `pull` 统一使用 `action=upsert` 返回记录
- 删除记录通过 `record.deletedAt != null` 表达
- 客户端收到 `deletedAt != null` 后执行本地软删除，不做物理删除

`POST /sync/push` 响应示例（逐操作回执）：

```json
{
  "code": "OK",
  "message": "partial success",
  "data": {
    "results": [
      {
        "opId": "op_uuid_1",
        "status": "applied",
        "entityType": "sentence",
        "entityId": "sentence_uuid",
        "serverVersion": 4,
        "serverUpdatedAt": "2026-03-18T10:20:31.100Z"
      },
      {
        "opId": "op_uuid_2",
        "status": "conflict",
        "entityType": "setting",
        "entityId": "user_uuid",
        "serverVersion": 11,
        "serverUpdatedAt": "2026-03-18T10:20:31.100Z",
        "errorCode": "VERSION_MISMATCH",
        "retryable": false,
        "details": {}
      }
    ],
    "nextCursor": "cursor_xxx"
  },
  "requestId": "req_xxx"
}
```

`GET /sync/pull` 响应示例：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "changes": [
      {
        "entityType": "sentence",
        "entityId": "sentence_uuid",
        "action": "upsert",
        "record": {
          "id": "sentence_uuid",
          "content": "I have a dream.",
          "tags": ["speech"],
          "source": "text",
          "analysis": {"translation": "我有一个梦想"},
          "version": 4,
          "updatedAt": "2026-03-18T10:20:31.100Z",
          "deletedAt": null
        }
      },
      {
        "entityType": "setting",
        "entityId": "user_uuid",
        "action": "upsert",
        "record": {
          "useMode": "advanced",
          "textApi": {},
          "visionApi": {},
          "ui": {"theme": "light"},
          "version": 12,
          "updatedAt": "2026-03-18T10:20:31.100Z",
          "deletedAt": null
        }
      }
    ],
    "nextCursor": "cursor_next_xxx",
    "hasMore": false
  },
  "requestId": "req_xxx"
}
```

统一返回结构：

```json
{
  "code": "OK",
  "message": "success",
  "data": {},
  "requestId": "..."
}
```

错误语义：

- `401`：令牌失效/未认证
- `409`：请求级冲突（`CURSOR_EXPIRED`、调试接口版本冲突）
- `422`：参数校验失败
- `429`：频率限制
- `5xx`：服务异常（客户端进入可重试状态）

`sync/push` 单条状态枚举与处理：

- `applied`：已落库，客户端从队列移除
- `conflict`：版本冲突，客户端先 pull 再按最新状态重建操作
- `retryable_error`：临时失败，指数退避重试
- `invalid`：参数或业务非法，进入死信队列等待人工处理

错误码映射（操作级 `results[].errorCode`）：

- `VERSION_MISMATCH` -> `conflict`（`retryable=false`）
- `IDEMPOTENCY_KEY_REUSED` -> `invalid`（`retryable=false`）
- `TOMBSTONE_CONFLICT` -> `conflict`（`retryable=false`）
- `ACTION_NOT_ALLOWED` -> `invalid`（`retryable=false`）
- `RATE_LIMITED` -> `retryable_error`（`retryable=true`）
- `TEMPORARY_BACKEND_ERROR` -> `retryable_error`（`retryable=true`）
- `VALIDATION_FAILED` -> `invalid`（`retryable=false`）

操作级回执统一结构（`results[]`）：

```json
{
  "opId": "op_uuid",
  "status": "applied | conflict | retryable_error | invalid",
  "entityType": "sentence | setting",
  "entityId": "uuid_or_user_id",
  "serverVersion": 12,
  "serverUpdatedAt": "2026-03-18T10:20:31.100Z",
  "errorCode": "OPTIONAL_MACHINE_CODE",
  "retryable": false,
  "details": {}
}
```

约束：

- `reason` 字段废弃，统一使用 `errorCode`
- 当 `status=applied` 时 `errorCode/retryable/details` 可省略
- 当 `status!=applied` 时 `errorCode` 必填，`retryable` 必填

cursor 异常处理：

- `CURSOR_INVALID`：返回请求级 `422`，客户端应丢弃本地 cursor 并从空 cursor 重新拉取
- `CURSOR_EXPIRED`：返回请求级 `409`，客户端应执行一次全量重建流程

`CURSOR_EXPIRED` 全量重建流程（MVP）：

1. 保留本地离线队列与冲突桶，不清空
2. 清空本地 `sync cursor`
3. 以空 cursor 执行全量 `pull`
4. 用服务端数据重建本地基线
5. 重新按顺序重放离线队列

## 7. 同步流程设计

### 7.1 登录后初始化

1. 前端登录成功，拿到 token
2. 调用 `pull`（空 cursor）拉取全量或分页
3. 建立本地基线（MVP 固定规则）：
   - 本地为空：直接写入云端数据
   - 本地有未登录前数据：按以下确定性规则转换为待同步操作入队
   - 同 ID 版本冲突：默认保留服务端版本，并把本地版本放入冲突桶
4. 保存 `nextCursor`，进入常规增量同步

首登迁移确定性规则：

- 仅处理 `deletedAt=null` 的本地记录；本地已删记录不入队
- 以本地 `id` 为主键对齐，不做“同内容不同 ID”自动合并
- 若服务端不存在该 `id`：生成 `create` 操作
- 若服务端存在该 `id` 且 `version` 一致：无操作
- 若服务端存在该 `id` 且 `version` 不一致：写入冲突桶，不自动覆盖
- 规则本身幂等：重复执行不会产生额外重复操作

首登 settings 迁移规则：

- 若服务端无 settings：将本地 settings 作为一条 `setting/replace` 入队（`baseVersion=0`）
- 若服务端有 settings 且本地无：直接采用服务端 settings
- 若双方均有 settings 且版本一致：无操作
- 若双方均有 settings 且版本不一致：默认保留服务端，并把本地快照写入冲突桶

冲突桶策略（MVP）：

- 存储位置：IndexedDB `sync_conflicts` 表
- 保存内容：`entityType/entityId/localSnapshot/serverSnapshot/detectedAt/status`
- 用户可见：设置页提供“同步冲突”入口，显示条数与最近时间
- 生命周期：默认保留 30 天，用户可手动清理
- 重放规则：用户选择“以本地为准”后生成新 `upsert/replace` 操作入队

### 7.2 日常写入

1. 用户操作先写本地（提升响应速度）
2. 生成一条待同步操作（队列）
3. 后台批量 `push` 到服务端
4. 服务端确认后标记本地操作完成

部分成功处理：

- `applied`：移出队列
- `conflict`：标记冲突，触发一次 `pull` 后重放
- `retryable_error`：保留在队列，指数退避重试
- `invalid`：写入死信队列并提示用户处理

死信队列最小契约（MVP）：

- 存储位置：IndexedDB `sync_dead_letters` 表
- 字段：`opId/entityType/entityId/action/payload/errorCode/details/firstFailedAt/lastFailedAt/retryCount/status`
- `status`：`pending | ignored | resolved`
- 用户动作：重试（重新入主队列）、忽略（标记 `ignored`）、导出（JSON）

### 7.3 跨端更新

- 定期 `pull` 增量（如应用启动、切前台、定时器触发）
- 拉到变更后更新本地缓存与 store
- 若 `hasMore=true` 持续拉取直到 `hasMore=false`

## 8. 冲突处理策略

MVP 使用：`版本号乐观并发（OCC）+ 删除优先`

- 冲突检测依据：`baseVersion` 与服务端当前 `version` 是否一致
- 版本一致时允许写入，服务端写入后 `version + 1`
- 版本不一致返回 `push results[].status=conflict`（请求级仍为 `200`）
- 若任一版本 `deleted_at != null`，删除优先
- 冲突后前端触发重新 pull，再重放未完成本地队列

说明：MVP 不做自动字段级合并，`updated_at` 仅用于展示与排序，不用于写冲突裁决。

## 9. 前端改造要点

1. 新增模块
   - `src/api/auth.js`
   - `src/api/sync.js`
   - `src/utils/syncQueue.js`
   - `src/repositories/syncRepository.js`
   - `src/repositories/authRepository.js`
2. 调整 store 读写路径
   - `sentences`：本地写入时同步入队
   - `settings`：变更防抖后入队
3. 增加同步状态
   - 全局状态：`idle | syncing | error | offline`
   - 提供用户可见但不打扰的同步状态提示

最小接口边界（用于单测与解耦）：

- `authRepository`
  - `login(email, password) -> { user, accessToken, refreshToken }`
  - `refresh(refreshToken) -> { accessToken, refreshToken? }`
  - `logout() -> void`
  - `getCurrentUser() -> user | null`
- `syncRepository`
  - `pull(cursor) -> { changes, nextCursor, hasMore }`
  - `push(deviceId, operations) -> { results, nextCursor }`
  - `listSentences(params) -> { items, nextCursor }`
  - `upsertSettingsViaSync(payload, baseVersion) -> { result }`

`deviceId` 规则（MVP）：

- 前端首次启动生成 UUID v4 作为 `deviceId`
- 持久化到 `localStorage`，同浏览器环境长期复用
- 清缓存后重新生成并视为新设备
- 多标签页共享同一 `deviceId`

## 10. Flask 后端模块划分

- `auth_blueprint`：注册、登录、refresh、logout
- `user_blueprint`：`/me`
- `sentence_blueprint`：句子资源 CRUD
- `settings_blueprint`：设置资源读写
- `sync_blueprint`：pull/push 协议
- `services` 层：鉴权、冲突处理、队列幂等
- `models` 层：SQLAlchemy 模型

新增幂等持久化表（MVP 必需）：`sync_idempotency_records`

- `id` (uuid, pk)
- `user_id` (uuid, indexed)
- `device_id` (text)
- `op_id` (text)
- `request_hash` (text)
- `result_snapshot` (jsonb)
- `created_at`
- `expires_at`

唯一约束：`(user_id, device_id, op_id)`

要求：蓝图分层清晰，接口与业务逻辑解耦，便于后续扩展。

幂等约定：

- `opId` 在 `user_id + device_id` 作用域内唯一
- 服务端保留幂等窗口（建议 7 天）
- 重复 `opId` 必须返回同一处理结果，避免重复写入
- 若相同 `opId` 对应的请求体摘要不同，返回操作级 `invalid` + `errorCode=IDEMPOTENCY_KEY_REUSED`

## 11. 字段命名与映射规范

数据库统一使用 `snake_case`，API 统一使用 `camelCase`，由后端 DTO 层统一转换。

关键映射：

- `use_mode` <-> `useMode`
- `text_api` <-> `textApi`
- `vision_api` <-> `visionApi`
- `created_at` <-> `createdAt`
- `updated_at` <-> `updatedAt`
- `deleted_at` <-> `deletedAt`

时间字段统一为 ISO 8601 UTC 字符串（示例：`2026-03-18T10:20:31.100Z`）。

## 12. API 补充协议（MVP 最小集）

### 12.0 请求级错误码（最小清单）

- `401 UNAUTHORIZED`：token 缺失或失效
- `409 CURSOR_EXPIRED`：cursor 过期需重建
- `409 VERSION_MISMATCH`：调试资源接口版本冲突
- `422 VALIDATION_FAILED`：请求结构或字段不合法
- `429 RATE_LIMITED`：触发限流
- `500 INTERNAL_ERROR`：内部错误

认证相关错误码：

- `EMAIL_ALREADY_EXISTS`：注册邮箱已存在
- `INVALID_CREDENTIALS`：账号或密码错误
- `ACCOUNT_DISABLED`：账号被禁用
- `REFRESH_TOKEN_REVOKED`：refresh token 已吊销
- `REFRESH_TOKEN_EXPIRED`：refresh token 已过期

### 12.1 `POST /auth/refresh`

请求：

```json
{
  "refreshToken": "rt_..."
}
```

响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "accessToken": "jwt...",
    "accessTokenExpiresIn": 1800,
    "refreshToken": "rt_new_rotated"
  },
  "requestId": "req_xxx"
}
```

### 12.2 `POST /auth/register`

请求：

```json
{
  "email": "user@example.com",
  "password": "******",
  "displayName": "Tom"
}
```

响应：

```json
{
  "code": "OK",
  "message": "注册成功",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "Tom"
    }
  },
  "requestId": "req_xxx"
}
```

### 12.3 `POST /auth/logout`

请求：

```json
{
  "refreshToken": "rt_..."
}
```

响应：

```json
{
  "code": "OK",
  "message": "已登出",
  "data": {},
  "requestId": "req_xxx"
}
```

### 12.4 `GET /me`

响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Tom"
  },
  "requestId": "req_xxx"
}
```

### 12.4.1 认证失败示例

注册邮箱已存在：

```json
{
  "code": "ERROR",
  "message": "邮箱已注册",
  "errorCode": "EMAIL_ALREADY_EXISTS",
  "retryable": false,
  "details": {},
  "requestId": "req_xxx"
}
```

登录凭据错误：

```json
{
  "code": "ERROR",
  "message": "账号或密码错误",
  "errorCode": "INVALID_CREDENTIALS",
  "retryable": false,
  "details": {},
  "requestId": "req_xxx"
}
```

refresh token 过期：

```json
{
  "code": "ERROR",
  "message": "登录已过期，请重新登录",
  "errorCode": "REFRESH_TOKEN_EXPIRED",
  "retryable": false,
  "details": {},
  "requestId": "req_xxx"
}
```

### 12.5 `PUT /settings`

请求：

```json
{
  "version": 11,
  "payload": {
    "useMode": "advanced",
    "textApi": {},
    "visionApi": {},
    "ui": {"theme": "light"}
  }
}
```

响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "settings": {
      "useMode": "advanced",
      "textApi": {},
      "visionApi": {},
      "ui": {"theme": "light"}
    },
    "version": 12,
    "updatedAt": "2026-03-18T10:20:31.100Z"
  },
  "requestId": "req_xxx"
}
```

### 12.6 `GET /sentences`

查询参数：`limit`（默认 50，最大 200）、`cursor`、`includeDeleted`

响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [],
    "nextCursor": "cursor_xxx",
    "hasMore": false
  },
  "requestId": "req_xxx"
}
```

### 12.6.1 `GET /settings`

响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "settings": {
      "useMode": "advanced",
      "textApi": {},
      "visionApi": {},
      "ui": {"theme": "light"}
    },
    "version": 12,
    "updatedAt": "2026-03-18T10:20:31.100Z"
  },
  "requestId": "req_xxx"
}
```

### 12.6.2 句子调试接口（非 MVP 客户端路径）

- `POST /sentences`：创建单条句子（调试）
- `PUT /sentences/:id`：更新单条句子（调试）
- `DELETE /sentences/:id`：软删除单条句子（调试）

最小字段约束：

- `content`：1-2000 字符
- `tags`：字符串数组，最大 50 个
- `analysis`：JSON 对象，序列化后最大 64KB

### 12.7 统一错误体

```json
{
  "code": "ERROR",
  "message": "版本冲突",
  "errorCode": "VERSION_MISMATCH",
  "retryable": false,
  "details": {},
  "requestId": "req_xxx"
}
```

### 12.8 `GET /sync/pull`

请求：

- `GET /sync/pull?cursor=<opaque_cursor>`

响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "changes": [],
    "nextCursor": "cursor_next_xxx",
    "hasMore": false
  },
  "requestId": "req_xxx"
}
```

错误示例（cursor 无效）：

```json
{
  "code": "ERROR",
  "message": "cursor 无效",
  "errorCode": "CURSOR_INVALID",
  "retryable": false,
  "details": {},
  "requestId": "req_xxx"
}
```

### 12.9 错误码与客户端动作矩阵（MVP）

请求级：

- `401 UNAUTHORIZED` -> 清 access token，尝试 refresh 一次；失败则跳登录
- `409 CURSOR_EXPIRED` -> 执行全量重建流程
- `409 VERSION_MISMATCH` -> 仅调试接口会出现，客户端不自动重试
- `422 VALIDATION_FAILED` -> 记录错误并停止当前请求
- `429 RATE_LIMITED` -> 指数退避后重试
- `500 INTERNAL_ERROR` -> 短暂退避重试

操作级（`sync/push results[]`）：

- `status=applied` -> 出队
- `status=conflict` -> pull 后重建并重放
- `status=retryable_error` -> 留队并退避重试
- `status=invalid` -> 入死信队列

### 12.10 数据保留策略（MVP）

- `refresh_tokens`：过期后 7 天清理
- `sync_idempotency_records`：创建后 7 天清理
- `sync_conflicts`：默认保留 30 天
- `sync_dead_letters`：默认保留 30 天

说明：

- 请求级错误使用 HTTP 状态码 + 统一错误体
- `sync/push` 操作级错误放在 `data.results[]` 中，字段同样包含 `errorCode/retryable/details`

## 13. 迁移与演进路径

### 阶段 1（MVP）

- 完成 Flask 认证 + 资源接口 + 同步接口
- 前端接入 `authRepository` 与 `syncRepository`
- 保持原 UI 与主要业务流程不变

### 阶段 2（稳定）

- 增强重试参数与退避策略，补充死信可视化处理
- 增加审计与监控（失败率、冲突率、平均同步时延）

### 阶段 3（增强）

- 可选升级到 HttpOnly Cookie
- 字段级冲突合并
- 第三方登录与设备管理

## 14. 验收标准（MVP）

1. 同一账号在两台设备登录后，在以下条件下可在 5 秒内最终一致：
   - 设备数：2
   - 单次变更量：<= 20 条
   - 平均 RTT：<= 300ms
   - `pull` 触发：前台切换或每 3 秒轮询一次
   - 判定口径：两端有效记录数、每条记录 `version` 与 `deletedAt` 状态一致
2. 本地离线新增/编辑数据后，恢复网络可自动补同步
3. 主动登出后，refresh token 失效，旧会话无法继续拉取/推送
4. 用户 A 无法访问用户 B 的任何句子或设置
5. 本地缓存被清理后，重新登录可恢复云端数据
6. 离线删除操作在恢复网络后可正确同步到服务端，并在另一设备体现为删除

## 15. 风险与应对

- **风险：** 同步冲突频率高
  - **应对：** 先用版本并发控制保证一致性，记录冲突日志驱动后续字段级合并
- **风险：** 弱网下请求抖动导致重复写
  - **应对：** `push` 接口支持幂等键
- **风险：** token 泄漏
  - **应对：** 缩短 access token 生命周期，提供主动吊销能力
