import { useState } from 'react'
import { Layout, Menu, Button, theme, Typography, Switch } from 'antd'
import {
  DashboardOutlined,
  TeamOutlined,
  BookOutlined,
  DollarOutlined,
  CalendarOutlined,
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
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useOrganization } from '../contexts/OrganizationContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import BranchSelector from '../components/BranchSelector'
import FinancialYearSelector from '../components/FinancialYearSelector'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()
  const navigate = useNavigate()
  const location = useLocation()

  const { signOut, profile } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()

  const {
    org,
    loading: orgLoading,
    selectedBranch,
    setSelectedBranch,
    selectedFinancialYear,
    setSelectedFinancialYear,
    branches,
    financialYears,
  } = useOrganization()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const path = location.pathname
  let activeKey = '/'
  if (path.startsWith('/inquiries')) activeKey = '/inquiries'
  else if (path.startsWith('/students')) activeKey = '/students'
  else if (path.startsWith('/fees')) activeKey = '/fees'
  else if (path.startsWith('/attendance')) activeKey = '/attendance'
  else if (path.startsWith('/master-data')) activeKey = '/master-data'
  else if (path.startsWith('/organization')) activeKey = '/organization'
  else if (path.startsWith('/accounts')) activeKey = '/accounts'
  else if (path.startsWith('/academics')) activeKey = '/academics'

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/inquiries', icon: <PhoneOutlined />, label: 'Inquiries' },
    { key: '/students', icon: <TeamOutlined />, label: 'Students' },
    { key: '/academics', icon: <ReadOutlined />, label: 'Academics' },
      
    { key: '/fees', icon: <DollarOutlined />, label: 'Fees' },
    { key: '/accounts', icon: <AccountBookOutlined />, label: 'Accounts' },
    { key: '/attendance', icon: <CalendarOutlined />, label: 'Attendance' },
    { key: '/master-data', icon: <DatabaseOutlined />, label: 'Master Data' },
    { key: '/organization', icon: <SettingOutlined />, label: 'Organization' },
  ]

  // Determine text color based on dark mode
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const headerBg = darkMode ? '#1f1f1f' : '#ffffff'
  const siderBg = darkMode ? '#141414' : '#ffffff'

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
        className="!bg-white border-r border-gray-200 shadow-sm"
        style={{ background: siderBg }}
      >
        <div className="flex flex-col items-center justify-center h-20 border-b border-gray-100 p-2">
          {orgLoading ? (
            <div className={`animate-pulse rounded bg-gray-200 ${collapsed ? 'h-8 w-8' : 'h-14 w-14'}`} />
          ) : org?.logo_dark_url ? (
            <img
              src={org.logo_dark_url}
              alt={org?.company_name}
              className={`object-contain transition-all duration-200 max-w-full ${collapsed ? 'h-8' : 'h-18'}`}
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
              onChange={(id) => {
                const branch = branches.find(b => b.id === id)
                setSelectedBranch(branch)
              }}
            />
            <FinancialYearSelector
              value={selectedFinancialYear?.id}
              onChange={(id) => {
                const fy = financialYears.find(f => f.id === id)
                setSelectedFinancialYear(fy)
              }}
            />
          </div>

          <div className="flex items-center gap-4">
            <span
              className="font-medium"
              style={{
                fontFamily: 'var(--font-body, Montserrat)',
                color: textColor,
              }}
            >
              Welcome, {profile?.full_name || 'User'} ({profile?.role || 'Guest'})
            </span>
            <Switch
              checkedChildren={<BulbFilled />}
              unCheckedChildren={<BulbOutlined />}
              checked={darkMode}
              onChange={toggleDarkMode}
            />
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className="!text-red-500 hover:!text-red-600"
              title="Logout"
            >
              Logout
            </Button>
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