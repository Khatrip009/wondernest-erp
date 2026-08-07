import { useState } from 'react'
import { Layout, Menu, Button, Space } from 'antd'
import {
  DashboardOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  ContainerOutlined,
  BarChartOutlined,
  PlusOutlined,
  DollarOutlined,   // ✅ added
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import BranchSelector from '../../components/BranchSelector'
import FinancialYearSelector from '../../components/FinancialYearSelector'
import { useTheme } from '../../contexts/ThemeContext'

const { Header, Content } = Layout

const FeesPortal = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, setSelectedBranch, selectedFinancialYear, setSelectedFinancialYear } = outletContext

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'

  const path = location.pathname
  let activeTab = 'dashboard'
  if (path.includes('/fees/list')) activeTab = 'list'
  else if (path.includes('/fees/invoices')) activeTab = 'invoices'
  else if (path.includes('/fees/receipts')) activeTab = 'receipts'
  else if (path.includes('/fees/reports')) activeTab = 'reports'
  else if (path.includes('/fees/balances')) activeTab = 'balances'   // ✅ recognize the new route
  else if (path.includes('/fees/new')) activeTab = 'none'
  else if (path.match(/\/fees\/\d+/)) activeTab = 'none'

  const handleTabClick = (key) => {
    switch (key) {
      case 'dashboard': navigate('/fees'); break
      case 'list': navigate('/fees/list'); break
      case 'balances': navigate('/fees/balances'); break
      case 'invoices': navigate('/fees/invoices'); break
      case 'receipts': navigate('/fees/receipts'); break
      case 'reports': navigate('/fees/reports'); break
    }
  }

  const handleBranchChange = (branchId) => {
    if (!branchId) { setSelectedBranch?.(null); return }
    setSelectedBranch?.({ id: branchId })
  }

  const handleFinancialYearChange = (fyId) => {
    if (!fyId) { setSelectedFinancialYear?.(null); return }
    setSelectedFinancialYear?.({ id: fyId })
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
            style={{ borderBottom: 'none', fontSize: 14, fontFamily: fontBody }}
            items={[
              { key: 'dashboard', icon: <DashboardOutlined />, label: 'Overview' },
              { key: 'list', icon: <UnorderedListOutlined />, label: 'All Fees' },
              { key: 'balances', icon: <DollarOutlined />, label: 'Balances' },   // ✅ now works
              { key: 'invoices', icon: <FileTextOutlined />, label: 'Invoices' },
              { key: 'receipts', icon: <ContainerOutlined />, label: 'Receipts' },
              { key: 'reports', icon: <BarChartOutlined />, label: 'Reports' },
            ]}
          />
          <BranchSelector
            value={selectedBranch?.id}
            onChange={handleBranchChange}
            style={{ minWidth: 120, fontFamily: fontBody }}
          />
          <FinancialYearSelector
            value={selectedFinancialYear?.id}
            onChange={handleFinancialYearChange}
            style={{ minWidth: 120, fontFamily: fontBody }}
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/fees/new')}
          style={{ backgroundColor: primaryColor, borderColor: primaryColor, flexShrink: 0, fontFamily: fontBody }}
        >
          New Fee Record
        </Button>
      </Header>
      <Content style={{ padding: '12px', fontFamily: fontBody }}>
        <Outlet context={outletContext} />
      </Content>
    </Layout>
  )
}

export default FeesPortal