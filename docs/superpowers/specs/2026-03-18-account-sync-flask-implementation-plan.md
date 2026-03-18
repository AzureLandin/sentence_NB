# 账号与云同步实现计划（Flask + Vue）

## 0. 目标与原则

- 目标：在现有应用中落地账号体系与自动云同步，解决本地存储不稳定与跨设备不同步问题
- 原则：前端业务写路径统一走 `sync/push`，本地仍保留离线缓存与队列
- 范围：严格按 `2026-03-18-account-sync-flask-design.md` 执行

## 1. 里程碑

### M1 - 后端认证闭环（预计 2-3 天）

- Flask 项目结构搭建（blueprints/services/models）
- `users`、`refresh_tokens` 表落库（含索引与约束）
- 完成 `/auth/register`、`/auth/login`、`/auth/refresh`、`/auth/logout`、`/me`
- Access/Refresh token 轮转与吊销逻辑跑通

验收：

- 注册/登录/refresh/logout 全链路可用
- refresh 轮转后旧 token 失效

### M2 - 同步核心协议（预计 3-4 天）

- 落库 `user_settings`、`sentences`、`sync_idempotency_records`
- 完成 `/sync/push`（操作级回执 + 幂等）
- 完成 `/sync/pull`（cursor + snapshot 语义 + 增量拉取）
- 完成错误码矩阵与统一错误体

验收：

- `applied/conflict/retryable_error/invalid` 4 类结果可稳定返回
- `CURSOR_INVALID/CURSOR_EXPIRED` 恢复路径可执行

### M3 - 前端接入（预计 3-4 天）

- 新增 `authRepository`、`syncRepository`
- 新增 `syncQueue`、`sync_conflicts`、`sync_dead_letters` 本地存储层
- 改造 `settings`、`sentences` store 的写路径（统一入队）
- 登录后首登迁移与基线建立

验收：

- 离线写入 -> 恢复网络 -> 自动补同步
- 双端登录同账号 -> 数据最终一致

### M4 - 稳定性与发布（预计 2 天）

- 补充集成测试与冒烟清单
- 优化退避参数、超时与重试边界
- 增加最小可观测日志（同步失败/冲突率）

验收：

- 达到 spec 中 MVP 验收标准

## 2. 后端任务拆解（Flask）

### 2.1 数据模型与迁移

- 创建 SQLAlchemy 模型：`User`、`RefreshToken`、`UserSettings`、`Sentence`、`SyncIdempotencyRecord`
- 增加索引与唯一约束
  - `users.email` 唯一
  - `sync_idempotency_records(user_id, device_id, op_id)` 唯一
  - `sentences(user_id, updated_at)` 复合索引

### 2.2 认证与会话

- `AuthService`
  - 注册（email 归一化、密码哈希）
  - 登录（签发 token）
  - refresh（轮转 + 旧 token 吊销）
  - logout（当前 refresh token 吊销）
- 鉴权中间件
  - 解析 Bearer token
  - 注入 `current_user`

### 2.3 同步服务

- `SyncPushService`
  - 校验 `deviceId`
  - 顺序执行 operations（单条事务）
  - 幂等命中与结果重放
  - 生成 `results[]`
- `SyncPullService`
  - 构建 opaque cursor
  - snapshot 视图分页
  - 变更流排序与去重约束

### 2.4 API 蓝图

- `auth_blueprint`、`user_blueprint`、`sync_blueprint`
- 调试入口（非 MVP 客户端路径）
  - `GET/PUT /settings`
  - `POST/PUT/DELETE /sentences`

## 3. 前端任务拆解（Vue）

### 3.1 新增模块

- `src/repositories/authRepository.js`
- `src/repositories/syncRepository.js`
- `src/utils/syncQueue.js`
- `src/utils/syncConflictStore.js`
- `src/utils/syncDeadLetterStore.js`

### 3.2 Store 改造

- `settings`：变更后防抖入队 `setting/replace`
- `sentences`：增删改入队 `sentence/create|upsert|delete`
- 增加全局同步状态：`idle/syncing/error/offline`

### 3.3 登录与首登迁移

- 登录成功后执行空 cursor pull
- 套用首登迁移规则（含 settings）
- 保存 `nextCursor`

### 3.4 队列执行器

- 触发时机：应用启动、切前台、网络恢复、定时器
- 执行流程：push -> 处理回执 -> 必要时 pull -> 重放
- 异常处理：
  - `retryable_error` 退避重试
  - `conflict` 入冲突桶并引导用户
  - `invalid` 入死信队列

## 4. 测试计划

### 4.1 后端测试

- 单测：AuthService、SyncPushService、SyncPullService
- 集成：
  - refresh 轮转与旧 token 失效
  - push 幂等重复提交
  - cursor 过期触发重建

### 4.2 前端测试

- 仓储层接口测试（mock API）
- 队列状态机测试（出队、重试、冲突、死信）
- 首登迁移测试（本地已有数据）

### 4.3 E2E 冒烟

- A 设备新增句子，B 设备可见
- 离线编辑后在线自动同步
- 删除同步到另一端
- 清缓存后重新登录恢复数据

## 5. 发布顺序

1. 先上线后端（灰度环境）
2. 前端接入但默认关闭同步（feature flag）
3. 小流量开启账号同步
4. 观察错误率后全量打开

## 6. 风险与回滚

- 风险：同步异常导致用户疑似丢数据
  - 缓解：本地缓存不立即物理删除，保留冲突桶与死信
- 风险：refresh 轮转导致多标签页抢占
  - 缓解：前端加单飞锁（single-flight）
- 回滚策略：
  - 前端关闭 feature flag，退回本地模式
  - 后端保留接口但不强制前端调用

## 7. 首批实施顺序（建议）

1. 后端认证（M1）
2. 后端同步协议（M2）
3. 前端仓储与队列（M3-前半）
4. 首登迁移与状态提示（M3-后半）
5. 冒烟 + 灰度（M4）
