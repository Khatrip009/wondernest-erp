import { useState } from 'react'
import { Layout, Menu, Button, Space, Typography } from 'antd'
import {
  DashboardOutlined,
  UnorderedListOutlined,
  VideoCameraOutlined,
  BarChartOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import BranchSelector from '../../components/BranchSelector'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'

const { Header, Content } = Layout

const InquiryPortal = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, darkMode } = useTheme()
  const {
    selectedBranch,
    setSelectedBranch,
    selectedFinancialYear,
    setSelectedFinancialYear,
    branches,
  } = useScope()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const headerBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#f0f0f0'

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
              backgroundColor: headerBg,
            }}
            theme={darkMode ? 'dark' : 'light'}
            items={[
              { key: 'overview', icon: <DashboardOutlined />, label: 'Overview' },
              { key: 'list', icon: <UnorderedListOutlined />, label: 'All Inquiries' },
              { key: 'demos', icon: <VideoCameraOutlined />, label: 'Demos' },
              { key: 'reports', icon: <BarChartOutlined />, label: 'Reports' },
            ]}
          />
          <BranchSelector
            value={selectedBranch?.id}
            onChange={(branchId) => {
              const branch = branches.find(b => b.id === branchId) || null
              setSelectedBranch(branch)
            }}
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

export default InquiryPortal