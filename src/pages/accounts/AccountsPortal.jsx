// AccountsPortal.jsx – includes Opening Balances, Vendor Payments & Daily Report
import { useState } from 'react'
import { Layout, Menu, Button, Space } from 'antd'
import {
  DashboardOutlined,
  BookOutlined,
  FileTextOutlined,
  DollarOutlined,
  BankOutlined,
  BarChartOutlined,
  TeamOutlined,
  FileOutlined,
  PieChartOutlined,
  SlidersOutlined,
  ScheduleOutlined,
  WalletOutlined,
  CalendarOutlined,          // 🆕 icon for Daily Report
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import BranchSelector from '../../components/BranchSelector'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'

const { Header, Content } = Layout

const AccountsPortal = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()
  const { org } = useOrganization()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, setSelectedBranch, selectedFinancialYear, setSelectedFinancialYear } = outletContext

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'

  const path = location.pathname
  let activeTab = 'dashboard'
  if (path.includes('/accounts/ledger')) activeTab = 'ledger'
  else if (path.includes('/accounts/journal')) activeTab = 'journal'
  else if (path.includes('/accounts/income')) activeTab = 'income'
  else if (path.includes('/accounts/expenses')) activeTab = 'expenses'
  else if (path.includes('/accounts/trial-balance')) activeTab = 'trial-balance'
  else if (path.includes('/accounts/account-ledger')) activeTab = 'account-ledger'
  else if (path.includes('/accounts/student-ledger')) activeTab = 'student-ledger'
  else if (path.includes('/accounts/gst')) activeTab = 'gst'
  else if (path.includes('/accounts/profit-loss')) activeTab = 'profit-loss'
  else if (path.includes('/accounts/balance-sheet')) activeTab = 'balance-sheet'
  else if (path.includes('/accounts/general-student-ledger')) activeTab = 'general-student-ledger'
  else if (path.includes('/accounts/opening-balances')) activeTab = 'opening-balances'
  else if (path.includes('/accounts/vendor-payments')) activeTab = 'vendor-payments'
  else if (path.includes('/accounts/daily-report')) activeTab = 'daily-report'   // 🆕

  const handleTabClick = (key) => {
    switch (key) {
      case 'dashboard': navigate('/accounts'); break
      case 'ledger': navigate('/accounts/ledger'); break
      case 'journal': navigate('/accounts/journal'); break
      case 'income': navigate('/accounts/income'); break
      case 'expenses': navigate('/accounts/expenses'); break
      case 'trial-balance': navigate('/accounts/trial-balance'); break
      case 'account-ledger': navigate('/accounts/account-ledger'); break
      case 'student-ledger': navigate('/accounts/student-ledger'); break
      case 'general-student-ledger': navigate('/accounts/general-student-ledger'); break
      case 'gst': navigate('/accounts/gst'); break
      case 'profit-loss': navigate('/accounts/profit-loss'); break
      case 'balance-sheet': navigate('/accounts/balance-sheet'); break
      case 'gst-ledger': navigate('/accounts/gst-ledger'); break
      case 'opening-balances': navigate('/accounts/opening-balances'); break
      case 'vendor-payments': navigate('/accounts/vendor-payments'); break
      case 'daily-report': navigate('/accounts/daily-report'); break   // 🆕
      default: break
    }
  }

  const handleBranchChange = (branchId) => {
    if (!branchId) { setSelectedBranch?.(null); return }
    setSelectedBranch?.({ id: branchId })
  }

  const contextValue = {
    selectedBranch,
    setSelectedBranch,
    selectedFinancialYear,
    setSelectedFinancialYear,
    orgId: org?.id,
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
              { key: 'ledger', icon: <BookOutlined />, label: 'Ledger' },
              { key: 'journal', icon: <FileTextOutlined />, label: 'Journal' },
              { key: 'income', icon: <DollarOutlined />, label: 'Income' },
              { key: 'expenses', icon: <BankOutlined />, label: 'Expenses' },
              { key: 'trial-balance', icon: <BarChartOutlined />, label: 'Trial Balance' },
              { key: 'account-ledger', icon: <BookOutlined />, label: 'Account Ledger' },
              { key: 'student-ledger', icon: <TeamOutlined />, label: 'Student Ledger' },
              { key: 'general-student-ledger', icon: <BookOutlined />, label: 'Student Ledger' },
              { key: 'gst', icon: <FileOutlined />, label: 'GST Summary' },
              { key: 'profit-loss', icon: <PieChartOutlined />, label: 'Profit & Loss' },
              { key: 'balance-sheet', icon: <SlidersOutlined />, label: 'Balance Sheet' },
              { key: 'gst-ledger', icon: <FileOutlined />, label: 'GST Ledger' },
              { key: 'opening-balances', icon: <ScheduleOutlined />, label: 'Opening Balances' },
              { key: 'vendor-payments', icon: <WalletOutlined />, label: 'Vendor Payments' },
              { key: 'daily-report', icon: <CalendarOutlined />, label: 'Daily Report' },   // 🆕
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
          onClick={() => navigate('/accounts/journal/new')}
          style={{ backgroundColor: primaryColor, borderColor: primaryColor, flexShrink: 0, fontFamily: fontBody }}
        >
          + New Journal Entry
        </Button>
      </Header>
      <Content style={{ padding: '12px', fontFamily: fontBody }}>
        <Outlet context={contextValue} />
      </Content>
    </Layout>
  )
}

export default AccountsPortal