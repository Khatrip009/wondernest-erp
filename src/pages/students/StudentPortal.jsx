import { Layout, Menu, Button } from 'antd'
import {
  DashboardOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  FilterOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'

const { Header, Content } = Layout

const StudentPortal = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()

  // Get the outlet context from MainLayout (selectedBranch, etc.)
  const outletContext = useOutletContext()

  // Theme values with fallbacks
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const path = location.pathname
  let activeTab = 'overview'
  if (path.includes('/students/list')) activeTab = 'list'
  else if (path.includes('/students/filters')) activeTab = 'filters'
  else if (path.includes('/students/reports')) activeTab = 'reports'

  return (
    <Layout style={{ background: 'transparent' }}>
      <Header
        style={{
          background: 'white',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          height: 48,
          fontFamily: fontBody,
        }}
      >
        <Menu
          mode="horizontal"
          selectedKeys={[activeTab]}
          onClick={({ key }) => navigate(`/students/${key === 'overview' ? '' : key}`)}
          style={{ borderBottom: 'none', fontSize: 14 }}
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
      <Content style={{ padding: '12px', fontFamily: fontBody }}>
        {/* Forward the outlet context to nested routes */}
        <Outlet context={outletContext} />
      </Content>
    </Layout>
  )
}

export default StudentPortal