import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Input, Button, Upload, App, Tooltip } from 'antd';
import { UploadCloud, FileText, Trash2, Send, Sparkles, BookOpen, HelpCircle } from 'lucide-react';
import { aiApi } from '../services/ai';

export const KnowledgeBase: React.FC = () => {
  const { message } = App.useApp();
  const [files, setFiles] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [uploading, setUploading] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);

  // Load uploaded files list on mount
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = () => {
    setLoadingFiles(true);
    aiApi.getFiles()
      .then(setFiles)
      .catch((err) => {
        message.error(err.message || '获取知识库文件列表失败');
      })
      .finally(() => {
        setLoadingFiles(false);
      });
  };

  const handleUpload = (file: File) => {
    const isTextOrMd = file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.markdown');
    if (!isTextOrMd) {
      message.error('只能上传 TXT 或 MD 格式的笔记文件！');
      return false;
    }

    setUploading(true);
    aiApi.uploadFile(file)
      .then(() => {
        message.success(`文件 ${file.name} 上传成功，已解析并加入本地知识库！`);
        loadFiles();
      })
      .catch((err) => {
        message.error(`文件上传失败: ${err.message}`);
      })
      .finally(() => {
        setUploading(false);
      });

    return false; // Prevent automatic upload by Ant Design
  };

  const handleDeleteFile = (filename: string) => {
    aiApi.deleteFile(filename)
      .then(() => {
        message.success('文件已从知识库中移除');
        loadFiles();
      })
      .catch((err) => {
        message.error(`删除文件失败: ${err.message}`);
      });
  };

  const handleQuery = () => {
    if (!query.trim()) {
      message.warning('请输入您想向知识库提问的问题');
      return;
    }

    setQuerying(true);
    setAnswer('');
    aiApi.ragQuery(query)
      .then((res) => {
        setAnswer(res);
      })
      .catch((err) => {
        message.error(`查询失败: ${err.message}`);
      })
      .finally(() => {
        setQuerying(false);
      });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '8px', color: 'var(--text-primary)' }}>
          RAG 智能知识库 <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '14px', marginLeft: '4px' }}>SmartTodo RAG</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
          上传您的学习笔记、工作文档（支持 TXT 和 Markdown 格式），由本地轻量级大模型（Ollama）基于您的笔记内容进行智能检索与精准问答。
        </p>
      </div>

      <Row gutter={[24, 24]}>
        {/* Left Column: File Upload & Management */}
        <Col xs={24} lg={9}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Upload Box */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  <UploadCloud size={18} style={{ color: 'var(--primary)' }} />
                  <span>上传知识库文档</span>
                </div>
              }
              className="glass-panel"
            >
              <Upload.Dragger
                accept=".txt,.md,.markdown"
                beforeUpload={handleUpload}
                showUploadList={false}
                disabled={uploading}
                style={{
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '24px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <BookOpen size={36} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, display: 'block', fontSize: '14px' }}>
                      点击或拖拽文件到此区域上传
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      支持 .txt, .md, .markdown 格式，文件大小不超过 5MB
                    </span>
                  </div>
                </div>
              </Upload.Dragger>
            </Card>

            {/* Document List */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  <FileText size={18} style={{ color: 'var(--secondary)' }} />
                  <span>已载入文档 ({files.length})</span>
                </div>
              }
              className="glass-panel"
              styles={{ body: { padding: '12px 20px' } }}
            >
              {loadingFiles ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>加载文件列表中...</div>
              ) : files.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>暂无已载入的笔记文档，请在上方上传</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {files.map((item) => (
                    <div
                      key={item}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        padding: '12px 0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} style={{ color: 'var(--text-secondary)', marginTop: '2px' }} />
                        <span style={{ color: 'var(--text-primary)', fontSize: '13.5px', fontWeight: 500 }}>{item}</span>
                      </div>
                      <Tooltip title="移除此文档">
                        <Button
                          type="text"
                          danger
                          icon={<Trash2 size={14} />}
                          onClick={() => handleDeleteFile(item)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        />
                      </Tooltip>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </Col>

        {/* Right Column: Q&A Interface */}
        <Col xs={24} lg={15}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>
                <Sparkles size={18} style={{ color: 'var(--success)' }} />
                <span>知识库智能问答</span>
              </div>
            }
            className="glass-panel"
            styles={{ body: { padding: '24px' } }}
            style={{ minHeight: '480px', display: 'flex', flexDirection: 'column' }}
          >
            {/* Query Input */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <Input
                placeholder="例如：根据我的笔记，待办事项系统的双模推理模式是如何自动降级切换的？"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onPressEnter={handleQuery}
                disabled={querying}
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: '8px',
                  height: '42px',
                }}
              />
              <Button
                type="primary"
                icon={<Send size={14} />}
                onClick={handleQuery}
                loading={querying}
                style={{
                  background: 'var(--primary)',
                  height: '42px',
                  padding: '0 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                提问
              </Button>
            </div>

            {/* Answer Display */}
            <div
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '20px',
                minHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {/* Local model badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  fontSize: '11px',
                  color: 'var(--secondary)',
                  background: 'var(--secondary-light)',
                  border: '1px solid var(--border-color)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sparkles size={10} />
                本地 Ollama 推理
              </div>

              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                <HelpCircle size={14} />
                AI 回答内容：
              </div>

              {querying ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', color: 'var(--text-muted)' }}>
                  <Sparkles size={24} className="spinning-ai-icon" style={{ color: 'var(--secondary)' }} />
                  <span>本地模型正在深度分析笔记内容并整理回答...</span>
                </div>
              ) : answer ? (
                <div
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '14.5px',
                    lineHeight: '1.65',
                    whiteSpace: 'pre-wrap',
                    flex: 1,
                  }}
                >
                  {answer}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: '13.5px' }}>
                  在上方输入关于您笔记的问题，AI 将自动从载入的笔记中提取线索并生成精准回答。
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
