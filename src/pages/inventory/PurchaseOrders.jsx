// src/pages/inventory/PurchaseOrders.jsx
import { Table, Card, Button, Typography, Tag } from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import dayjs from 'dayjs'

const { Title } = Typography

const PurchaseOrders = () => {
  const navigate = useNavigate()
  const { theme, darkMode } = useTheme()
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'

  const { data: orders, isLoading } = useQuery({
    queryKey: ['purchase-orders', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('organization_id', org.id)
        .order('order_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!org?.id,
  })

  const columns = [
    { title: 'PO Number', dataIndex: 'po_number' },
    { title: 'Vendor', dataIndex: 'vendor' },
    { title: 'Order Date', dataIndex: 'order_date', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Expected Date', dataIndex: 'expected_date', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Total', dataIndex: 'total_amount', render: (v) => `₹${(v || 0).toFixed(2)}` },
    {
      title: 'Status', dataIndex: 'status',
      render: (s) => {
        const color = s === 'Draft' ? 'default' : s === 'Approved' ? 'blue' : s === 'Received' ? 'green' : 'red'
        return <Tag color={color}>{s}</Tag>
      }
    },
  ]

  return (
    <div style={{ fontFamily: fontBody, padding: 8 }}>
      <Card
        bordered={false}   // ✅ fixed from variant="borderless"
        style={{ backgroundColor: cardBg, borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
        title={<Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>Purchase Orders</Title>}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/inventory/purchase-orders/new')}
          >
            New Order
          </Button>
        }
      >
        <Table dataSource={orders} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  )
}

export default PurchaseOrders