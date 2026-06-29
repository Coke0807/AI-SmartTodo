import React from 'react';
import { Button } from 'antd';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Why: Catch unhandled React rendering errors (e.g. from AI response parsing failures)
// and display a recovery UI instead of a blank white screen.
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-base)',
          padding: '32px',
          textAlign: 'center',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '48px',
            maxWidth: '480px',
            width: '100%',
          }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '12px',
            }}>
              页面渲染异常
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '14px',
              marginBottom: '24px',
              lineHeight: '1.6',
            }}>
              应用遇到了意外错误，可能是 AI 响应数据格式异常或网络波动导致。
            </p>
            <pre style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--error)',
              textAlign: 'left',
              overflow: 'auto',
              maxHeight: '120px',
              marginBottom: '24px',
            }}>
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <Button type="primary" onClick={this.handleReset} style={{ marginRight: '12px' }}>
              重试当前页面
            </Button>
            <Button onClick={() => window.location.reload()}>
              刷新整个应用
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
