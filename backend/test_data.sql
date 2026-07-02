-- SmartTodo 测试数据生成脚本
-- 使用方法: 在 Navicat 中打开此文件并执行，或复制 SQL 语句手动执行

-- =============================================
-- 1. 用户数据 (users 表)
-- =============================================
-- 注意: password_hash 是 bcrypt 加密的 "password123"
-- ai_config_json 存储用户偏好的 AI 配置

INSERT INTO users (username, email, password_hash, ai_config_json, created_at, updated_at) VALUES
('张三', 'zhangsan@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye', '{"provider":"ollama","model":"qwen2.5:7b","mode":"local"}', NOW(), NOW()),
('李四', 'lisi@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye', '{"provider":"openai","model":"gpt-4o-mini","mode":"cloud"}', NOW(), NOW()),
('王五', 'wangwu@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye', '{"provider":"deepseek","model":"deepseek-chat","mode":"hybrid"}', NOW(), NOW()),
('赵六', 'zhaoliu@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye', '{"provider":"ollama","model":"llama3:8b","mode":"local"}', NOW(), NOW()),
('测试用户', 'test@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye', '', NOW(), NOW());

-- =============================================
-- 2. 任务数据 (todos 表)
-- =============================================
-- 为用户1 (ccc) 添加各种优先级和状态的任务

INSERT INTO todos (user_id, title, description, completed, priority, estimated_time, due_date, ai_generated, created_at, updated_at) VALUES
-- 用户1 (ccc) 的任务
(1, '完成项目需求分析', '分析 SmartTodo 项目的功能需求，包括用户认证、任务管理、AI 集成等模块', false, 'P0', '4小时', '2026-07-05', false, NOW(), NOW()),
(1, '设计数据库架构', '设计 PostgreSQL 数据库表结构，包括用户表、任务表、子任务表', true, 'P1', '2小时', '2026-07-01', true, NOW(), NOW()),
(1, '实现用户认证模块', '使用 JWT 实现用户登录、注册、token 刷新功能', false, 'P0', '6小时', '2026-07-10', false, NOW(), NOW()),
(1, '开发前端界面', '使用 React + Ant Design 开发响应式前端界面', false, 'P1', '8小时', '2026-07-15', false, NOW(), NOW()),
(1, '集成 AI 服务', '将 Python AI 服务通过 gRPC 集成到 Go 后端', false, 'P2', '5小时', '2026-07-20', true, NOW(), NOW()),
(1, '编写单元测试', '为后端 API 编写单元测试和集成测试', false, 'P2', '3小时', '2026-07-25', false, NOW(), NOW()),
(1, '部署到生产环境', '使用 Docker Compose 部署整个应用到服务器', false, 'P1', '2小时', '2026-07-30', false, NOW(), NOW()),

-- 用户2 (test) 的任务
(2, '学习 TypeScript', '学习 TypeScript 基础语法和高级特性', false, 'P1', '10小时', '2026-07-12', false, NOW(), NOW()),
(2, '练习 React Hooks', '深入理解 useState, useEffect, useCallback 等 Hooks', true, 'P2', '4小时', '2026-07-08', true, NOW(), NOW()),
(2, '阅读 Go 官方文档', '学习 Go 语言并发编程和标准库使用', false, 'P0', '6小时', '2026-07-18', false, NOW(), NOW());

-- =============================================
-- 3. 子任务数据 (sub_tasks 表)
-- =============================================
-- 为任务添加具体的子任务步骤

INSERT INTO sub_tasks (todo_id, title, completed, created_at, updated_at) VALUES
-- 任务1: 完成项目需求分析
(1, '收集用户需求', true, NOW(), NOW()),
(1, '编写需求文档', false, NOW(), NOW()),
(1, '需求评审会议', false, NOW(), NOW()),

-- 任务3: 实现用户认证模块
(3, '设计 JWT 认证流程', true, NOW(), NOW()),
(3, '实现登录接口', false, NOW(), NOW()),
(3, '实现注册接口', false, NOW(), NOW()),
(3, '添加 token 刷新机制', false, NOW(), NOW()),

-- 任务4: 开发前端界面
(4, '搭建 React 项目结构', true, NOW(), NOW()),
(4, '实现登录页面', true, NOW(), NOW()),
(4, '实现仪表盘页面', false, NOW(), NOW()),
(4, '实现任务管理页面', false, NOW(), NOW()),
(4, '实现知识库页面', false, NOW(), NOW()),

-- 任务8: 学习 TypeScript
(8, '安装 TypeScript 环境', true, NOW(), NOW()),
(8, '学习基础类型系统', true, NOW(), NOW()),
(8, '学习接口和类型别名', false, NOW(), NOW()),
(8, '学习泛型编程', false, NOW(), NOW());

-- =============================================
-- 验证数据插入结果
-- =============================================
SELECT 'Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Todos:', COUNT(*) FROM todos
UNION ALL
SELECT 'SubTasks:', COUNT(*) FROM sub_tasks;

-- 显示任务统计
SELECT 
    u.username,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.priority = 'P0' THEN 1 END) as p0_tasks,
    COUNT(CASE WHEN t.priority = 'P1' THEN 1 END) as p1_tasks,
    COUNT(CASE WHEN t.priority = 'P2' THEN 1 END) as p2_tasks
FROM users u
LEFT JOIN todos t ON u.id = t.user_id
GROUP BY u.id, u.username
ORDER BY u.id;