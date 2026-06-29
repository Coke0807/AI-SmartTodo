import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Card, Tooltip } from 'antd';
import { Send, X, Bot, Sparkles } from 'lucide-react';
import { aiApi } from '../services/ai';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export const AiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: '您好！我是 SmartTodo AI 智能管家。需要我帮您拆解复杂任务，还是解答您的疑问呢？',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>(messages);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Keep messagesRef in sync for closure access in async handlers
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleSendMessage = () => {
    const textToSend = inputValue.trim();
    if (!textToSend) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    // Build chat history for context
    const chatHistory = messages
      .filter(msg => msg.id !== 'welcome')
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.text
      }));

    // Why: Use SSE streaming for real-time token-by-token display.
    const aiMsgId = Math.random().toString();
    const aiMsg: Message = {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMsg]);

    const consumeStream = async () => {
      try {
        for await (const token of aiApi.chatStream(textToSend, chatHistory)) {
          setMessages((prev) =>
            prev.map(msg =>
              msg.id === aiMsgId
                ? { ...msg, text: msg.text + token }
                : msg
            )
          );
        }
      } catch (err) {
        // Why: If streaming fails, fall back to non-streaming chat.
        // Only replace text if no tokens were streamed yet (empty text),
        // otherwise the partial stream content is already displayed.
        console.warn('[Chat] Streaming failed, falling back to standard chat:', err);
        try {
          const currentText = messagesRef.current.find(m => m.id === aiMsgId)?.text || '';
          if (!currentText) {
            const reply = await aiApi.chat(textToSend, chatHistory);
            setMessages((prev) =>
              prev.map(msg =>
                msg.id === aiMsgId
                  ? { ...msg, text: reply }
                  : msg
              )
            );
          } else {
            // Partial content already displayed — append error notice
            setMessages((prev) =>
              prev.map(msg =>
                msg.id === aiMsgId
                  ? { ...msg, text: msg.text + '\n\n[流式中断，已接收部分内容]' }
                  : msg
              )
            );
          }
        } catch (fallbackErr) {
          setMessages((prev) =>
            prev.map(msg =>
              msg.id === aiMsgId
                ? { ...msg, text: `获取 AI 响应失败: ${fallbackErr instanceof Error ? fallbackErr.message : '未知错误'}` }
                : msg
            )
          );
        }
      } finally {
        setLoading(false);
      }
    };

    consumeStream();
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <Tooltip title="AI 助手" placement="left">
          <div
            onClick={() => setIsOpen(true)}
            style={{
              position: 'fixed',
              bottom: '32px',
              right: '32px',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)',
              zIndex: 1000,
              transition: 'var(--transition-smooth)',
            }}
          >
            <Bot size={28} color="#fff" />
          </div>
        </Tooltip>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <Card
          className="glass-panel"
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            width: '380px',
            height: '520px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
            padding: 0,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }}
          styles={{
            body: {
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              padding: '16px',
              background: 'var(--bg-surface-hover)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'between',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <div style={{ background: 'var(--primary)', borderRadius: '50%', padding: '6px', display: 'flex' }}>
                <Bot size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  SmartTodo Copilot
                  <Sparkles size={12} style={{ color: 'var(--secondary)' }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>混合推理机制已启用</div>
              </div>
            </div>
            <Button
              type="text"
              icon={<X size={16} style={{ color: 'var(--text-secondary)' }} />}
              onClick={() => setIsOpen(false)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                    background: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-surface-hover)',
                    color: msg.sender === 'user' ? '#fff' : 'var(--text-primary)',
                    border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                    fontSize: '13.5px',
                    lineHeight: '1.45',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.text}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px', padding: '8px' }}>
                <Sparkles size={14} className="spinning-ai-icon" style={{ animation: 'float 2s infinite' }} />
                <span>AI 正在思考中...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Panel */}
          <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Input
                placeholder="在此输入问题，按 Enter 发送..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPressEnter={handleSendMessage}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  flex: 1,
                }}
              />
              <Button
                type="primary"
                icon={<Send size={14} />}
                onClick={handleSendMessage}
                style={{
                  height: '38px',
                  width: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </div>
          </div>
        </Card>
      )}
    </>
  );
};
