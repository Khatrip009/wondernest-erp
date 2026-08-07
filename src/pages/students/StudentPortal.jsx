import { Layout, Menu, Button } from 'antd'
import {
  DashboardOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  FilterOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'

const { Header, Content } = Layout

const StudentPortal = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, darkMode } = useTheme()
  const { selectedBranch, setSelectedBranch, selectedFinancialYear, setSelectedFinancialYear } = useScope()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const headerBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#f0f0f0'

  const path = location.pathname
  let activeTab = 'overview'
  if (path.includes('/students/list')) activeTab = 'list'
  else if (path.includes('/students/filters')) activeTab = 'filters'
  else if (path.includes('/students/reports')) activeTab = 'reports'
  else if (path.includes('/students/new')) activeTab = 'none'

  return (
    <Layout style={{ background: 'transparent', fontFamily: fontBody }}>
      <Header
        style={{
          background: headerBg,
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${borderColor}`,
          height: 48,
        }}
      >
        <Menu
          mode="horizontal"
          selectedKeys={[activeTab]}
          onClick={({ key }) => navigate(`/students/${key === 'overview' ? '' : key}`)}
          style={{
            borderBottom: 'none',
            fontSize: 14,
            fontFamily: fontBody,
            backgroundColor: headerBg,
          }}
          theme={darkMode ? 'dark' : 'light'}
          items={[
            { key: 'overview', icon: <DashboardOutlined />, label: 'Overview' },
            { key: 'list', icon: <UnorderedListOutlined />, label: 'All Students' },
            { key: 'filters', icon: <FilterOutlined />, label: 'Filters' },
            { key: 'reports', icon: <BarChartOutlined />, label: 'Reports' },
          ]}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/students/new')}
          style={{
            backgroundColor: primaryColor,
            borderColor: primaryColor,
            fontFamily: fontBody,
          }}
        >
          New Student
        </Button>
      </Header>
      <Content style={{ padding: '12px', fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5' }}>
        {/* Pass context to children (backward compatible) */}
        <Outlet
          context={{
            selectedBranch,
            setSelectedBranch,
            selectedFinancialYear,
            setSelectedFinancialYear,
          }}
        />
      </Content>
    </Layout>
  )
}

export default StudentPortal