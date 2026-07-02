# SmartTodo AI - 智能任务管家 (混合推理 AI 全栈系统)

本项目是一款为《企业综合实训》设计开发的**支持混合推理模式的智能待办事项全栈 Web 应用 (SmartTodo AI)**。
系统核心亮点在于**双模驱动**，同时支持“本地轻量模型 (Ollama)”与“云端大模型 (OpenAI/DeepSeek API)”的智能路由与自动无缝降级切换，并集成了基于本地文档的轻量级 **RAG 知识库问答** 与 **全局 AI Copilot 助手**。

---

## 1. 系统架构设计 (Architecture)

系统采用微服务架构设计，各服务之间职责单一、高度解耦，严格符合 **12-Factor App (无状态、配置与代码分离、环境一致性)** 规范。

```text
+-----------------------------------------------------------+
|                      React Frontend                       |
|          (React 18 + Ant Design + Vite + TypeScript)      |
+-----------------------------------------------------------+
                               |
                               | HTTP (JWT Auth) / JSON
                               v
+-----------------------------------------------------------+
|                     Go Business Service                   |
|             (Gin + GORM + PostgreSQL Client)              |
+-----------------------------+-----------------------------+
              |               |
   PostgreSQL |               | gRPC Communication (Protobuf)
   Connection |               v
              |        +------------------------------------+
              |        |             AI Gateway             |
              |        |     (Python FastAPI + gRPC Server) |
              |        +------------------+-----------------+
              v                           |
      +--------------+                    |
      |  PostgreSQL  |      +-------------+-------------+
      +--------------+      |                           |
                            v                           v
              +--------------------------+  +--------------------------+
              |   Local Model Service    |  |     Cloud API Service    |
              |    (Ollama / Llama3)     |  |   (OpenAI / DeepSeek)    |
              +--------------------------+  +--------------------------+
```

### 核心子系统：
1. **Frontend (React 18)**：基于 Ant Design 打造的高颜值暗黑系玻璃拟物化 (Glassmorphism) 看板，包含待办事项看板、AI 混合推理配置面板、RAG 知识库面板及右下角悬浮 Copilot。
2. **Backend (Go/Gin)**：负责核心业务（JWT 鉴权、任务 CRUD、文件上传多租户物理隔离），作为 gRPC 客户端，动态将用户配置与请求转发给 AI 网关。
3. **AI Gateway (Python/FastAPI)**：双栖服务。主线程运行 FastAPI 暴露健康检查，后台运行高并发 gRPC 服务，负责混合推理路由、JSON Mode 强校验及轻量级 RAG 检索。

---

## 2. 技术栈介绍 (Technology Stack)

* **前端**：`React 18` + `TypeScript` + `Vite` + `Ant Design` + `Lucide Icons`
* **后端**：`Go 1.26` + `Gin` + `GORM` + `PostgreSQL` + `gRPC (google.golang.org/grpc)`
* **AI 网关**：`Python 3.12` + `FastAPI` + `grpcio` + `openai SDK` + `pydantic` + `watchdog` + `uv`
* **数据库**：`PostgreSQL 16`
* **容器化**：`Docker` + `Docker Compose` (多阶段静态编译构建)

---

## 3. 一键启动部署指南 (Production Deployment)

系统已完成全容器化编排，您只需在安装有 Docker 的机器上执行一行命令即可完整启动：

### 3.1 前期准备
1. 确保本地已安装并运行 [Ollama](https://ollama.com/)。
2. 在宿主机终端运行以下命令下载本地轻量大模型（推荐 Qwen2.5 7B 或 Llama3）：
   ```bash
   ollama pull qwen2.5:7b
   ```

### 3.2 一键运行系统
在项目根目录下执行以下命令，Docker 将自动进行多阶段构建并启动四个解耦容器：
```bash
docker-compose up --build -d
```

### 3.3 验证运行状态
启动后，可以通过以下命令查看容器状态：
```bash
docker-compose ps
```
若以下四个容器均处于 `Up` 状态，即表示部署成功：
* `smarttodo-frontend` (监听 `80` 端口)
* `smarttodo-backend` (监听 `8080` 端口)
* `smarttodo-ai-service` (监听 `8000` 和 `50051` 端口)
* `smarttodo-db` (监听 `5432` 端口)

在浏览器中访问：`http://localhost` 即可开始体验系统！

---

## 4. 本地开发与调试指南 (Local Development)

若您需要进行二次开发或本地调试，可以分别启动各服务：

### 4.1 数据库启动
```bash
docker-compose up -d db
```

### 4.2 AI 网关启动 (Python)
1. 进入 `ai_service` 目录，确保已安装 `uv`：
   ```bash
   cd ai_service
   uv sync
   ```
2. 运行双栖服务：
   ```bash
   uv run python main.py
   ```
   * gRPC 服务运行于 `50051` 端口，FastAPI 运行于 `8000` 端口。

### 4.3 后端服务启动 (Go)
1. 进入 `backend` 目录，配置本地环境变量 [backend/.env.local](file:///D:/User/Desktop/SmartTodo/backend/.env.local)：
   ```env
   PORT=8080
   GIN_MODE=debug
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=smarttodo
   JWT_SECRET=your_local_secret_key
   AI_SERVICE_GRPC_ADDR=127.0.0.1:50051
   ```
2. 运行服务（推荐使用 Air 热重载）：
   ```bash
   air
   ```
   
   或者使用传统方式：
   ```bash
   go run cmd/server/main.go
   ```
   
   > **提示**：使用 Air 工具可以实现 Go 源文件改动后的自动编译和服务重启，显著提升开发效率。详细配置请参考 `docs/air热重载配置指南.md`。

### 4.4 前端服务启动 (React)
1. 进入 `frontend` 目录，安装依赖：
   ```bash
   cd frontend
   pnpm install
   ```
2. 启动 Vite 开发服务：
   ```bash
   pnpm run dev
   ```
   * 访问：`http://localhost:5173`。

---

## 5. 核心 AI 功能使用说明

### 5.1 AI 混合推理配置
1. 登录系统后，点击左侧菜单的 **“AI 混合推理配置”**。
2. 可在此处实时切换三种运行模式：
   * **本地推理模式**：仅通过本地 Ollama 进行推理。
   * **云端大模型模式**：仅通过远程 API 推理（需填写 API Key 与 Endpoint）。
   * **智能混合模式**：优先调用云端 API，若网络断开或超时，**自动降级**至本地 Ollama，确保系统 100% 可用。
3. 配置修改后即刻生效，无需重启任何服务。

### 5.2 智能任务拆解 (JSON Mode + Pydantic)
在看板“新建任务”区域，输入任务标题（如“准备毕业答辩”），点击 **“AI 智能拆解”**。
* AI 会自动生成专业化表述，给出紧急程度优先级（P0/P1/P2），预测完成工时，并精准生成 3-5 个级联子任务。
* AI 网关开启了 **JSON Mode**，并通过 **Pydantic** 进行 Schema 强校验，即使模型产生幻觉，系统也能通过防御性本地规则自动修复，100% 保证接口格式稳定性。

### 5.3 RAG 知识库问答 (本地模型)
1. 点击左侧导航进入 **“RAG 智能知识库”**。
2. 上传您的学习笔记或说明文档（支持 `.txt` 或 `.md` 格式，文件大小 5MB 以内）。
3. 后端会自动实现**多租户物理隔离**，将文件保存在用户专属路径下。
4. 输入针对笔记内容的问题（例如：“根据我的笔记，混合推理模式的降级逻辑是什么？”）。
5. AI 网关会启动**轻量级内存检索算法**，对文章进行段落切分（Chunking），并基于关键词频度加权计算匹配出最相关的 Top 3 文本片段，组装为上下文，由**本地 Ollama 模型**生成精准、不掺杂幻觉的回答。

---

## 6. 实训答辩技术亮点 (For Defense)

如果在答辩中老师问起技术亮点，可以重点阐述以下四点：
1. **跨语言微服务设计**：利用 gRPC + Protobuf 建立了 Go 业务端与 Python AI 端的高性能内部通信通道，避免了传统的 HTTP 序列化开销。
2. **12-Factor Stateless 规范**：Python AI 网关完全保持**无状态**，所有模型配置和用户参数均通过请求级动态传递或动态热加载，服务扩容时无需同步状态。
3. **防幻觉结构化输出**：结合 JSON Mode 与 Pydantic 校验解决了大模型输出不稳定、格式易碎的问题，保证了前后端交互的稳定性。
4. **轻量级零依赖 RAG 实现**：未使用重型的商业向量数据库，而是针对实训场景手写了内存级文本切片与关键词相关度排序检索算法，极大地精简了部署架构，提高了本地运行效率。
