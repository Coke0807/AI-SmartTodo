import React, { useState } from 'react';
import { Card, Form, Input, Button, Tabs, App } from 'antd';
import { Lock, User, ShieldCheck, Sun, Moon } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onRegister, theme, onToggleTheme }) => {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);

  const handleLogin = (values: any) => {
    setLoading(true);
    // Why: Request login from useAuth handler and handle errors gracefully.
    onLoginSuccess(values.username, values.password)
      .then(() => {
        message.success('登录成功，欢迎回来！');
      })
      .catch((err: any) => {
        message.error(err.message || '登录失败，请检查用户名或密码');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleRegister = (values: any) => {
    setLoading(true);
    // Why: Request registration from useAuth handler and route user back to login page on success.
    onRegister(values.username, values.password)
      .then(() => {
        setActiveTab('login');
        message.success('注册成功，请使用新账号登录！');
      })
      .catch((err: any) => {
        message.error(err.message || '注册失败，用户名可能已存在');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
      padding: '20px',
      background: 'var(--bg-base)',
      position: 'relative',
    }}>
      {/* Theme toggle in top-right corner */}
      {onToggleTheme && (
        <button
          className="theme-switch"
          onClick={onToggleTheme}
          style={{ position: 'absolute', top: '24px', right: '24px' }}
          aria-label={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      )}

      <Card
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          padding: '8px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            padding: '12px',
            background: 'var(--primary)',
            borderRadius: '12px',
            marginBottom: '16px',
          }}>
            <ShieldCheck size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: '6px' }}>
            SmartTodo AI
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
            混合大模型驱动的智能待办事项管理系统
          </p>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'login' | 'register')}
          centered
          items={[
            {
              key: 'login',
              label: <span style={{ color: activeTab === 'login' ? 'var(--primary)' : 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>账号登录</span>,
              children: (
                <Form layout="vertical" onFinish={handleLogin} style={{ marginTop: '16px' }}>
                  <Form.Item
                    name="username"
                    rules={[{ required: true, min: 3, message: '用户名至少需要 3 个字符' }]}
                  >
                    <Input
                      prefix={<User size={16} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />}
                      placeholder="用户名 (e.g. admin)"
                      style={{ height: '42px' }}
                    />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: '请输入密码' }]}
                  >
                    <Input.Password
                      prefix={<Lock size={16} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />}
                      placeholder="输入登录密码"
                      style={{ height: '42px' }}
                    />
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    style={{ width: '100%', height: '42px', marginTop: '8px' }}
                  >
                    登录
                  </Button>
                </Form>
              )
            },
            {
              key: 'register',
              label: <span style={{ color: activeTab === 'register' ? 'var(--primary)' : 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>快速注册</span>,
              children: (
                <Form layout="vertical" onFinish={handleRegister} style={{ marginTop: '16px' }}>
                  <Form.Item
                    name="username"
                    rules={[{ required: true, min: 3, message: '用户名至少需要 3 个字符' }]}
                  >
                    <Input
                      prefix={<User size={16} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />}
                      placeholder="设置用户名 (至少 3 位)"
                      style={{ height: '42px' }}
                    />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[{ required: true, min: 6, message: '密码不能少于 6 位数' }]}
                  >
                    <Input.Password
                      prefix={<Lock size={16} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />}
                      placeholder="设置登录密码 (至少 6 位)"
                      style={{ height: '42px' }}
                    />
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    style={{ width: '100%', height: '42px', marginTop: '8px' }}
                  >
                    注册新账号
                  </Button>
                </Form>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};
