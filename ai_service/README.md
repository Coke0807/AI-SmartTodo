# SmartTodo AI Service

SmartTodo AI 微服务，基于 **FastAPI + gRPC** 双协议架构，提供 LLM 推理能力。

## 架构概述

```
Go Backend (Gin)  ──gRPC(:50051)──>  AI Service  ──HTTP──>  Ollama (本地)
                                      │
Frontend (React) ──SSE(:8000)─────────┘        ──HTTPS──>  DeepSeek/OpenAI (云端)
```

- **gRPC 端口 (50051)**: 供 Go 后端内部调用（任务拆解、Chat、RAG 问答）
- **HTTP 端口 (8000)**: FastAPI 提供健康检查和 SSE 流式聊天端点

## 核心模块

| 文件 | 说明 |
|------|------|
| `main.py` | 服务入口，同时启动 gRPC 和 FastAPI 双协议服务 |
| `llm_client.py` | 统一 LLM 调用客户端，支持 local / cloud / hybrid 三种模式 |
| `split_service.py` | AI 任务拆解服务，JSON Mode + Pydantic 校验 + 规则引擎降级兜底 |
| `rag_service.py` | 轻量级 RAG 知识库问答，基于关键词 TF-IDF 匹配，强制本地模型处理 |
| `todo_ai_pb2*.py` | protoc 生成的 gRPC 桩代码（不可手动修改） |

## 双模推理模式

| 模式 | 行为 |
|------|------|
| `local` | 仅使用本地 Ollama 模型 |
| `cloud` | 仅使用云端 API（需要有效 API Key） |
| `hybrid` | 优先云端，失败自动降级到本地（默认模式） |

## 快速开始

```bash
# 安装依赖（推荐使用 uv）
cd ai_service
uv sync

# 启动服务（gRPC :50051 + FastAPI :8000）
python main.py
```

## 环境要求

- Python >= 3.12
- Ollama 已安装并运行（本地推理模式需要）
- 可选：DeepSeek / OpenAI API Key（云端推理模式需要）

## API 端点

### gRPC (端口 50051)
- `Ping` - 连通性测试
- `SplitTask` - AI 智能任务拆解
- `Chat` - AI 助手对话
- `RAGQuery` - 知识库问答

### HTTP REST (端口 8000)
- `GET /health` - 健康检查
- `POST /v1/chat/stream` - SSE 流式聊天（前端悬浮球助手使用）

## Docker 部署

```bash
# 构建镜像
docker build -t smarttodo-ai-service .

# 运行容器
docker run -d -p 8000:8000 -p 50051:50051 \
  --add-host=host.docker.internal:host-gateway \
  smarttodo-ai-service
```
