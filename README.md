# blog-manage-serve 服务端

White Blog 管理端服务端，基于 **Express 5 + TypeScript + MySQL**。它同时承担三件事：

1. 为管理后台提供 27 个 JWT 鉴权的 POST 接口（文章、图库、随笔、文件、分组、标签、评论、私信、总览）；
2. 为博客展示端（Nuxt）提供 8 个匿名只读 GET 接口；
3. 托管上传图片的静态目录 `data/files`（对外路径 `/files/**`）。

## 功能

- 管理员注册、登录，签发 JWT（有效期 30 天）
- 文章与图库共用 `article` 表，用 `classify` 区分（0 文章 / 1 图库），`state` 控制草稿与发布
- 富文本内容、封面、标签（最多 3 个）、分组管理
- 随笔随记（文字 + 图片）
- 文件上传、重命名、移动分组、单张 / 批量删除；删除前检查内容引用，被引用时返回 409
- 总览统计：文章 / 图库 / 随笔数量，以及 `data/files` 目录占用大小
- 展示端公开接口：文章与图库列表 / 详情、分组、标签、随笔、站点统计
- 启动时自动建库、建表（要求数据库账号有建库权限）

## 技术栈

| 用途 | 技术 |
| --- | --- |
| Web 框架 | Express 5 |
| 语言 / 运行 | TypeScript（ESM）、Node.js 22+ |
| 数据库 | MySQL（`mysql` 驱动，回调式 API，连接池 10） |
| 鉴权 | jsonwebtoken（JWT） |
| 上传 | multer（磁盘存储，单文件 15 MB） |
| 跨域 | cors |
| 开发 | nodemon、tsx |
| 测试 | node:test（`tests/` 下 2 个文件） |

## 目录结构

```text
blog-manage-serve/
├─ main.ts                  # 启动入口：静态目录 → CORS → 路由注册 → 建库建表 → listen
├─ config/default.ts        # 端口、时区、数据库连接
├─ controller/
│  ├─ serve.ts              # 管理端接口（27 个）
│  └─ public.ts             # 展示端公开接口（8 个）
├─ middleware/auth.ts       # JWT 鉴权中间件
├─ model/
│  ├─ db.ts                 # 连接池、建库、建表、初始化
│  ├─ createDB.ts           # 11 张表的建表语句
│  ├─ db_method.ts          # 管理端 SQL（含历史拼接写法）
│  └─ public_method.ts      # 公开端 SQL（参数化）
├─ routes/
│  ├─ index.ts              # 管理端路由注册 + 鉴权挂载
│  ├─ public.ts             # 8 个匿名 GET 路由
│  └─ files.ts              # POST /upload（multer + 文件记录入库）
├─ lib/
│  ├─ jwt.ts                # 签发 / 校验 token
│  ├─ date.ts               # 时间格式化（Asia/Shanghai）
│  └─ mkdir.ts              # 文件删除、目录大小统计
├─ data/files/              # 上传图片（运行时自动创建，静态访问）
├─ tests/
│  ├─ files.route.test.ts   # 上传路由静态断言（不连库）
│  └─ file-usage.test.ts    # 文件引用检查（需真连 MySQL）
├─ nodemon.json
└─ package.json
```

## 快速开始

### 环境要求

- Node.js 22+（建议 24 LTS）
- pnpm 11+
- MySQL 8.x，账号需要有建库建表权限

### 安装与启动

```bash
cd blog-manage-serve
pnpm install

# 先改 config/default.ts 里的数据库连接（默认 localhost / root / 123456 / white_blog）
pnpm dev        # nodemon + tsx，监听 3000 端口
```

启动时会按顺序执行：

1. 托管 `data/` 静态目录（对外 `/files/**`）
2. 挂 CORS、JSON 解析
3. 注册公开接口 → 管理接口 → 上传路由
4. 执行 `initDatabase()`：建库、建表；失败则 `process.exit(1)`
5. `app.listen(3000)`

首次启动会自动创建数据库 `white_blog`、11 张表，以及 `data/files` 目录。

### 构建与运行

```bash
pnpm build      # tsc 编译到 dist/
pnpm start      # node dist/main.js
```

编译后 `data/` 位于 `dist/` 的上一级，`main.ts` 与 `routes/files.ts` 都已按这个目录关系处理路径。

## 配置

服务端没有 `.env`，以下配置都在源码中：

| 文件 | 配置 |
| --- | --- |
| `config/default.ts` | `port: 3000`、`timeZone: 'Asia/Shanghai'`、MySQL 连接 `localhost / root / 123456 / white_blog` |
| `main.ts` | CORS 白名单 `http://localhost:5174`、允许 `Authorization` 头、`credentials: true`；静态目录 `data` |
| `lib/jwt.ts` | JWT secret（硬编码）、`expiresIn` 30 天、payload `{ id: 用户名, time }` |
| `routes/files.ts` | 上传目录 `data/files`、单文件上限 15 MB、允许 jpg / jpeg / png / webp |

> 管理端前端默认跑在 5174 端口；如果前端端口不同，需要同步修改 `main.ts` 的 CORS `origin`。

## 接口

### 通用约定

统一响应结构：

```json
{ "code": 200, "data": {}, "msg": "" }
```

| code | 含义 |
| --- | --- |
| 200 | 成功 |
| 300 | token 无效或已过期（鉴权失败，HTTP 状态仍为 200） |
| 400 | 参数错误 / 登录失败 |
| 404 | 内容不存在 |
| 409 | 文件被内容引用，不可删除 |
| 500 | 服务异常 |

- 鉴权：`Authorization: Bearer <token>`，同时兼容请求体中的 `token` 字段
- 管理端分页参数为 `pageSize`、`nowPage`，部分接口传 `count: true` 才会同时返回总条数（`count: -1` 表示不统计）
- 公开接口分页参数为 `page`、`pageSize`，`pageSize` 最大 50

> 目前失败响应存在两种风格：一部分用 HTTP 状态码 + `{code, msg}`，一部分固定 HTTP 200 只改业务 `code`，调用方需要两种都处理。

### 免鉴权接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/` | 健康检查，返回纯文本 `你好` |
| POST | `/isRegister` | 判断是否已有注册用户 |
| POST | `/register` | 管理员注册 |
| POST | `/signin` | 管理员登录，返回 `{ id, name, token }` |

登录示例：

```bash
curl -X POST http://127.0.0.1:3000/signin \
  -H "Content-Type: application/json" \
  -d '{"name":"admin","psw":"你的密码"}'
```

```json
{ "code": 200, "data": { "id": 1, "name": "admin", "token": "eyJ..." } }
```

### 管理端接口（需鉴权，全部 POST）

| 模块 | 路径 | 说明 |
| --- | --- | --- |
| 总览 | `/overview` | 文章 / 图库 / 随笔数量 + `data/files` 目录大小（格式化为 `xx KB` / `xx MB`） |
| 文章 | `/article` | 列表：`pageSize`、`nowPage`、`state`、`subsetId`、`serchTerm`、`classify`、`count`；返回 `count` + `result` |
| 文章 | `/articleState` | 各状态 / 分组下的文章数量 |
| 文章 | `/changeArticleState` | 发布 / 撤回：`{ articleId, state }` |
| 文章 | `/deleteArticle` | 删除：`{ articleId, classify }` |
| 文章 | `/createArticle` | 新建文章 / 图库：`value` + `classify` |
| 文章 | `/gainArticle` | 获取单篇用于编辑 |
| 文章 | `/updateArticle` | 更新文章 / 图库 |
| 图库 | 复用文章接口 | 传 `classify = 1` 区分 |
| 随笔 | `/diary` | 列表：`pageSize`、`nowPage`、`serchTerm`、`count` |
| 随笔 | `/createDiary` | 新建：`value` |
| 随笔 | `/deleteDiary` | 删除：`id` |
| 文件 | `/getFile` | 列表：`pageSize`、`nowPage`、`subsetId`、`count`；返回 `in_use` 标记 |
| 文件 | `/upload` | 上传（单独鉴权），见下文 |
| 文件 | `/removeFile` | 移入其他资源分组 |
| 文件 | `/renameFile` | 重命名：`{ fileId, fileName }` |
| 文件 | `/deleteFile` | 删除：`{ filesId: number[] }`，单次最多 100 个 |
| 分组 | `/subset` | 分组列表 |
| 分组 | `/addSubset` | 新建分组 |
| 分组 | `/updateSubset` | 重命名分组 |
| 分组 | `/deleteSubset` | 删除分组 |
| 标签 | `/label` | 标签列表 |
| 标签 | `/addLabel` | 新建标签 |
| 标签 | `/deleteLabel` | 删除标签 |
| 评论 | `/comment` | 评论列表 |
| 评论 | `/deleteComment` | 删除评论 |
| 私信 | `/getMessage` | 私信列表 |
| 私信 | `/getNoreadMessage` | 未读私信数 |
| 私信 | `/deleteMessage` | 删除私信 |

### 展示端公开接口（匿名 GET）

| 路径 | 参数 | 说明 |
| --- | --- | --- |
| `/public/articles` | `page`、`pageSize`、`subsetId`、`label`、`q` | 已发布文章列表，不含正文；`label` 用 `FIND_IN_SET` 匹配，`q` 搜标题 / 简介 |
| `/public/articles/:id` | — | 文章详情：正文 HTML、`prev` / `next`、同组 `related`（最多 3 篇）；非数字 / 草稿 / 图库 / 不存在均 404 |
| `/public/gallery` | 同文章列表 | 已发布图库列表（`classify = 1`） |
| `/public/gallery/:id` | — | 图库详情，`content` 解析为 `images[]` |
| `/public/subsets` | `classify=0\|1` | 分组列表；其他值返回 400 |
| `/public/labels` | — | 已发布文章实际使用的标签及文章数，按数量降序 |
| `/public/moments` | `page`、`pageSize` | 随笔分页（`diary` 表没有发布状态） |
| `/public/site` | — | 站点统计：文章、图库、随笔、标签数量 |

列表统一返回：

```json
{ "code": 200, "data": { "count": 24, "page": 1, "pageSize": 10, "result": [] } }
```

图片字段只返回文件名（如 `a1b2c3.jpg`），由前端拼接 `/files/` 使用。

### 上传与静态文件

```bash
curl -X POST http://127.0.0.1:3000/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@cover.png" \
  -F "subsetId=20"
```

```json
{ "code": 200, "data": { "id": 12, "url": "0f8c...e1.png", "fileName": "cover", "format": "png", "subset_id": 20 } }
```

- 字段：`file`（单文件）+ `subsetId`（资源分组，必须是 `classify = 2` 的分组）
- 限制：jpg / jpeg / png / webp，MIME 与扩展名双检，单张 ≤ 15 MB
- 落盘：`data/files/<uuid>.<ext>`，数据库 `file` 表记录地址、展示名、格式、分组
- 访问：`http://127.0.0.1:3000/files/<url>`

## 数据库

共 11 张表，建表语句在 `model/createDB.ts`，字符集 `utf8mb4`，均无外键与额外索引：

| 表 | 用途 |
| --- | --- |
| `users` | 管理员账号（`password` 目前明文） |
| `subset` | 分组：`classify` 0 文章 / 1 图库 / 2 资源 |
| `file` | 上传文件登记：`url`、`file_name`、`format`、`subset_id` |
| `article` | 文章与图库共用：`classify` 类型、`state` 状态、`label` 逗号串、`content` HTML 或图片 JSON、`views` / `praise` 计数 |
| `praise` | 点赞记录（保留，暂无写入） |
| `comment` | 评论 |
| `label` | 标签 |
| `diary` | 随笔随记（无 state 字段） |
| `weather` | 天气（当前未使用） |
| `message` | 私信 |
| `record` | 预留表，未使用 |

文件是否被引用不是独立字段，而是查询时用 `EXISTS + LOCATE` 实时判断，覆盖 `article.cover`、`article.content`、`diary.picture`、`diary.content`、`users.imgurl`、`comment`、`message` 等字段。

## 测试

`tests/` 下现有两个测试文件：

- `files.route.test.ts`：不连数据库，静态断言 `/upload` 路由注册了 4 个参数（鉴权、解析、保存）
- `file-usage.test.ts`：真连 MySQL，验证被文章引用的文件 `in_use` 标记正确

`package.json` 的 `test` 脚本仍是占位命令（会报错退出），需要自行用 tsx / node 运行对应测试文件。

## 已知问题与后续计划

**安全**

- 管理员密码明文存储，登录直接比较明文；应改为 bcrypt / argon2
- JWT secret 硬编码在 `lib/jwt.ts`，应改为环境变量并支持轮换
- `model/db_method.ts` 中仍有 SQL 字符串拼接（登录、分组重命名、标签删除、文件分页等），存在注入风险；`public_method.ts` 已全部参数化
- CORS 只允许 `http://localhost:5174`，部署时需按环境配置
- 没有 `.env` 与配置校验，数据库账号直接写在源码
- 无限流 / 登录失败锁定；`/upload` 只校验类型与大小，没有图片内容重编码

**健壮性**

- 失败响应风格不统一（HTTP 200 + 业务 code 与 HTTP 4xx/5xx 混用）
- 没有统一错误处理中间件；抛出的异步异常依赖 Express 5 默认错误处理（返回 HTML 500），不适合直接暴露给前端
- 总览里的文件大小使用相对路径 `data/files`，依赖进程工作目录；从其他目录启动会统计错目录或报 ENOENT
- 数据库连不上时直接退出进程（属于当前的启动策略，部署时需要配合重启策略）

**数据一致性**

- `article.views`、`praise` 表没有写入逻辑，浏览量 / 点赞数不会增长
- 删除文章 / 图库不级联清理评论、点赞
- 删除或重命名分组不会同步调整文件与内容的归属
- 客户端先上传图片、后保存内容，用户取消保存会留下未被引用的孤儿文件，服务端没有清理任务
- `label` 用逗号分隔字符串存储，标签统计依赖拆分，无法建索引

**性能**

- 文章 / 评论列表每条记录单独查点赞数、评论数，存在 N+1
- 总览的文件大小每次请求递归遍历整个 `data/files`，文件多时变慢，且没有缓存
- 深分页使用 `LIMIT offset, size`，数据量大后效率下降

## 部署提示

- `pnpm build` 后用 `node dist/main.js` 启动，确保 `data/` 目录权限与持久化（图片是唯一副本，注意备份）
- 生产环境建议用 Nginx 反向代理 `/public/**` 与 `/files/**`，并把 CORS、JWT secret、数据库配置改为环境变量
- 前端接口地址目前写死 `http://127.0.0.1:3000`，部署到服务器时需要同步修改
- MySQL 需要提前建好账号并授权；首次启动会自动建库建表

## 相关文档

- [docs/API.md](../docs/API.md) —— 2026-11-02 版接口文档快照，部分字段与实现已不一致，以 `routes/`、`controller/` 源码为准
- [docs/摄影图库编辑与删除接口接入说明.md](../docs/摄影图库编辑与删除接口接入说明.md) —— 图库与文章共用 `article` 表的字段约定
- 展示端联调文档在 `../../white-blog/docs/`：`Nuxt前后端联调清单.md`、`后端公共接口改造任务单.md`、`后端公开接口设计详解.md`

## License

ISC（见 `package.json`）。
