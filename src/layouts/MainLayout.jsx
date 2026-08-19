// src/layouts/MainLayout.jsx
import { useState, useMemo } from 'react'
import {
  Layout, Menu, Button, theme, Typography, Switch, Dropdown,
  Badge, Avatar, Space, Popover, List, Skeleton
} from 'antd'
import {
  DashboardOutlined,
  TeamOutlined,
  BookOutlined,
  DollarOutlined,
  PhoneOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  DatabaseOutlined,
  AccountBookOutlined,
  ReadOutlined,
  LogoutOutlined,
  BulbOutlined,
  BulbFilled,
  BellOutlined,
  UserOutlined,
  FilePdfOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  BarChartOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  LineChartOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useOrganization } from '../contexts/OrganizationContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useScope } from '../contexts/ScopeContext'
import BranchSelector from '../components/BranchSelector'
import FinancialYearSelector from '../components/FinancialYearSelector'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const ALL_MENU_ITEMS = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/inquiries', icon: <PhoneOutlined />, label: 'Inquiries' },
  { key: '/students', icon: <TeamOutlined />, label: 'Students' },
  { key: '/academics', icon: <ReadOutlined />, label: 'Academics' },
  { key: '/fees', icon: <DollarOutlined />, label: 'Fees' },
  { key: '/accounts', icon: <AccountBookOutlined />, label: 'Accounts' },
  { key: '/inventory', icon: <ShopOutlined />, label: 'Inventory' },
  { key: '/hr', icon: <TeamOutlined />, label: 'HR' },
  { key: '/master-data', icon: <DatabaseOutlined />, label: 'Master Data' },
  { key: '/organization', icon: <SettingOutlined />, label: 'Organization' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
  // Teacher dedicated pages
  { key: '/teacher', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/teacher/attendance', icon: <CheckCircleOutlined />, label: 'My Check‑in/out' },
  { key: '/teacher/attendance/take', icon: <CheckCircleOutlined />, label: 'Take Student Attendance' },
  { key: '/teacher/batches', icon: <BookOutlined />, label: 'My Batches' },
  { key: '/teacher/homework', icon: <FileTextOutlined />, label: 'Homework' },
  { key: '/teacher/exams', icon: <WarningOutlined />, label: 'Exams' },
  { key: '/teacher/leaves', icon: <ClockCircleOutlined />, label: 'Leaves' },
  { key: '/teacher/salary', icon: <DollarOutlined />, label: 'Salary' },
  { key: '/teacher/profile', icon: <UserOutlined />, label: 'Profile' },
  { key: '/teacher/timetable', icon: <CalendarOutlined />, label: 'My Timetable' },
  // Student dedicated pages
  { key: '/student', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/student/attendance', icon: <CalendarOutlined />, label: 'My Attendance' },
  { key: '/student/homework', icon: <FileTextOutlined />, label: 'Homework' },
  { key: '/student/fees', icon: <DollarOutlined />, label: 'My Fees' },
  { key: '/student/results', icon: <LineChartOutlined />, label: 'My Results' },
  { key: '/student/certificates', icon: <FilePdfOutlined />, label: 'My Certificates' },
  { key: '/student/timetable', icon: <CalendarOutlined />, label: 'My Timetable' },
  { key: '/student/profile', icon: <UserOutlined />, label: 'My Profile' },
]

const ROLE_MENU_MAP = {
  'Super Admin': ALL_MENU_ITEMS.filter(
    item => !item.key.startsWith('/teacher') && !(item.key === '/student' || item.key.startsWith('/student/'))
  ).map(item => item.key),
  'Admin': ALL_MENU_ITEMS.filter(
    item => !item.key.startsWith('/teacher') && !(item.key === '/student' || item.key.startsWith('/student/'))
  ).map(item => item.key),
  'Organization Admin': ALL_MENU_ITEMS.filter(
    item => !item.key.startsWith('/teacher') && !(item.key === '/student' || item.key.startsWith('/student/'))
  ).map(item => item.key),
  'Branch Admin': ['/', '/inquiries', '/students', '/academics', '/fees', '/reports', '/master-data'],
  'Teacher': [
    '/teacher',
    '/teacher/attendance',
    '/teacher/attendance/take',
    '/teacher/batches',
    '/teacher/homework',
    '/teacher/exams',
    '/teacher/leaves',
    '/teacher/salary',
    '/teacher/profile',
    '/teacher/timetable',
  ],
  'Student': [
    '/student',
    '/student/attendance',
    '/student/homework',
    '/student/fees',
    '/student/results',
    '/student/timetable',
    '/student/profile',
    '/student/certificates',
  ],
  'Parent': ['/'],
}

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()
  const navigate = useNavigate()
  const location = useLocation()

  const { signOut, profile, user } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const { org, loading: orgLoading } = useOrganization()
  const {
    selectedBranch,
    setSelectedBranch,
    selectedFinancialYear,
    setSelectedFinancialYear,
    branches,
    financialYears,
  } = useScope()

  const queryClient = useQueryClient()

  const { data: notifications, isLoading: notifLoading } = useQuery({
    queryKey: ['top-notifications', user?.id, org?.id],
    queryFn: async () => {
      if (!user?.id || !org?.id) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, created_at, is_read, link')
        .eq('organization_id', org.id)
        .or(`user_id.eq.${user.id},target_type.eq.All`)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data
    },
    enabled: !!user?.id && !!org?.id,
    refetchInterval: 60_000,
  })

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      queryClient.clear()
      navigate('/login', { replace: true })
    }
  }

  const path = location.pathname

  const activeKey = useMemo(() => {
    const exactMatch = ALL_MENU_ITEMS.find(item => item.key === path)
    if (exactMatch) return exactMatch.key

    const prefixMatch = ALL_MENU_ITEMS
      .filter(item => item.key !== '/' && path.startsWith(item.key))
      .sort((a, b) => b.key.length - a.key.length)[0]

    return prefixMatch ? prefixMatch.key : '/'
  }, [path])

  const role = profile?.role || 'Student'
  const allowedKeys = ROLE_MENU_MAP[role] || ROLE_MENU_MAP['Student']
  const menuItems = useMemo(
    () => ALL_MENU_ITEMS.filter(item => allowedKeys.includes(item.key)),
    [allowedKeys]
  )

  const textColor = darkMode ? '#d9d9d9' : '#333'
  const headerBg = darkMode ? '#1f1f1f' : '#ffffff'
  const siderBg = darkMode ? '#141414' : '#ffffff'

  // Profile dropdown navigation based on role
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile Settings',
      onClick: () => {
        if (profile?.role === 'Teacher') {
          navigate('/teacher/profile')
        } else if (profile?.role === 'Student') {
          navigate('/student/profile')
        } else {
          navigate('/profile')
        }
      },
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ]

  const notificationContent = (
    <div style={{ width: 320, fontFamily: 'var(--font-body, Montserrat)' }}>
      {notifLoading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : notifications?.length > 0 ? (
        <List
          size="small"
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{ cursor: 'pointer', opacity: item.is_read ? 0.7 : 1 }}
              onClick={() => {
                if (item.link) navigate(item.link)
              }}
            >
              <List.Item.Meta
                title={
                  <span style={{ fontWeight: item.is_read ? 'normal' : 'bold' }}>
                    {item.title}
                  </span>
                }
                description={
                  <>
                    <div style={{ fontSize: 12 }}>{item.message}</div>
                    <div style={{ fontSize: 10, color: '#999' }}>
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          No new notifications
        </div>
      )}
      {notifications?.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Button type="link" size="small" onClick={() => navigate('/notifications')}>
            View All Notifications
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={{ background: siderBg }}
        className="border-r border-gray-200 shadow-sm"
      >
        {/* ✅ Clickable logo/company area */}
        <div
          className="flex flex-col items-center justify-center h-20 border-b border-gray-100 p-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          {orgLoading ? (
            <div className={`animate-pulse rounded bg-gray-200 ${collapsed ? 'h-8 w-8' : 'h-14 w-14'}`} />
          ) : (
            <>
              {darkMode && org?.logo_light_url ? (
                <img
                  src={org.logo_light_url}
                  alt={org?.company_name}
                  className={`object-contain transition-all duration-200 max-w-full ${collapsed ? 'h-8' : 'h-16'}`}
                />
              ) : org?.logo_dark_url ? (
                <img
                  src={org.logo_dark_url}
                  alt={org?.company_name}
                  className={`object-contain transition-all duration-200 max-w-full ${collapsed ? 'h-8' : 'h-16'}`}
                />
              ) : (
                <h1
                  className={`font-bold transition-all ${collapsed ? 'text-lg' : 'text-xl'}`}
                  style={{
                    color: 'var(--primary-color)',
                    fontFamily: 'var(--font-heading, Righteous)',
                  }}
                >
                  {org?.company_name?.charAt(0) || 'S'}
                </h1>
              )}
              {!collapsed && !orgLoading && (
                <Text
                  strong
                  className="text-xs mt-1 truncate w-full text-center"
                  style={{
                    color: 'var(--primary-color)',
                    fontFamily: 'var(--font-heading, Righteous)',
                  }}
                >
                  {org?.company_name}
                </Text>
              )}
            </>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="!border-r-0 mt-2"
          theme={darkMode ? 'dark' : 'light'}
        />
      </Sider>

      <Layout>
        <Header
          className="!px-4 flex items-center justify-between shadow-sm border-b border-gray-200"
          style={{ background: headerBg }}
        >
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="!text-lg !w-10 !h-10"
              style={{ color: textColor }}
            />
            <BranchSelector
              value={selectedBranch?.id}
              onChange={(id) => setSelectedBranch(id)}
              branches={branches}
            />
            <FinancialYearSelector
              value={selectedFinancialYear?.id}
              onChange={(id) => setSelectedFinancialYear(id)}
              financialYears={financialYears}
            />
          </div>

          <div className="flex items-center gap-4">
            <Popover
              content={notificationContent}
              title="Notifications"
              trigger="click"
              placement="bottomRight"
            >
              <Badge count={unreadCount} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  className="!text-lg !w-10 !h-10"
                  style={{ color: textColor }}
                />
              </Badge>
            </Popover>

            <Switch
              checkedChildren={<BulbFilled />}
              unCheckedChildren={<BulbOutlined />}
              checked={darkMode}
              onChange={toggleDarkMode}
            />

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <Space className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded-lg transition-colors">
                <Avatar
                  size="small"
                  src={profile?.avatar_url}
                  icon={!profile?.avatar_url && <UserOutlined />}
                  style={{ backgroundColor: 'var(--primary-color)' }}
                />
                <span className="font-medium hidden sm:inline" style={{ fontFamily: 'var(--font-body, Montserrat)', color: textColor }}>
                  {profile?.full_name || 'User'}
                </span>
                <Text type="secondary" className="hidden sm:inline" style={{ color: darkMode ? '#aaa' : '#666' }}>
                  ({profile?.role || 'Guest'})
                </Text>
              </Space>
            </Dropdown>
          </div>
        </Header>

        <Content
          className="m-4 p-6"
          style={{
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            fontFamily: 'var(--font-body, Montserrat)',
          }}
        >
          <Outlet context={{
            selectedBranch,
            setSelectedBranch,
            selectedFinancialYear,
            setSelectedFinancialYear,
          }} />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout