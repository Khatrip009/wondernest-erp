// src/pages/inventory/InventoryDashboard.jsx
import { Row, Col, Card, Statistic, Typography, Spin, Skeleton } from 'antd'
import { ShoppingCartOutlined, FileTextOutlined, AppstoreOutlined, SwapOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'

const { Title } = Typography

const InventoryDashboard = () => {
  const { theme, darkMode } = useTheme()
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const { data: stats, isLoading } = useQuery({
    queryKey: ['inventory-dashboard', org?.id],
    queryFn: async () => {
      if (!org?.id) return null

      // Use limit 1 to get a row and test access
      const { data: items } = await supabase.from('inventory_items').select('id').eq('organization_id', org.id).eq('is_active', true).limit(1000)
      const itemCount = items?.length || 0

      const { data: orders } = await supabase.from('purchase_orders').select('id').eq('organization_id', org.id).limit(1000)
      const poCount = orders?.length || 0

      const { data: invoices } = await supabase.from('purchase_invoices').select('id').eq('organization_id', org.id).limit(1000)
      const invoiceCount = invoices?.length || 0

      // For transactions, limit to 1000 across branches
      const { data: branches } = await supabase.from('branches').select('id').eq('organization_id', org.id)
      const branchIds = (branches || []).map(b => b.id)
      let transCount = 0
      if (branchIds.length > 0) {
        const { data: trans } = await supabase.from('inventory_transactions').select('id').in('branch_id', branchIds).limit(1000)
        transCount = trans?.length || 0
      }

      return {
        totalItems: itemCount,
        totalOrders: poCount,
        totalInvoices: invoiceCount,
        totalTransactions: transCount,
      }
    },
    enabled: !!org?.id,
  })

  return (
    <div style={{ fontFamily: fontBody, padding: 8 }}>
      <Title level={3} style={{ color: primaryColor, fontFamily: fontHeading }}>Inventory Overview</Title>
      {isLoading ? <Skeleton active /> : (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
              <Statistic title={<span style={{ color: textColor }}>Total Items</span>} value={stats?.totalItems} prefix={<AppstoreOutlined />} valueStyle={{ color: primaryColor }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
              <Statistic title={<span style={{ color: textColor }}>Purchase Orders</span>} value={stats?.totalOrders} prefix={<ShoppingCartOutlined />} valueStyle={{ color: primaryColor }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
              <Statistic title={<span style={{ color: textColor }}>Purchase Invoices</span>} value={stats?.totalInvoices} prefix={<FileTextOutlined />} valueStyle={{ color: primaryColor }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
              <Statistic title={<span style={{ color: textColor }}>Transactions</span>} value={stats?.totalTransactions} prefix={<SwapOutlined />} valueStyle={{ color: primaryColor }} />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}

export default InventoryDashboard