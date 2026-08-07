import { useState } from 'react'
import { Layout, Menu, Button, Space } from 'antd'
import {
  DashboardOutlined,
  UnorderedListOutlined,
  VideoCameraOutlined,
  BarChartOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import BranchSelector from '../../components/BranchSelector'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'

const { Header, Content } = Layout

const InquiryPortal = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()
  const { branches = [] } = useOrganization() || {} // ✅ fallback empty array

  // Get selectedBranch and setters from MainLayout via outlet context
  const {
    selectedBranch,
    setSelectedBranch,
    selectedFinancialYear,
    setSelectedFinancialYear,
  } = useOutletContext() || {} // ✅ fallback empty object

  // Theme values with fallbacks
  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  // Determine active tab
  const path = location.pathname
  let activeTab = 'overview'
  if (path.includes('/inquiries/list')) activeTab = 'list'
  else if (path.includes('/inquiries/demos')) activeTab = 'demos'
  else if (path.includes('/inquiries/reports')) activeTab = 'reports'
  else if (path.includes('/inquiries/new')) activeTab = 'none'
  else if (path.match(/\/inquiries\/\d+/)) activeTab = 'none'

  const handleTabClick = (key) => {
    switch (key) {
      case 'overview': navigate('/inquiries'); break
      case 'list': navigate('/inquiries/list'); break
      case 'demos': navigate('/inquiries/demos'); break
      case 'reports': navigate('/inquiries/reports'); break
    }
  }

  // Handle branch change from BranchSelector
  const handleBranchChange = (branchId) => {
    if (!branchId) {
      setSelectedBranch?.(null)
      return
    }
    const branch = branches.find(b => b.id === branchId)
    setSelectedBranch?.(branch || null)
  }

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
          flexWrap: 'nowrap',
          overflowX: 'auto',
          gap: 8,
        }}
      >
        <Space size={0} align="center" style={{ flexShrink: 0 }}>
          <Menu
            mode="horizontal"
            selectedKeys={[activeTab]}
            onClick={({ key }) => handleTabClick(key)}
            style={{
              borderBottom: 'none',
              fontSize: 14,
              fontFamily: fontBody,
            }}
            items={[
              { key: 'overview', icon: <DashboardOutlined />, label: 'Overview' },
              { key: 'list', icon: <UnorderedListOutlined />, label: 'All Inquiries' },
              { key: 'demos', icon: <VideoCameraOutlined />, label: 'Demos' },
              { key: 'reports', icon: <BarChartOutlined />, label: 'Reports' },
            ]}
          />
          <BranchSelector
            value={selectedBranch?.id}
            onChange={handleBranchChange}
            style={{ minWidth: 120, fontFamily: fontBody }}
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/inquiries/new')}
          style={{
            backgroundColor: primaryColor,
            borderColor: primaryColor,
            flexShrink: 0,
            fontFamily: fontBody,
          }}
        >
          New Inquiry
        </Button>
      </Header>
      <Content style={{ padding: '12px', fontFamily: fontBody }}>
        {/* Pass all context to children */}
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

export default InquiryPortal