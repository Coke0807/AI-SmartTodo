import { useState, useEffect, useCallback, useRef } from 'react';
import { ConfigProvider, Layout, Menu, Button, Avatar, theme as antTheme, App as AntApp } from 'antd';
import { 
  CheckSquare, 
  Settings, 
  LogOut, 
  User as UserIcon, 
  PanelLeftClose, 
  PanelLeftOpen,
  Sparkles,
  Bot,
  BookOpen,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { authApi } from './services/auth';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { Profile } from './pages/Profile';
import { ModelConfigModal } from './components/ModelConfigModal';
import { AiAssistant } from './components/AiAssistant';
import type { AiConfig } from './types/config';
import './App.css';

const { Header, Content, Sider } = Layout;

// Why: Persist theme preference in localStorage; default to 'light' per user requirement.
type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  const saved = localStorage.getItem('smarttodo_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return 'light';
}

function App() {
  const { isAuthenticated, login, register, logout, loading, user, setUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [currentMenu, setCurrentMenu] = useState('dashboard');
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  // Why: Sync theme to <html data-theme="..."> and persist choice.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('smarttodo_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);
  
  const defaultAiConfig: AiConfig = {
    mode: 'hybrid',
    localEndpoint: 'http://localhost:11434',
    cloudEndpoint: 'https://api.deepseek.com/v1',
    apiKey: '',
    modelLocal: 'qwen2.5:7b',
    modelCloud: 'deepseek-chat',
  };

  // Why: Initialize from localStorage as instant cache for first paint,
  // then sync from backend once user is authenticated.
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => {
    const saved = localStorage.getItem('smarttodo_ai_config');
    return saved ? JSON.parse(saved) : defaultAiConfig;
  });

  // Why: Ref flag to prevent the initial backend load from triggering a redundant save-back.
  const isLoadingFromBackend = useRef(false);

  // Why: When user becomes authenticated, load AI config from backend database.
  // Backend config is the source of truth; localStorage is a fast cache.
  useEffect(() => {
    if (!isAuthenticated) return;
    isLoadingFromBackend.current = true;
    authApi.getAiConfig()
      .then(json => {
        if (json && json !== '{}') {
          const serverConfig = JSON.parse(json) as AiConfig;
          setAiConfig(serverConfig);
          localStorage.setItem('smarttodo_ai_config', json);
        }
      })
      .catch(() => {
        // Backend unavailable -- keep using localStorage cache
      })
      .finally(() => {
        // Why: Delay resetting the flag so the subsequent handleSaveConfig call
        // triggered by ModelConfigModal's onValuesChange does NOT get swallowed.
        setTimeout(() => { isLoadingFromBackend.current = false; }, 500);
      });
  }, [isAuthenticated]);

  // Why: Save to both localStorage (instant) and backend database (persistent).
  const handleSaveConfig = useCallback((newConfig: AiConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('smarttodo_ai_config', JSON.stringify(newConfig));
    // Fire-and-forget: persist to backend; no need to block UI
    if (isAuthenticated) {
      authApi.updateAiConfig(JSON.stringify(newConfig)).catch(() => {});
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-base)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>加载应用中...</div>
      </div>
    );
  }

  // Why: Ant Design 6 uses CSS-in-JS with high specificity; ConfigProvider is the
  // correct way to switch its internal color algorithm between light and dark.
  const antdThemeConfig = {
    algorithm: theme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#2563EB',
      borderRadius: 8,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', sans-serif",
      colorBgContainer: theme === 'dark' ? '#1A1D27' : '#FFFFFF',
      colorBgLayout: theme === 'dark' ? '#0F1117' : '#F7F8FC',
      colorBorder: theme === 'dark' ? '#2A2F3E' : '#F0F0F0',
      colorText: theme === 'dark' ? '#F1F5F9' : '#111827',
      colorTextSecondary: theme === 'dark' ? '#94A3B8' : '#6B7280',
    },
  };

  if (!isAuthenticated) {
    return (
      <ConfigProvider theme={antdThemeConfig}>
        <AntApp>
          <Login onLoginSuccess={login} onRegister={register} theme={theme} onToggleTheme={toggleTheme} />
        </AntApp>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={antdThemeConfig}>
      <AntApp>
        <Layout style={{ minHeight: '100vh' }}>
      {/* Sider Navigation */}
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        trigger={null}
        width={240}
        style={{
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
        }}
      >
        <div style={{ 
          padding: '24px 16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          borderBottom: '1px solid var(--border-color)',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            background: 'var(--primary)',
            borderRadius: '10px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Bot size={20} color="#fff" />
          </div>
          {!collapsed && (
            <span style={{ 
              fontWeight: 700, 
              fontSize: '17px', 
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
            }}>
              SmartTodo <span style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 600 }}>AI</span>
            </span>
          )}
        </div>

        {/* Sidebar Menu */}
        <Menu
          mode="inline"
          selectedKeys={[currentMenu]}
          onClick={({ key }) => {
            if (key === 'config') {
              setConfigOpen(true);
            } else {
              setCurrentMenu(key);
            }
          }}
          items={[
            {
              key: 'dashboard',
              icon: <CheckSquare size={16} />,
              label: '待办任务看板',
            },
            {
              key: 'knowledge',
              icon: <BookOpen size={16} />,
              label: 'RAG 智能知识库',
            },
            {
              key: 'profile',
              icon: <UserIcon size={16} />,
              label: '个人资料设置',
            },
            {
              key: 'config',
              icon: <Settings size={16} />,
              label: 'AI 混合推理配置',
            },
          ]}
          style={{ marginTop: '16px' }}
        />

        {/* Sidebar User Footer */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          padding: '16px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Avatar 
              style={{ background: 'var(--primary-light)' }} 
              icon={<UserIcon size={14} style={{ color: 'var(--primary)' }} />} 
            />
            {!collapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{user?.username || 'Student'}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>实训开发版</span>
              </div>
            )}
          </div>
          <Button
            type="text"
            icon={<LogOut size={15} style={{ color: 'var(--error)' }} />}
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
          />
        </div>
      </Sider>

      {/* Main Content Area */}
      <Layout>
        <Header style={{ 
          padding: 0, 
          background: 'transparent', 
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '24px',
          height: '64px'
        }}>
          <Button
            type="text"
            icon={collapsed ? <PanelLeftOpen size={18} style={{ color: 'var(--text-primary)' }} /> : <PanelLeftClose size={18} style={{ color: 'var(--text-primary)' }} />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
          <div style={{ marginLeft: 'auto', marginRight: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              fontSize: '12px', 
              color: 'var(--secondary)', 
              background: 'var(--secondary-light)', 
              padding: '4px 10px', 
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500,
            }}>
              <Sparkles size={12} />
              推理引擎: {aiConfig.mode === 'hybrid' ? '混合动力' : aiConfig.mode === 'local' ? '本地 (Ollama)' : '云端 API'}
            </span>
            <button
              className="theme-switch"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
              title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </Header>

        <Content style={{ margin: 0, overflowY: 'auto' }}>
          {currentMenu === 'dashboard' && <Dashboard />}
          {currentMenu === 'knowledge' && <KnowledgeBase />}
          {currentMenu === 'profile' && <Profile user={user} onUserUpdate={(u) => setUser(u)} />}
        </Content>
      </Layout>

      {/* Global Modals & AI Floating Assistant */}
      <ModelConfigModal
        open={configOpen}
        onCancel={() => setConfigOpen(false)}
        config={aiConfig}
        onSave={handleSaveConfig}
      />
      <AiAssistant />
    </Layout>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
