import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Progress, Checkbox, Tag, Button, Input, Select, App } from 'antd';
import { CheckCircle2, Circle, Clock, Sparkles, Plus, Trash2, Split, Zap, BarChart3 } from 'lucide-react';
import type { TodoItem, TaskPriority } from '../types/config';
import { todoApi } from '../services/todo';

interface TodoStats {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
  p0Count: number;
  p1Count: number;
  p2Count: number;
  totalSubTasks: number;
  completedSubTasks: number;
  aiGenerated: number;
}

export const Dashboard: React.FC = () => {
  const { message } = App.useApp();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [stats, setStats] = useState<TodoStats | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('P1');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Why: Fetch aggregated stats from backend for dashboard analytics.
  const loadStats = useCallback(() => {
    todoApi.getStats().then(setStats).catch(() => {});
  }, []);

  // Why: Load todos from real Go backend API when mounting.
  useEffect(() => {
    Promise.all([
      todoApi.getTodos().then(data => setTodos(data)),
      todoApi.getStats().then(data => setStats(data)),
    ])
      .catch(err => {
        message.error(err.message || '加载数据失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Why: Toggle main task completion status on the backend.
  const handleToggleTodo = (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    todoApi.updateTodo(id, { completed: !todo.completed })
      .then(updated => {
        setTodos(todos.map(t => t.id === id ? updated : t));
        loadStats();
      })
      .catch(err => {
        message.error('操作失败: ' + err.message);
      });
  };

  // Why: Update completion state of a specific subtask within a Todo via PUT request.
  const handleToggleSubTask = (todoId: string, subTaskId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || !todo.subTasks) return;

    const updatedSubTasks = todo.subTasks.map(st => 
      st.id === subTaskId ? { ...st, completed: !st.completed } : st
    );

    todoApi.updateTodo(todoId, { subTasks: updatedSubTasks })
      .then(updated => {
        setTodos(todos.map(t => t.id === todoId ? updated : t));
        loadStats();
      })
      .catch(err => {
        message.error('操作失败: ' + err.message);
      });
  };

  // Why: Delete the Todo item from database.
  const handleDeleteTodo = (id: string) => {
    todoApi.deleteTodo(id)
      .then(() => {
        setTodos(todos.filter(t => t.id !== id));
        message.success('任务删除成功');
        loadStats();
      })
      .catch(err => {
        message.error('删除任务失败: ' + err.message);
      });
  };

  // Why: Send POST request to create a regular user Todo.
  const handleAddTodo = () => {
    if (!newTitle.trim()) {
      message.warning('请输入任务标题');
      return;
    }

    todoApi.createTodo({
      title: newTitle,
      description: newDesc,
      completed: false,
      priority: newPriority,
    })
      .then(created => {
        setTodos([created, ...todos]);
        setNewTitle('');
        setNewDesc('');
        message.success('任务已成功创建');
        loadStats();
      })
      .catch(err => {
        message.error('创建任务失败: ' + err.message);
      });
  };

  // Why: Request AI to split subtasks, predict estimated duration, and save results to DB.
  const handleAiOptimize = () => {
    if (!newTitle.trim()) {
      message.warning('请先输入任务标题以供 AI 优化与拆解');
      return;
    }

    setIsAiProcessing(true);
    todoApi.aiSplit(newTitle, newDesc)
      .then(aiResult => {
        // Send POST request to persist the newly split Todo with its subtasks
        return todoApi.createTodo({
          title: aiResult.title,
          description: aiResult.description,
          completed: false,
          priority: aiResult.priority,
          estimatedTime: aiResult.estimatedTime,
          aiGenerated: true,
          subTasks: aiResult.subTasks.map(st => ({
            id: '',
            title: st.title,
            completed: st.completed
          }))
        });
      })
      .then(created => {
        setTodos([created, ...todos]);
        setNewTitle('');
        setNewDesc('');
        message.success('AI 智能拆解并预测耗时成功！');
        loadStats();
      })
      .catch(err => {
        message.error('AI 优化失败: ' + err.message);
      })
      .finally(() => {
        setIsAiProcessing(false);
      });
  };

  // Stats from backend or computed from todos
  const totalTasks = todos.length;
  const completedTasks = todos.filter(t => t.completed).length;
  const completionRate = stats?.completionRate ?? (totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0);
  const p0Count = todos.filter(t => t.priority === 'P0' && !t.completed).length;
  const aiRate = stats && stats.total > 0 ? Math.round((stats.aiGenerated / stats.total) * 100) : 0;
  const subTaskRate = stats && stats.totalSubTasks > 0 ? Math.round((stats.completedSubTasks / stats.totalSubTasks) * 100) : 0;

  // Priority distribution for the donut chart
  const p0Total = stats?.p0Count ?? todos.filter(t => t.priority === 'P0').length;
  const p1Total = stats?.p1Count ?? todos.filter(t => t.priority === 'P1').length;
  const p2Total = stats?.p2Count ?? todos.filter(t => t.priority === 'P2').length;
  const totalForChart = p0Total + p1Total + p2Total || 1;
  const p0Pct = (p0Total / totalForChart) * 100;
  const p1Pct = (p1Total / totalForChart) * 100;

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'P0': return 'var(--error)';
      case 'P1': return 'var(--warning)';
      case 'P2': return 'var(--secondary)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Top Banner */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '8px', color: 'var(--text-primary)' }}>
          智能待办看板 <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '14px', marginLeft: '4px' }}>SmartTodo AI</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
          通过 Ollama 与云端混合大模型，提供自动化任务拆解、优先级研判及耗时预估。
        </p>
      </div>

      {/* Analytics Cards */}
      <Row gutter={[20, 20]} style={{ marginBottom: '32px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-panel" styles={{ body: { padding: '20px' } }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>未完成任务</div>
            <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginTop: '8px' }}>
              {totalTasks - completedTasks} <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)' }}>/ {totalTasks}</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-panel" styles={{ body: { padding: '20px' } }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>P0 级紧急待办</div>
            <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'var(--font-display)', color: p0Count > 0 ? 'var(--error)' : 'var(--text-primary)', marginTop: '8px' }}>
              {p0Count} <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)' }}>项紧急</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-panel" styles={{ body: { padding: '20px' } }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>完成率进度</div>
            <div style={{ marginTop: '16px' }}>
              <Progress 
                percent={completionRate} 
                strokeColor={{ '0%': '#8b5cf6', '100%': '#06b6d4' }} 
                railColor="rgba(255, 255, 255, 0.05)" 
                status="active"
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-panel" styles={{ body: { padding: '20px' } }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>AI 赋能率</div>
            <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--secondary)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {aiRate}%
              <Sparkles size={20} style={{ color: 'var(--secondary)', animation: 'float 3s infinite' }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {stats?.aiGenerated ?? 0} 个任务由 AI 拆解生成
            </div>
          </Card>
        </Col>
      </Row>

      {/* Secondary Analytics: Priority Distribution + Subtask Completion */}
      <Row gutter={[20, 20]} style={{ marginBottom: '32px' }}>
        <Col xs={24} md={12}>
          <Card className="glass-panel" styles={{ body: { padding: '20px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BarChart3 size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>优先级分布</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              {/* CSS Donut Chart */}
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: totalForChart > 1
                  ? `conic-gradient(#ef4444 0% ${p0Pct}%, #f59e0b ${p0Pct}% ${p0Pct + p1Pct}%, #06b6d4 ${p0Pct + p1Pct}% 100%)`
                  : 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}>
                  {totalTasks}
                </div>
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>P0 紧急</span>
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>{p0Total}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>P1 常规</span>
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>{p1Total}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>P2 待安排</span>
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>{p2Total}</span>
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="glass-panel" styles={{ body: { padding: '20px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Zap size={16} style={{ color: 'var(--warning)' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>AI 子任务完成率</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>子任务进度</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>
                    {stats?.completedSubTasks ?? 0} / {stats?.totalSubTasks ?? 0}
                  </span>
                </div>
                <Progress
                  percent={subTaskRate}
                  strokeColor={{ '0%': '#f59e0b', '100%': '#10b981' }}
                  railColor="rgba(255, 255, 255, 0.05)"
                  status="active"
                />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                padding: '12px 0',
                borderTop: '1px solid var(--border-color)',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                    {stats?.aiGenerated ?? 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>AI 拆解任务数</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border-color)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--secondary)', fontFamily: 'var(--font-display)' }}>
                    {stats?.totalSubTasks ?? 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>总子任务数</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border-color)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-display)' }}>
                    {subTaskRate}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>完成率</div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Left Column: Create Task Panel */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>
                <Plus size={18} />
                <span>新建待办事项</span>
              </div>
            }
            className="glass-panel"
            style={{ position: 'sticky', top: '24px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>任务标题</label>
                <Input 
                  placeholder="例如：准备项目开题答辩" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>详情描述</label>
                <Input.TextArea 
                  placeholder="请输入具体任务描述..." 
                  value={newDesc} 
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>初始优先级</label>
                <Select
                  value={newPriority}
                  onChange={(v) => setNewPriority(v)}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'P0', label: <span style={{ color: 'var(--error)' }}>P0 (最高紧急)</span> },
                    { value: 'P1', label: <span style={{ color: 'var(--warning)' }}>P1 (常规处理)</span> },
                    { value: 'P2', label: <span style={{ color: 'var(--secondary)' }}>P2 (待安排)</span> },
                  ]}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <Button 
                  type="default" 
                  style={{ flex: 1 }}
                  onClick={handleAddTodo}
                >
                  创建普通任务
                </Button>
                <Button 
                  type="primary" 
                  style={{ flex: 1.2 }}
                  onClick={handleAiOptimize}
                  loading={isAiProcessing}
                  icon={<Sparkles size={14} />}
                >
                  AI 智能拆解
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        {/* Right Column: Todo list view */}
        <Col xs={24} lg={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <Card className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>正在拉取待办事项...</p>
              </Card>
            ) : todos.map(todo => (
              <Card 
                key={todo.id}
                className="glass-panel"
                style={{
                  borderLeft: `4px solid ${getPriorityColor(todo.priority)}`,
                  opacity: todo.completed ? 0.7 : 1,
                  transition: 'var(--transition-smooth)'
                }}
                styles={{ body: { padding: '20px' } }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {/* Status Checkbox */}
                  <div 
                    onClick={() => handleToggleTodo(todo.id)}
                    style={{ cursor: 'pointer', marginTop: '4px', color: todo.completed ? 'var(--primary)' : 'var(--text-muted)' }}
                  >
                    {todo.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                  </div>

                  {/* Todo Main Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: 600, 
                        color: 'var(--text-primary)', 
                        textDecoration: todo.completed ? 'line-through' : 'none',
                        margin: 0
                      }}>
                        {todo.title}
                      </h3>
                      <Tag color={todo.priority === 'P0' ? 'error' : todo.priority === 'P1' ? 'warning' : 'processing'}>
                        {todo.priority}
                      </Tag>
                      {todo.estimatedTime && (
                        <span style={{ fontSize: '12px', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {todo.estimatedTime}
                        </span>
                      )}
                    </div>

                    {todo.description && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
                        {todo.description}
                      </p>
                    )}

                    {/* Subtasks block */}
                    {todo.subTasks && todo.subTasks.length > 0 && (
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '12px 16px', 
                      background: 'var(--bg-input)', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-color)' 
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Split size={14} style={{ color: 'var(--primary)' }} />
                          AI 智能拆解子任务
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {todo.subTasks.map(sub => (
                            <Checkbox 
                              key={sub.id}
                              checked={sub.completed}
                              onChange={() => handleToggleSubTask(todo.id, sub.id)}
                              style={{ color: sub.completed ? 'var(--text-muted)' : 'var(--text-secondary)' }}
                            >
                              <span style={{ textDecoration: sub.completed ? 'line-through' : 'none' }}>
                                {sub.title}
                              </span>
                            </Checkbox>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '12px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        创建时间：{todo.createdAt} | 截止时间：{todo.dueDate || '无'}
                      </span>
                      <Button
                        type="text"
                        danger
                        icon={<Trash2 size={14} />}
                        onClick={() => handleDeleteTodo(todo.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {!loading && todos.length === 0 && (
              <Card className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>暂无待办事项，请在左侧创建一个任务或使用 AI 智能拆解</p>
              </Card>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
};
