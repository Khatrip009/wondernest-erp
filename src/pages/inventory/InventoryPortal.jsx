// src/pages/inventory/InventoryPortal.jsx
import { Layout, Menu, Space } from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  SwapOutlined,
  WalletOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  FallOutlined
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import BranchSelector from '../../components/BranchSelector'
import FinancialYearSelector from '../../components/FinancialYearSelector'

const { Header, Content } = Layout

const InventoryPortal = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()
  const { org, branches, financialYears } = useOrganization()

  const outletContext = useOutletContext() || {}
  const {
    selectedBranch,
    setSelectedBranch,
    selectedFinancialYear,
    setSelectedFinancialYear,
  } = outletContext

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'

  const path = location.pathname

  // Determine active tab based on current path
  let activeTab = 'dashboard'
  if (path.includes('/inventory/items')) activeTab = 'items'
  else if (path.includes('/inventory/purchase-orders')) activeTab = 'purchase-orders'
  else if (path.includes('/inventory/purchase-invoices')) activeTab = 'purchase-invoices'
  else if (path.includes('/inventory/stock')) activeTab = 'stock'
  else if (path.includes('/inventory/transactions')) activeTab = 'transactions'
  else if (path.includes('/inventory/vendor-payments')) activeTab = 'vendor-payments'

  const handleTabClick = (key) => {
    switch (key) {
      case 'dashboard': navigate('/inventory'); break
      case 'items': navigate('/inventory/items'); break
      case 'transfer': navigate('/inventory/transfer'); break;
      case 'vendors': navigate('/inventory/vendors'); break;
      case 'purchase-orders': navigate('/inventory/purchase-orders'); break
      case 'purchase-invoices': navigate('/inventory/purchase-invoices'); break
      case 'stock': navigate('/inventory/stock'); break
      case 'transactions': navigate('/inventory/transactions'); break
      case 'vendor-payments': navigate('/inventory/vendor-payments'); break
      case 'issue': navigate('/inventory/issue'); break;
      default: break
    }
  }

  // Convert raw IDs from selectors back to full objects for context
  const handleBranchChange = (branchId) => {
    const branch = branches?.find(b => b.id === branchId) || null
    setSelectedBranch?.(branch)
  }

  const handleFYChange = (fyId) => {
    const fy = financialYears?.find(f => f.id === fyId) || null
    setSelectedFinancialYear?.(fy)
  }

  return (
    <Layout style={{ background: 'transparent', fontFamily: fontBody }}>
      <Header style={{
        background: '#fff', padding: '0 12px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0', height: 48, gap: 8,
      }}>
        <Space size={0} align="center" wrap>
          <Menu
            mode="horizontal"
            selectedKeys={[activeTab]}
            onClick={({ key }) => handleTabClick(key)}
            style={{ borderBottom: 'none', fontSize: 14, fontFamily: fontBody }}
            items={[
              { key: 'dashboard', icon: <DashboardOutlined />, label: 'Overview' },
              { key: 'vendors', icon: <TeamOutlined />, label: 'Vendors' },
              { key: 'items', icon: <UnorderedListOutlined />, label: 'Items' },
              { key: 'transfer', icon: <SwapOutlined />, label: 'Transfer' },
              { key: 'issue', icon: <FallOutlined />, label: 'Issue Item' },
              { key: 'purchase-orders', icon: <ShoppingCartOutlined />, label: 'Purchase Orders' },
              { key: 'purchase-invoices', icon: <FileTextOutlined />, label: 'Purchase Invoices' },
              { key: 'stock', icon: <AppstoreOutlined />, label: 'Stock' },
              { key: 'transactions', icon: <SwapOutlined />, label: 'Transactions' },
              { key: 'vendor-payments', icon: <WalletOutlined />, label: 'Vendor Payments' },
            ]}
          />
          <BranchSelector
            value={selectedBranch?.id}
            onChange={handleBranchChange}
            style={{ minWidth: 120 }}
          />
          <FinancialYearSelector
            value={selectedFinancialYear?.id}
            onChange={handleFYChange}
            style={{ minWidth: 120 }}
          />
        </Space>
      </Header>
      <Content style={{ padding: '12px' }}>
        <Outlet context={{
          selectedBranch,
          setSelectedBranch: handleBranchChange,
          selectedFinancialYear,
          setSelectedFinancialYear: handleFYChange,
        }} />
      </Content>
    </Layout>
  )
}

export default InventoryPortal