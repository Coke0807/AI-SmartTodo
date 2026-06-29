import React, { useEffect, useRef } from 'react';
import { Modal, Form, Input, Radio, Space, Divider } from 'antd';
import type { AiConfig } from '../types/config';
import { Cpu, Cloud, GitMerge } from 'lucide-react';

interface ModelConfigModalProps {
  open: boolean;
  onCancel: () => void;
  config: AiConfig;
  onSave: (config: AiConfig) => void;
}

export const ModelConfigModal: React.FC<ModelConfigModalProps> = ({
  open,
  onCancel,
  config,
  onSave,
}) => {
  const [form] = Form.useForm<AiConfig>();
  // Why: Track whether the form has been initialized for this modal open cycle
  // to avoid auto-saving the reset values before the user makes any change.
  const isDirtyRef = useRef(false);

  // Why: Reset form fields to current config whenever the modal opens,
  // so stale edits from a previous cancelled session are discarded.
  useEffect(() => {
    if (open) {
      form.setFieldsValue(config);
      isDirtyRef.current = false;
    }
  }, [open, config, form]);

  // Why: Auto-save config to localStorage whenever form values change,
  // so the user never loses their configuration even if they close the dialog
  // without clicking the save button.
  const handleValuesChange = (_changed: Partial<AiConfig>, allValues: AiConfig) => {
    isDirtyRef.current = true;
    onSave(allValues);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onSave(values);
      onCancel();
    });
  };

  return (
    <Modal
      title={
        <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          AI 混合推理模式配置
        </div>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      okText="保存配置"
      cancelText="取消"
      width={600}
      className=""
      styles={{
        mask: {
          backdropFilter: 'blur(4px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={config}
        onValuesChange={handleValuesChange}
        style={{ marginTop: '20px' }}
      >
        <Form.Item name="mode" label={<span style={{ color: 'var(--text-primary)' }}>推理运行模式</span>}>
          <Radio.Group style={{ width: '100%' }}>
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
              <Radio value="local" className="glass-radio">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Cpu size={18} style={{ color: 'var(--secondary)' }} />
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>本地推理模式 (Ollama)</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>使用本地大模型，保障数据隐私且完全免费。</div>
                  </div>
                </div>
              </Radio>
              <Radio value="cloud" className="glass-radio">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Cloud size={18} style={{ color: 'var(--primary)' }} />
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>云端大模型模式 (DeepSeek / OpenAI)</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>调用云端 API，拥有更强大的推理与分析能力。</div>
                  </div>
                </div>
              </Radio>
              <Radio value="hybrid" className="glass-radio">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <GitMerge size={18} style={{ color: 'var(--success)' }} />
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>智能混合模式 (Hybrid Auto-Failover)</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>根据网络状态或任务复杂度自动降级或路由模型源。</div>
                  </div>
                </div>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Divider style={{ borderColor: 'var(--border-color)', margin: '24px 0' }} />

        {/* Local Configuration Section */}
        <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <h4 style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>
            <Cpu size={16} /> 本地模型设置
          </h4>
          <Form.Item
            name="localEndpoint"
            label={<span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Ollama Base URL</span>}
            rules={[{ required: true, message: '请输入 Ollama API 地址' }]}
          >
            <Input placeholder="http://localhost:11434" />
          </Form.Item>
          <Form.Item
            name="modelLocal"
            label={<span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>本地模型名称</span>}
            rules={[{ required: true, message: '请输入本地运行的模型名称，例如 qwen2.5' }]}
          >
            <Input placeholder="qwen2.5 / llama3" />
          </Form.Item>
        </div>

        {/* Cloud Configuration Section */}
        <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>
            <Cloud size={16} /> 云端 API 设置
          </h4>
          <Form.Item
            name="cloudEndpoint"
            label={<span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>API Base URL</span>}
            rules={[{ required: true, message: '请输入 API 终结点地址' }]}
          >
            <Input placeholder="https://api.deepseek.com/v1" />
          </Form.Item>
          <Form.Item
            name="apiKey"
            label={<span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>API Key</span>}
            rules={[{ required: true, message: '请输入有效的 API Key' }]}
          >
            <Input.Password placeholder="sk-........................" />
          </Form.Item>
          <Form.Item
            name="modelCloud"
            label={<span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>云端模型名称</span>}
            rules={[{ required: true, message: '请输入云端模型名' }]}
          >
            <Input placeholder="deepseek-chat" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};
