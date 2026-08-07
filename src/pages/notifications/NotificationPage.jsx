// src/pages/notifications/NotificationPage.jsx
import { useState } from 'react'
import { Card, List, Typography, Space, Button, Tag, Skeleton, Empty } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useTheme } from '../../contexts/ThemeContext'

const { Title, Text } = Typography

const NotificationPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { org } = useOrganization()
  const { theme, darkMode } = useTheme()
  const queryClient = useQueryClient()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  // Fetch all notifications for the user (org‑scoped)
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id, org?.id],
    queryFn: async () => {
      if (!user?.id || !org?.id) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', org.id)
        .or(`user_id.eq.${user.id},target_type.eq.All`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user?.id && !!org?.id,
  })

  // Mark a single notification as read
  const markAsRead = useMutation({
    mutationFn: async (notifId) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
    },
  })

  const handleNotificationClick = (notif) => {
    if (notif.link) {
      navigate(notif.link)
    }
    if (!notif.is_read) {
      markAsRead.mutate(notif.id)
    }
  }

  return (
    <div style={{ fontFamily: fontBody, padding: 16 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/')}
          style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
        >
          Back
        </Button>
        <Button
          type="primary"
          onClick={() => {
            const unreadIds = notifications?.filter(n => !n.is_read).map(n => n.id)
            if (unreadIds?.length) {
              supabase
                .from('notifications')
                .update({ is_read: true })
                .in('id', unreadIds)
                .then(() => queryClient.invalidateQueries(['notifications']))
            }
          }}
          style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
          disabled={!notifications?.some(n => !n.is_read)}
        >
          Mark All as Read
        </Button>
      </Space>

      <Card
        bordered={false}
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          borderTop: `4px solid ${primaryColor}`,
          maxWidth: 800,
          margin: '0 auto',
        }}
      >
        <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, marginTop: 0 }}>
          Notifications
        </Title>

        {isLoading ? (
          <Skeleton active />
        ) : notifications?.length ? (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  padding: '12px 0',
                  borderBottom: `1px solid ${darkMode ? '#444' : '#f0f0f0'}`,
                  opacity: item.is_read ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
                onClick={() => handleNotificationClick(item)}
              >
                <List.Item.Meta
                  title={
                    <Text strong style={{ color: primaryColor, fontFamily: fontHeading }}>
                      {item.title}
                    </Text>
                  }
                  description={
                    <div>
                      <div style={{ color: textColor, marginBottom: 4 }}>{item.message}</div>
                      <Space size="small">
                        <Text style={{ fontSize: 12, color: darkMode ? '#aaa' : '#888' }}>
                          {new Date(item.created_at).toLocaleString()}
                        </Text>
                        {!item.is_read && (
                          <Tag color="blue" style={{ fontFamily: fontBody }}>New</Tag>
                        )}
                      </Space>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="No notifications" />
        )}
      </Card>
    </div>
  )
}

export default NotificationPage