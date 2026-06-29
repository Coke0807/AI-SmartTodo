# SmartTodo AI (智能任务管家)

## 1. 项目概述
- **项目定位与核心功能**: 一款结合 AI 大模型的智能待办事项 Web 应用。核心亮点为"混合推理模式"——同时支持本地轻量模型 (Ollama) 和云端大模型 (OpenAI/DeepSeek API)，根据网络状态自动降级切换。功能涵盖：JWT 鉴权、任务 CRUD、AI 智能拆解子任务、AI 预估耗时、智能优先级打标 (P0/P1/P2)、RAG 知识库问答、全局悬浮 AI 助手。
- **目标用户与使用场景**: 软件工程专业学生实训项目，面向需要 AI 辅助任务管理的个人用户。
- **技术栈与依赖环境**:
  - 核心语言/版本: Go 1.26.0 / Python >=3.12 / TypeScript 6
  - 运行时环境: Node.js (pnpm) / Python (uv) / Go
  - 核心框架: React 19 + Ant Design 6 + Vite 8 (前端) / Gin + GORM + PostgreSQL (后端) / FastAPI + gRPC (AI 服务)
  - 关键依赖: `gin-gonic/gin`, `gorm.io/gorm`, `golang-jwt/jwt/v5`, `google.golang.org/grpc`, `fastapi`, `openai`, `grpcio`, `antd`, `lucide-react`
- **快速开始指南**:
  1. 启动数据库: `docker compose up -d postgres`
  2. 后端: 复制 `backend/.env.example` 为 `backend/.env.local`，修改密码后在 `backend/` 下运行 `go run ./cmd/server/`
  3. AI 服务: 在 `ai_service/` 下运行 `uv sync && python main.py`
  4. 前端: 在 `frontend/` 下运行 `pnpm install && pnpm dev`
  5. 访问 `http://localhost:5173`

## 2. 目录结构
- **关键目录说明**:
  ```
  SmartTodo/
  ├── CLAUDE.md                  # 项目 AI 助手指令文件 (本文件)
  ├── compose.yaml               # Docker Compose 编排 (当前仅 PostgreSQL)
  ├── docs/
  │   └── 14天混合推理AI全栈项目开发计划书.md  # 开发计划书 (原 PRD)
  ├── proto/
  │   └── todo_ai.proto          # gRPC 服务与消息定义 (Go/Python 共用)
  ├── backend/                   # Go 业务服务 (Gin)
  │   ├── go.mod                 # Go 模块定义与依赖
  │   ├── .env.example           # 环境变量模板
  │   ├── cmd/server/main.go     # 服务入口 (HTTP :8080)
  │   ├── cmd/grpc_test/main.go  # gRPC 连通性测试工具
  │   ├── internal/
  │   │   ├── config/config.go   # 环境变量读取 (godotenv)
  │   │   ├── model/             # GORM 数据模型 (User, Todo, SubTask)
  │   │   ├── controller/        # HTTP 处理器 (auth.go, todo.go, ai.go)
  │   │   ├── middleware/auth.go # JWT 鉴权中间件
  │   │   ├── repository/db.go   # PostgreSQL 连接与 AutoMigrate
  │   │   └── service/ai_client.go # gRPC 客户端 (连接 Python AI 服务)
  │   └── pkg/pb/                # protoc 生成的 Go gRPC 桩代码
  ├── ai_service/                # Python AI 微服务 (FastAPI + gRPC)
  │   ├── pyproject.toml         # Python 依赖 (uv 管理)
  │   ├── main.py                # 入口: gRPC :50051 + FastAPI :8000
  │   ├── llm_client.py          # 双模 LLM 客户端 (local/cloud/hybrid)
  │   ├── split_service.py       # AI 任务拆解 (JSON Mode)
  │   ├── rag_service.py         # 轻量级 RAG (关键词匹配, 无向量数据库)
  │   └── todo_ai_pb2*.py        # protoc 生成的 Python gRPC 桩代码
  └── frontend/                  # React 前端 SPA
      ├── package.json           # pnpm 依赖
      ├── vite.config.ts         # Vite 配置 (/api 代理到 :8080)
      └── src/
          ├── main.tsx           # React 入口
          ├── App.tsx            # 主布局 (Sider + 路由 + AI 组件)
          ├── index.css          # 全局主题 (Cosmic Dark + Glassmorphism)
          ├── components/        # AiAssistant.tsx, ModelConfigModal.tsx
          ├── pages/             # Login.tsx, Dashboard.tsx, KnowledgeBase.tsx
          ├── services/          # api.ts, auth.ts, todo.ts, ai.ts
          ├── hooks/useAuth.ts   # JWT 鉴权状态管理
          └── types/config.ts    # AiConfig, TodoItem, TaskPriority 类型
  ```
- **文件组织方式**: 三层微服务架构 (Frontend → Go Backend → Python AI Service)，各服务独立目录，通过 Protobuf 定义 gRPC 接口契约。
- **配置文件位置**:
  - 后端: `backend/.env.local` (从 `.env.example` 复制)
  - AI 服务: 通过环境变量或前端请求级 AI 配置传递
  - 前端: AI 配置存储在 `localStorage` (`smarttodo_ai_config`)
  - Docker: `compose.yaml` (项目根目录)
- **资源文件位置**: `frontend/public/` (favicon.svg, icons.svg), `frontend/src/assets/` (hero.png, react.svg, vite.svg)

## 3. 开发规范
- **代码风格与格式要求**:
  - Go: 标准 Go 格式 (`gofmt`)，错误处理不忽略，GORM 模型使用 `json` tag 控制序列化
  - Python: 使用 Pydantic 做数据校验，gRPC 桩代码由 protoc 生成不可手动修改
  - TypeScript: 严格模式 (`noUnusedLocals`, `noUnusedParameters`)，使用 `oxlint` 做 lint
  - 前端不使用 `any` 类型，AI 配置通过 `AiConfig` 接口严格约束
- **命名规范与约定**:
  - Go: 包名小写单词，结构体 PascalCase，JSON tag snake_case
  - Python: 函数 snake_case，类 PascalCase
  - TypeScript: 组件 PascalCase，函数/变量 camelCase，常量 UPPER_SNAKE_CASE
  - Proto: package `pb`，service `AIService`，消息 PascalCase
- **Git 提交规范**: `[TBD: 需团队补充隐式知识]`
- **安全注意事项**:
  - JWT Secret 必须通过环境变量 `JWT_SECRET` 设置，禁止使用默认值进入生产
  - API Key 仅在前端 localStorage 存储，通过请求体传递给后端再转发 AI 服务，服务端不持久化
  - 文件上传仅允许 `.txt/.md/.markdown`，按用户 ID 隔离存储在 `uploads/user_{id}/`
  - CORS 当前允许所有来源 (`*`)，生产环境需收紧

## 4. 常用命令
- **安装和启动命令**:
  ```bash
  # 数据库 (Docker)
  docker compose up -d postgres

  # 后端 (Go)
  cd backend && cp .env.example .env.local  # 首次需配置
  go run ./cmd/server/                       # 启动 HTTP :8080

  # AI 服务 (Python)
  cd ai_service && uv sync && python main.py  # gRPC :50051 + FastAPI :8000

  # 前端 (React)
  cd frontend && pnpm install && pnpm dev     # Vite :5173
  ```
- **测试和检查命令**:
  ```bash
  # 前端 lint
  cd frontend && pnpm lint

  # 前端构建检查
  cd frontend && pnpm build

  # Go 编译检查
  cd backend && go build ./...

  # gRPC 连通测试
  cd backend && go run ./cmd/grpc_test/
  ```
- **构建和部署命令**:
  ```bash
  # 全部容器化启动 (待完善 compose.yaml)
  docker compose up -d --build
  ```
- **环境变量配置**:

  | 变量 | 说明 | 示例 |
  |------|------|------|
  | `PORT` | Go 服务端口 | `8080` |
  | `GIN_MODE` | Gin 运行模式 | `debug` / `release` |
  | `DB_HOST` | PostgreSQL 地址 | `127.0.0.1` |
  | `DB_PORT` | PostgreSQL 端口 | `5432` |
  | `DB_USER` | 数据库用户 | `postgres` |
  | `DB_PASSWORD` | 数据库密码 | `yourpassword` |
  | `DB_NAME` | 数据库名 | `smarttodo` |
  | `DB_SSLMODE` | SSL 模式 | `disable` |
  | `JWT_SECRET` | JWT 签名密钥 | `your_jwt_secret_key_here` |
  | `JWT_EXPIRY_HOURS` | Token 有效期 (小时) | `24` |
  | `AI_SERVICE_GRPC_ADDR` | AI 服务 gRPC 地址 | `127.0.0.1:50051` |

## 5. 技术决策
- **架构设计原因**:
  - 三服务分离 (Frontend / Go Backend / Python AI): Go 擅长高并发 HTTP 业务处理，Python 生态天然适合 LLM 集成，通过 gRPC 实现跨语言高效通信
  - AI 配置请求级传递: 前端每次请求携带 `AiConfig`，经 Go 透传至 Python，实现用户级模型切换，无需服务端重启
  - 双协议 AI 服务: gRPC (端口 50051) 供 Go 内部调用，FastAPI (端口 8000) 预留 REST 接口扩展
- **技术选型理由**:
  - Gin + GORM: Go 生态最成熟的 HTTP 框架 + ORM 组合
  - FastAPI + OpenAI SDK: Python 异步高性能框架，OpenAI SDK 统一本地/云端调用接口 (Ollama 兼容 `/v1` 端点)
  - Ant Design 6: 企业级 UI 组件库，内置表单校验、表格、弹窗等复杂组件
  - Lucide React: 轻量图标库，与 AntD 互补
  - 轻量级 RAG: 不引入向量数据库，使用正则分段 + TF-IDF 关键词匹配，降低部署复杂度
- **重要设计模式**:
  - JWT 无状态鉴权: `middleware/auth.go` 解析 Bearer Token → 写入 Gin Context → Controller 读取 `userID`
  - gRPC 服务抽象: `service/ai_client.go` 封装全局 `AIClient`，Controller 通过它调用 AI 服务
  - 前端服务层分离: `api.ts` (统一 HTTP 客户端) → `auth.ts` / `todo.ts` / `ai.ts` (业务 API)
- **历史包袱说明**:
  - `go.mod` 声明 `go 1.26.1`（该版本尚不存在），可能影响 CI/CD 构建
  - `compose.yaml` 仅定义了 PostgreSQL，Go Backend / Python AI / Frontend 三个容器服务待补充
  - `ai_service/README.md` 为空文件
  - `pyproject.toml` 引入了 `watchdog` 依赖但未使用

## 6. 工作流程
- **开发流程步骤**:
  1. 修改 Proto 定义 (`proto/todo_ai.proto`) → 分别为 Go 和 Python 重新生成桩代码
  2. 后端开发: 修改 `internal/` 下的 controller/service/model → Go 编译检查
  3. AI 服务开发: 修改 `ai_service/` 下的 service/llm_client → Python 运行测试
  4. 前端开发: 修改 `frontend/src/` → `pnpm dev` 热更新
  5. 联调: 前端 → Vite proxy → Go Backend → gRPC → Python AI Service
- **PR 审核标准**: `[TBD: 需团队补充隐式知识]`
- **发布流程说明**: 当前为本地开发阶段，最终通过 `docker compose up -d --build` 容器化交付
- **问题排查指南**:
  - **前端请求 401**: 检查 localStorage 中 `smarttodo_token` 是否存在且未过期
  - **gRPC 连接失败**: 确认 Python AI 服务已启动且监听 `50051` 端口
  - **AI 拆解返回空**: 检查 Ollama 是否运行 (`ollama list`)，或云端 API Key 是否有效
  - **数据库连接失败**: 确认 Docker PostgreSQL 容器已启动 (`docker ps`)，密码与 `.env.local` 一致
  - **RAG 问答无结果**: 确认已上传 TXT/MD 文件到知识库，且 Ollama 本地模型可用
