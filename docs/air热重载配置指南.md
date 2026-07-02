# Air 热重载配置指南

本指南详细介绍如何在 Go 项目中配置和使用 Air 工具实现热重载，提供类似 Node.js 中 Nodemon 的开发体验。

## 1. 安装 Air 工具

推荐使用以下方式安装 Air：

```bash
go install github.com/air-verse/air@latest
```

安装完成后，需要确保 `$GOPATH/bin` 目录已添加至系统环境变量 `PATH` 中，以保证 `air` 命令能够在任意终端目录下被正确执行。

**验证安装**：
```bash
air -v
```

## 2. 项目配置文件创建

在项目 `backend` 目录下创建名为 `.air.toml` 的配置文件。项目的 `backend/.gitignore` 文件已预先配置包含 `bin/` 目录，因此使用 Air 生成的运行产物将不会被 Git 版本控制系统追踪和提交。

**配置文件内容** (`backend/.air.toml`)：

```toml
root = "."
tmp_dir = "bin"

[build]
cmd = "go build -o ./bin/server ./cmd/server"
full_bin = "bin/server"
include_ext = ["go"]
exclude_dir = ["vendor", "bin", "tmp"]
exclude_regex = ["_test.go"]
delay = 1000

[log]
time = false

[misc]
clean_on_exit = true
```

**配置说明**：
- `root`: 监控根目录，`.` 表示当前目录
- `tmp_dir`: 编译输出目录，`bin` 目录已被 `.gitignore` 忽略
- `build.cmd`: 编译命令，输出到 `./bin/server`
- `build.full_bin`: 完整的二进制文件路径
- `build.include_ext`: 监控的文件扩展名，只监控 `.go` 文件
- `build.exclude_dir`: 排除监控的目录
- `build.exclude_regex`: 排除监控的文件正则表达式，排除测试文件
- `build.delay`: 文件变化后延迟编译的时间（毫秒）
- `log.time`: 日志中不显示时间戳
- `misc.clean_on_exit`: 退出时清理临时文件

## 3. 服务启动方式更新

将原有的服务启动命令修改为：

```bash
cd backend && air
```

执行此命令后，Air 工具将自动监听项目中所有 Go 源文件的改动，并在检测到变化时触发自动编译和服务重启流程。

**开发工作流**：
1. 启动数据库：`docker compose up -d postgres`
2. 配置后端环境变量：`cd backend && cp .env.example .env.local`（编辑 `.env.local`）
3. 使用 Air 启动后端：`cd backend && air`
4. 启动 AI 服务：`cd ai_service && uv sync && uv run python main.py`
5. 启动前端：`cd frontend && pnpm install && pnpm dev`

## 4. Air 工具常用命令

**启动 Air**：
```bash
# 在 backend 目录下
air

# 或者指定配置文件
air -c .air.toml
```

**Air 运行时命令**：
- `Ctrl+C`: 停止 Air 和正在运行的程序
- Air 会自动监控文件变化并重新编译

## 5. 故障排除

**问题 1：Air 命令未找到**
- 确保 `$GOPATH/bin` 在系统 `PATH` 中
- 检查 Go 环境变量：`go env GOPATH`

**问题 2：编译失败**
- 检查 Go 代码是否有语法错误
- 确保所有依赖已安装：`go mod tidy`

**问题 3：权限问题**
- 在 Linux/macOS 上，可能需要给 Air 执行权限
- Windows 上通常不需要额外权限

## 6. 最佳实践

1. **保持 `.air.toml` 在版本控制中**：团队共享配置，确保一致性
2. **定期清理 `bin/` 目录**：虽然 `.gitignore` 已忽略，但本地可能积累旧版本
3. **结合 IDE 使用**：大多数 Go IDE 支持 Air 集成，提供更好的开发体验
4. **监控日志**：Air 的输出包含编译和运行时日志，便于调试

## 7. 与现有开发流程集成

Air 工具可以无缝集成到现有的开发流程中：

**启动顺序**：
```
Docker PostgreSQL → Air (Go Backend) → Python AI Service → React Frontend
```

**优势**：
- 文件保存后自动重启服务，无需手动操作
- 编译错误会显示在终端，便于快速定位问题
- 保持与原有 `go run` 相同的开发体验，但增加了热重载功能

---

通过上述配置，Air 工具将实现 Go 项目文件改动后的即时检测与服务重启，显著提升开发效率。