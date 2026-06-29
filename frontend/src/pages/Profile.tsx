import React, { useState } from 'react';
import { Card, Form, Input, Button, Divider, App, Avatar, Row, Col } from 'antd';
import { User as UserIcon, Lock, Save, ShieldCheck } from 'lucide-react';
import { authApi, type UserInfo } from '../services/auth';

interface ProfileProps {
  user: UserInfo | null;
  onUserUpdate: (user: UserInfo) => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onUserUpdate }) => {
  const { message } = App.useApp();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Why: Submit updated username and email to backend and propagate change to parent state.
  const handleUpdateProfile = async (values: { username: string; email?: string }) => {
    setProfileLoading(true);
    try {
      const updated = await authApi.updateProfile(values.username, values.email);
      onUserUpdate(updated);
      message.success('个人资料更新成功');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '更新失败';
      message.error(errorMsg);
    } finally {
      setProfileLoading(false);
    }
  };

  // Why: Submit old+new password to backend for validation and update.
  const handleChangePassword = async (values: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的新密码不一致');
      return;
    }
    setPasswordLoading(true);
    try {
      await authApi.changePassword(values.oldPassword, values.newPassword);
      message.success('密码修改成功，下次登录请使用新密码');
      passwordForm.resetFields();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '密码修改失败';
      message.error(errorMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '8px', color: 'var(--text-primary)' }}>
          个人资料 <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '14px', marginLeft: '4px' }}>Profile Settings</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
          管理您的账户信息和安全设置。
        </p>
      </div>

      <Row gutter={[24, 24]}>
        {/* Profile Info Card */}
        <Col xs={24} lg={10}>
          <Card className="glass-panel" styles={{ body: { padding: '32px', textAlign: 'center' } }}>
            <Avatar
              size={80}
              style={{
                background: 'var(--primary)',
                marginBottom: '16px',
              }}
              icon={<UserIcon size={36} />}
            />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600, margin: '8px 0 4px' }}>
              {user?.username || '未登录'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
              用户 ID: {user?.id || '-'}
            </p>
            {user?.email && (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                {user.email}
              </p>
            )}
            <Divider style={{ borderColor: 'var(--border-color)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
                JWT 无状态鉴权已启用
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <Lock size={14} style={{ color: 'var(--secondary)' }} />
                密码使用 bcrypt 加密存储
              </div>
            </div>
          </Card>
        </Col>

        {/* Edit Forms */}
        <Col xs={24} lg={14}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Username Update */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  <UserIcon size={18} style={{ color: 'var(--primary)' }} />
                  <span>修改个人资料</span>
                </div>
              }
              className="glass-panel"
            >
              <Form
                form={profileForm}
                layout="vertical"
                initialValues={{ username: user?.username || '', email: user?.email || '' }}
                onFinish={handleUpdateProfile}
              >
                <Form.Item
                  name="username"
                  label={<span style={{ color: 'var(--text-primary)' }}>用户名</span>}
                  rules={[
                    { required: true, message: '请输入用户名' },
                    { min: 3, message: '用户名至少 3 个字符' },
                    { max: 50, message: '用户名最多 50 个字符' },
                  ]}
                >
                  <Input placeholder="请输入新用户名" />
                </Form.Item>
                <Form.Item
                  name="email"
                  label={<span style={{ color: 'var(--text-primary)' }}>邮箱地址</span>}
                  rules={[
                    { type: 'email', message: '请输入有效的邮箱地址' },
                  ]}
                >
                  <Input placeholder="选填，用于接收通知" />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={profileLoading}
                    icon={<Save size={14} />}
                    style={{ background: 'var(--primary)' }}
                  >
                    保存修改
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {/* Password Change */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  <Lock size={18} style={{ color: 'var(--warning)' }} />
                  <span>修改密码</span>
                </div>
              }
              className="glass-panel"
            >
              <Form
                form={passwordForm}
                layout="vertical"
                onFinish={handleChangePassword}
              >
                <Form.Item
                  name="oldPassword"
                  label={<span style={{ color: 'var(--text-primary)' }}>当前密码</span>}
                  rules={[{ required: true, message: '请输入当前密码' }]}
                >
                  <Input.Password placeholder="请输入当前使用的密码" />
                </Form.Item>
                <Form.Item
                  name="newPassword"
                  label={<span style={{ color: 'var(--text-primary)' }}>新密码</span>}
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 6, message: '密码至少 6 个字符' },
                  ]}
                >
                  <Input.Password placeholder="请输入新密码（至少 6 位）" />
                </Form.Item>
                <Form.Item
                  name="confirmPassword"
                  label={<span style={{ color: 'var(--text-primary)' }}>确认新密码</span>}
                  rules={[
                    { required: true, message: '请再次输入新密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="请再次输入新密码" />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={passwordLoading}
                    icon={<Lock size={14} />}
                    style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }}
                  >
                    修改密码
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};
