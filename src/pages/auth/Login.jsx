import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { Navigate } from 'react-router-dom'

const { Title, Text } = Typography

const Login = () => {
  const { signIn, user } = useAuth()
  const { org, loading: orgLoading } = useOrganization()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If already logged in, redirect immediately
  if (user) return <Navigate to="/" replace />

  const onFinish = async (values) => {
    setLoading(true)
    setError('')
    try {
      await signIn(values.identifier, values.password)
      // Redirect will happen automatically when `user` becomes truthy
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 p-4"
      style={{ fontFamily: 'var(--font-body, Montserrat)' }}
    >
      <Card className="w-full max-w-md shadow-xl" bordered={false}>
        <Space direction="vertical" size="large" className="w-full">
          {/* Organization branding */}
          <div className="text-center">
            {orgLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto" />
                <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
              </div>
            ) : (
              <>
                {org?.logo_dark_url ? (
                  <img
                    src={org.logo_dark_url}
                    alt={org.company_name}
                    className="h-16 mx-auto mb-3 object-contain"
                  />
                ) : (
                  <Title level={3} style={{ color: 'var(--primary-color)' }}>
                    {org?.company_name || 'Shreevidhya ERP'}
                  </Title>
                )}
                <Title
                  level={4}
                  style={{
                    fontFamily: 'var(--font-heading, Righteous)',
                    color: 'var(--primary-color)',
                    marginBottom: 0,
                  }}
                >
                  {org?.company_name || 'Shreevidhya Academy'}
                </Title>
                {org?.tagline && (
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    {org.tagline}
                  </Text>
                )}
              </>
            )}
            {!orgLoading && (
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                Sign in to your account
              </Text>
            )}
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError('')}
            />
          )}

          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="identifier"
              label="Email or User ID"
              rules={[{ required: true, message: 'Please enter your email or user ID' }]}
            >
              <Input prefix={<MailOutlined />} placeholder="admin@shreevidhya.com" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  backgroundColor: 'var(--primary-color)',
                  borderColor: 'var(--primary-color)',
                }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center">
            <Text type="secondary">Need help? Contact administrator</Text>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default Login