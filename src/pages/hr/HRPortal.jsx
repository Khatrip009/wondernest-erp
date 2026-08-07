// HRPortal.jsx – fixed layout (no overlap)
import { useState } from 'react'
import { Layout, Menu, Button, Space } from 'antd'
import {
  DashboardOutlined, TeamOutlined, CalendarOutlined, CoffeeOutlined,
  DollarOutlined, PlusOutlined, CalculatorOutlined, FilePdfOutlined,
  EllipsisOutlined
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import BranchSelector from '../../components/BranchSelector'
import FinancialYearSelector from '../../components/FinancialYearSelector'

const { Header, Content } = Layout

const HRPortal = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, darkMode } = useTheme()
  const {
    selectedBranch,
    setSelectedBranch,
    selectedFinancialYear,
    setSelectedFinancialYear,
    branches,
    financialYears,
  } = useScope()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const headerBg = darkMode ? '#1f1f1f' : '#ffffff'
  const borderColor = darkMode ? '#444' : '#f0f0f0'

  const path = location.pathname
  let activeTab = 'dashboard'
  if (path.includes('/hr/employees')) activeTab = 'employees'
  else if (path.includes('/hr/attendance')) activeTab = 'attendance'
  else if (path.includes('/hr/leaves')) activeTab = 'leaves'
  else if (path.includes('/hr/leave-report')) activeTab = 'leave-report'
  else if (path.includes('/hr/salary-calculation')) activeTab = 'salary-calculation'
  else if (path.includes('/hr/salary')) activeTab = 'salary'

  const handleTabClick = (key) => {
    switch (key) {
      case 'dashboard': navigate('/hr'); break
      case 'employees': navigate('/hr/employees'); break
      case 'attendance': navigate('/hr/attendance'); break
      case 'attendance-report': navigate('/hr/attendance-report'); break;
      case 'leaves': navigate('/hr/leaves'); break
      case 'leave-report': navigate('/hr/leave-report'); break
      case 'salary-calculation': navigate('/hr/salary-calculation'); break
      case 'salary': navigate('/hr/salary'); break
    }
  }

  const handleBranchChange = (branchId) => {
    const branch = branches?.find(b => b.id === branchId) || null
    setSelectedBranch(branch)
  }

  const handleFinancialYearChange = (fyId) => {
    const fy = financialYears?.find(f => f.id === fyId) || null
    setSelectedFinancialYear(fy)
  }

  return (
    <Layout style={{ background: 'transparent', fontFamily: fontBody }}>
      <Header
        style={{
          background: headerBg,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${borderColor}`,
          height: 64,                         // fixed height prevents content shifting
          lineHeight: '64px',
        }}
      >
        <Space size={16} align="center" wrap>
          <Menu
            mode="horizontal"
            selectedKeys={[activeTab]}
            onClick={({ key }) => handleTabClick(key)}
            style={{
              borderBottom: 'none',
              fontSize: 14,
              fontFamily: fontBody,
              backgroundColor: 'transparent',
              lineHeight: '64px',
            }}
            theme={darkMode ? 'dark' : 'light'}
            overflowedIndicator={<EllipsisOutlined />}
            items={[
              { key: 'dashboard', icon: <DashboardOutlined />, label: 'Overview' },
              { key: 'employees', icon: <TeamOutlined />, label: 'Employees' },
              { key: 'attendance', icon: <CalendarOutlined />, label: 'Attendance' },
              { key: 'attendance-report', icon: <FilePdfOutlined />, label: 'Attendance Report' },
              { key: 'leaves', icon: <CoffeeOutlined />, label: 'Leaves' },
              { key: 'leave-report', icon: <FilePdfOutlined />, label: 'Leave Report' },
              { key: 'salary-calculation', icon: <CalculatorOutlined />, label: 'Salary Calc' },
              { key: 'salary', icon: <DollarOutlined />, label: 'Salary' },
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
          onClick={() => navigate('/hr/employees/new')}
          style={{
            backgroundColor: primaryColor,
            borderColor: primaryColor,
            fontFamily: fontBody,
            flexShrink: 0,
          }}
        >
          Add Employee
        </Button>
      </Header>
      <Content
        style={{
          padding: '24px',                     // ample space around content
          backgroundColor: darkMode ? '#141414' : '#f5f5f5',
          minHeight: 'calc(100vh - 64px)',     // fills remaining viewport
        }}
      >
        <Outlet context={{
          selectedBranch,
          setSelectedBranch: handleBranchChange,
          selectedFinancialYear,
          setSelectedFinancialYear: handleFinancialYearChange,
        }} />
      </Content>
    </Layout>
  )
}

export default HRPortal